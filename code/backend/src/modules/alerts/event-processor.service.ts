import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, SelectQueryBuilder } from 'typeorm';
import { Event } from '../events/entities/event.entity';
import {
  Alert,
  AlertLevel,
  AlertStatus,
} from './entities/alert.entity';
import { AlertRule } from './entities/alert-rule.entity';
import { EscalationRule } from './entities/escalation-rule.entity';
import {
  Case,
  CaseSource,
  CaseStatus,
  EscalationType,
} from '../cases/entities/case.entity';

@Injectable()
export class EventProcessorService {
  private readonly logger = new Logger(EventProcessorService.name);
  private alertCounter = 0;

  constructor(
    @InjectRepository(Alert)
    private readonly alertRepo: Repository<Alert>,
    @InjectRepository(AlertRule)
    private readonly alertRuleRepo: Repository<AlertRule>,
    @InjectRepository(EscalationRule)
    private readonly escalationRuleRepo: Repository<EscalationRule>,
    @InjectRepository(Case)
    private readonly caseRepo: Repository<Case>,
    @InjectRepository(Event)
    private readonly eventRepo: Repository<Event>,
    private readonly dataSource: DataSource,
  ) {}

  // =========================================================================
  // Public entry point — called right after an Event is saved
  // =========================================================================

  async processEvent(event: Event): Promise<void> {
    try {
      // 1. Find active scenario assignments for this subject
      const assignments: { scenario_id: string }[] =
        await this.dataSource.query(
          `SELECT sa.scenario_id
           FROM scenario_assignments sa
           WHERE sa.subject_id = $1
             AND sa.status = 'ACTIVE'`,
          [event.subjectId],
        );

      if (!assignments.length) {
        this.logger.debug(
          `No active scenarios for subject ${event.subjectId}, skipping rule evaluation`,
        );
        return;
      }

      const scenarioIds = assignments.map((a) => a.scenario_id);

      // 2. Resolve ALL applicable event types from the event data.
      //    A single check-in can have multiple violations (NFC fail + outside geofence),
      //    but event.type only records the primary failure. We derive secondary types
      //    from the event's data fields so custom rules match correctly.
      const eventTypes = this.resolveMatchingEventTypes(event);

      this.logger.debug(
        `Event ${event.code}: primary type="${event.type}", resolved types=[${eventTypes.join(', ')}]`,
      );

      // 3. Find active alert rules whose eventType matches ANY resolved type
      const rules = await this.alertRuleRepo
        .createQueryBuilder('rule')
        .where('rule.scenarioId IN (:...scenarioIds)', { scenarioIds })
        .andWhere('rule.eventType IN (:...eventTypes)', { eventTypes })
        .andWhere('rule.isActive = true')
        .getMany();

      if (!rules.length) {
        this.logger.debug(
          `No active alert rules match types [${eventTypes.join(', ')}] for subject ${event.subjectId}`,
        );
        return;
      }

      // 4. Evaluate each matching rule
      for (const rule of rules) {
        await this.evaluateAlertRule(event, rule);
      }
    } catch (error: any) {
      // Never let rule evaluation crash the caller
      this.logger.error(
        `Error processing event ${event.id}: ${error.message}`,
        error.stack,
      );
    }
  }

  // =========================================================================
  // Resolve all violation types present in the event data
  // =========================================================================

  /**
   * A single event may carry evidence of multiple violations even though
   * event.type only records the "primary" one.  This method inspects the
   * event's data fields and returns every event type that should be
   * evaluated against alert rules.
   *
   * Also handles the naming mismatch between frontend rule event_type values
   * (e.g. GEOFENCE_VIOLATION, CHECK_IN, NFC_FAIL) and backend event type
   * values (e.g. GEOFENCE_EXIT, CHECKIN, NFC_MISMATCH) by including both
   * aliases so rules created in the UI always match their corresponding events.
   */
  private resolveMatchingEventTypes(event: Event): string[] {
    const types = new Set<string>();

    // Always include the primary event type
    types.add(event.type);

    // Aliases: frontend uses different names than what the backend writes to events
    const ALIASES: Record<string, string> = {
      CHECKIN: 'CHECK_IN',          // frontend: CHECK_IN, backend: CHECKIN
      GEOFENCE_EXIT: 'GEOFENCE_VIOLATION', // frontend: GEOFENCE_VIOLATION, backend: GEOFENCE_EXIT
      NFC_MISMATCH: 'NFC_FAIL',     // frontend: NFC_FAIL also covers NFC_MISMATCH
    };
    if (ALIASES[event.type]) {
      types.add(ALIASES[event.type]);
    }

    // Geofence violation — inGeofence is explicitly false
    // (covers compound failures where geofence exit isn't the primary event type)
    if (event.inGeofence === false) {
      types.add('GEOFENCE_EXIT');
      types.add('GEOFENCE_VIOLATION');
    }

    // NFC / CCCD mismatch
    if (event.nfcVerified === false || event.nfcCccdMatch === false) {
      types.add('NFC_MISMATCH');
      types.add('NFC_FAIL');
    }

    // Face mismatch — faceMatchScore present but below typical threshold
    if (event.faceMatchScore !== null && Number(event.faceMatchScore) < 0.45) {
      types.add('FACE_MISMATCH');
    }

    return Array.from(types);
  }

  // =========================================================================
  // Alert Rule evaluation
  // =========================================================================

  private async evaluateAlertRule(
    event: Event,
    rule: AlertRule,
  ): Promise<void> {
    const alertType = this.deriveAlertType(rule);

    // De-duplicate: skip if there's already an OPEN or ACKNOWLEDGED alert
    // of the same type for the same subject + scenario
    const existingAlert = await this.alertRepo
      .createQueryBuilder('alert')
      .where('alert.subjectId = :subjectId', { subjectId: event.subjectId })
      .andWhere('alert.scenarioId = :scenarioId', {
        scenarioId: rule.scenarioId,
      })
      .andWhere('alert.type = :type', { type: alertType })
      .andWhere('alert.status IN (:...statuses)', {
        statuses: [AlertStatus.OPEN, AlertStatus.ACKNOWLEDGED],
      })
      .getOne();

    if (existingAlert) {
      this.logger.debug(
        `Alert already exists (${existingAlert.code}) for subject=${event.subjectId} type=${alertType}, skipping`,
      );
      return;
    }

    // Count matching events using data-aware conditions (not just event.type)
    const eventCount = await this.countEventsForRule(
      event.subjectId,
      rule.eventType,
      rule.conditionWindowDays,
    );

    // Evaluate condition
    if (
      !this.evaluateCondition(
        eventCount,
        rule.conditionOperator,
        rule.conditionValue,
      )
    ) {
      this.logger.debug(
        `Condition not met for rule ${rule.code}: count(${eventCount}) ${rule.conditionOperator} ${rule.conditionValue} → false`,
      );
      return;
    }

    // ── Condition met → create Alert ──
    const alert = await this.createAlert(event, rule, alertType);
    this.logger.log(
      `Alert created: ${alert.code} type=${alert.type} level=${alert.level} subject=${event.subjectId} rule=${rule.code}`,
    );

    // 4. Check escalation rules for possible auto-case creation
    await this.evaluateEscalationRules(alert, rule.scenarioId);
  }

  // =========================================================================
  // Escalation Rule evaluation (alert → case)
  // =========================================================================

  private async evaluateEscalationRules(
    alert: Alert,
    scenarioId: string,
  ): Promise<void> {
    const rules = await this.escalationRuleRepo
      .createQueryBuilder('rule')
      .where('rule.scenarioId = :scenarioId', { scenarioId })
      .andWhere('rule.alertType = :alertType', { alertType: alert.type })
      .andWhere('rule.isActive = true')
      .getMany();

    for (const rule of rules) {
      await this.evaluateSingleEscalation(alert, rule);
    }
  }

  private async evaluateSingleEscalation(
    alert: Alert,
    rule: EscalationRule,
  ): Promise<void> {
    // Check alert level filter — alert must be at or above the required level
    if (rule.alertLevelFilter) {
      const levelOrder = [
        AlertLevel.THAP,
        AlertLevel.TRUNG_BINH,
        AlertLevel.CAO,
        AlertLevel.KHAN_CAP,
      ];
      const alertIdx = levelOrder.indexOf(alert.level);
      const filterIdx = levelOrder.indexOf(rule.alertLevelFilter);
      if (alertIdx < filterIdx) {
        this.logger.debug(
          `Escalation skipped: alert level ${alert.level} < filter ${rule.alertLevelFilter} for rule ${rule.code}`,
        );
        return;
      }
    }

    // Count matching alerts within the escalation window
    const qb = this.alertRepo
      .createQueryBuilder('a')
      .where('a.subjectId = :subjectId', { subjectId: alert.subjectId })
      .andWhere('a.scenarioId = :scenarioId', { scenarioId: rule.scenarioId })
      .andWhere('a.type = :type', { type: alert.type });

    if (rule.alertLevelFilter) {
      const levelOrder = [
        AlertLevel.THAP,
        AlertLevel.TRUNG_BINH,
        AlertLevel.CAO,
        AlertLevel.KHAN_CAP,
      ];
      const filterIdx = levelOrder.indexOf(rule.alertLevelFilter);
      const eligibleLevels = levelOrder.slice(filterIdx);
      qb.andWhere('a.level IN (:...levels)', { levels: eligibleLevels });
    }

    if (rule.conditionWindowDays) {
      const windowStart = new Date();
      windowStart.setDate(windowStart.getDate() - rule.conditionWindowDays);
      qb.andWhere('a.createdAt >= :windowStart', { windowStart });
    }

    const alertCount = await qb.getCount();

    if (
      !this.evaluateCondition(
        alertCount,
        rule.conditionOperator,
        rule.conditionValue,
      )
    ) {
      this.logger.debug(
        `Escalation condition not met for rule ${rule.code}: count(${alertCount}) ${rule.conditionOperator} ${rule.conditionValue} → false`,
      );
      return;
    }

    // De-duplicate: skip if there's already an open case for this subject
    // from the same escalation rule
    const existingCase = await this.caseRepo
      .createQueryBuilder('c')
      .where('c.subjectId = :subjectId', { subjectId: alert.subjectId })
      .andWhere('c.status = :status', { status: CaseStatus.OPEN })
      .andWhere('c.escalationRuleName = :ruleName', {
        ruleName: rule.name,
      })
      .getOne();

    if (existingCase) {
      this.logger.debug(
        `Case already exists (${existingCase.code}) for subject=${alert.subjectId} rule=${rule.name}, skipping`,
      );
      return;
    }

    // ── Escalation condition met → auto-create Case ──
    const caseCode = `CA-${Date.now().toString(36).toUpperCase()}`;
    const description =
      rule.caseDescriptionTpl ??
      `Tự động tạo vụ việc từ cảnh báo ${alert.code}`;

    const newCase = this.caseRepo.create({
      code: caseCode,
      subjectId: alert.subjectId,
      severity: rule.caseSeverity,
      source: CaseSource.AUTO,
      description,
      escalatedFromAlertId: alert.id,
      escalationType: EscalationType.AUTO,
      escalationRuleName: rule.name,
      linkedEventIds: [alert.triggerEventId],
      createdByName: 'HỆ THỐNG',
    });

    const savedCase = await this.caseRepo.save(newCase);

    // Update alert → ESCALATED
    alert.status = AlertStatus.ESCALATED;
    alert.escalatedAt = new Date();
    alert.caseId = savedCase.id;
    await this.alertRepo.save(alert);

    this.logger.log(
      `Case auto-created: ${savedCase.code} severity=${savedCase.severity} from alert ${alert.code} by escalation rule ${rule.name}`,
    );
  }

  // =========================================================================
  // Helpers
  // =========================================================================

  /**
   * Count events matching a rule's event type using DATA-AWARE conditions.
   *
   * Problem: a check-in that fails NFC AND is outside geofence creates a
   * single event with type='NFC_MISMATCH' and inGeofence=false. If we only
   * count by event.type, the GEOFENCE_EXIT rule would miss this event.
   *
   * Solution: for specific event types, also count events that carry the
   * matching data signal regardless of the primary event type.
   */
  private async countEventsForRule(
    subjectId: string,
    ruleEventType: string,
    windowDays: number | null,
  ): Promise<number> {
    const qb = this.eventRepo
      .createQueryBuilder('e')
      .where('e.subjectId = :subjectId', { subjectId });

    this.applyEventTypeCondition(qb, ruleEventType);

    if (windowDays) {
      const windowStart = new Date();
      windowStart.setDate(windowStart.getDate() - windowDays);
      qb.andWhere('e.createdAt >= :windowStart', { windowStart });
    }

    return qb.getCount();
  }

  /**
   * Apply data-aware WHERE conditions based on the rule's event type.
   * Handles both frontend rule names and backend event type names,
   * and for compound events also matches on the underlying data field.
   */
  private applyEventTypeCondition(
    qb: SelectQueryBuilder<Event>,
    ruleEventType: string,
  ): void {
    switch (ruleEventType) {
      // Geofence: frontend uses GEOFENCE_VIOLATION, backend writes GEOFENCE_EXIT
      case 'GEOFENCE_EXIT':
      case 'GEOFENCE_VIOLATION':
        qb.andWhere(
          "(e.type IN ('GEOFENCE_EXIT','GEOFENCE_VIOLATION') OR e.inGeofence = false)",
        );
        break;

      // NFC fail: frontend uses NFC_FAIL or NFC_MISMATCH, backend writes NFC_MISMATCH
      case 'NFC_MISMATCH':
      case 'NFC_FAIL':
        qb.andWhere(
          "(e.type IN ('NFC_MISMATCH','NFC_FAIL') OR e.nfcCccdMatch = false)",
        );
        break;

      // Face mismatch: same name, but also catch by score
      case 'FACE_MISMATCH':
        qb.andWhere(
          "(e.type = 'FACE_MISMATCH' OR (e.faceMatchScore IS NOT NULL AND e.faceMatchScore < 0.45))",
        );
        break;

      // Checkin: frontend uses CHECK_IN, backend writes CHECKIN
      case 'CHECKIN':
      case 'CHECK_IN':
        qb.andWhere("e.type IN ('CHECKIN','CHECK_IN')");
        break;

      default:
        qb.andWhere('e.type = :type', { type: ruleEventType });
        break;
    }
  }

  private evaluateCondition(
    actual: number,
    operator: string,
    expected: number,
  ): boolean {
    switch (operator) {
      case '>=':
        return actual >= expected;
      case '>':
        return actual > expected;
      case '==':
      case '=':
        return actual === expected;
      case '<=':
        return actual <= expected;
      case '<':
        return actual < expected;
      case '!=':
        return actual !== expected;
      default:
        return actual >= expected;
    }
  }

  /**
   * Map event types to alert types.
   * Most map 1:1, but some get a more descriptive name.
   */
  private deriveAlertType(rule: AlertRule): string {
    const mapping: Record<string, string> = {
      FACE_MISMATCH: 'FACE_MISMATCH_STREAK',
      NFC_MISMATCH: 'NFC_CCCD_MISMATCH',
    };
    return mapping[rule.eventType] ?? rule.eventType;
  }

  private generateAlertCode(): string {
    const now = new Date();
    const date = now.toISOString().slice(0, 10).replace(/-/g, '');
    const seq = String(++this.alertCounter).padStart(4, '0');
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `ALT-${date}-${seq}${rand}`;
  }

  private async createAlert(
    event: Event,
    rule: AlertRule,
    alertType: string,
  ): Promise<Alert> {
    const alert = this.alertRepo.create({
      code: this.generateAlertCode(),
      type: alertType,
      level: rule.alertLevel,
      status: AlertStatus.OPEN,
      source: rule.source,
      subjectId: event.subjectId,
      triggerEventId: event.id,
      alertRuleId: rule.id,
      scenarioId: rule.scenarioId,
    });

    return this.alertRepo.save(alert);
  }
}
