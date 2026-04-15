import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ScenarioAssignment, AssignmentStatus } from '../subjects/entities/scenario-assignment.entity';
import { ManagementScenario } from '../scenarios/entities/management-scenario.entity';
import { Event, EventResult } from '../events/entities/event.entity';
import { EventsService } from '../events/events.service';
import { RequestsService } from '../requests/requests.service';

/**
 * Overdue check-in scheduler.
 *
 * Runs daily. For each ACTIVE scenario assignment, finds the subject's last
 * successful CHECKIN event, counts the days missed (excluding APPROVED
 * POSTPONE days), and — if the miss exceeds the scenario's expected interval
 * plus grace period — creates a CHECKIN_OVERDUE event. If the miss is at
 * least twice the threshold, a SEVERE_OVERDUE event is created instead.
 *
 * The event, once created, is picked up by EventProcessorService which
 * matches it against the default alert rules and generates the actual Alert.
 */
@Injectable()
export class OverdueCheckinScheduler {
  private readonly logger = new Logger(OverdueCheckinScheduler.name);

  constructor(
    @InjectRepository(ScenarioAssignment)
    private readonly assignmentRepo: Repository<ScenarioAssignment>,
    @InjectRepository(ManagementScenario)
    private readonly scenarioRepo: Repository<ManagementScenario>,
    @InjectRepository(Event)
    private readonly eventRepo: Repository<Event>,
    private readonly eventsService: EventsService,
    private readonly requestsService: RequestsService,
  ) {}

  /**
   * Interval in days for each supported check-in frequency. Values not in
   * this map are treated as daily (safest default — surfaces problems sooner).
   */
  private intervalDaysFor(frequency: string): number {
    switch ((frequency || '').toUpperCase()) {
      case 'DAILY':
        return 1;
      case 'WEEKLY':
        return 7;
      case 'BIWEEKLY':
      case 'BI_WEEKLY':
        return 14;
      case 'MONTHLY':
        return 30;
      default:
        return 1;
    }
  }

  /** YYYY-MM-DD in local server time. */
  private isoDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  /**
   * Runs every day at 01:00 server time. Uses a cron expression instead of
   * EVERY_DAY_AT_MIDNIGHT so the job sits after the previous day's last
   * possible check-in window.
   */
  @Cron('0 0 1 * * *', { name: 'overdue-checkin-daily' })
  async handleDailyRun(): Promise<void> {
    this.logger.log('Daily overdue check-in scan starting...');
    const summary = await this.runOnce();
    this.logger.log(
      `Daily overdue scan finished: scanned=${summary.scanned} ` +
      `overdue=${summary.overdueCreated} severe=${summary.severeCreated} ` +
      `skippedDedup=${summary.skippedDedup}`,
    );
  }

  /**
   * Scan every ACTIVE scenario assignment once and create overdue events
   * where appropriate. Returns summary counts — also used by the standalone
   * test runner script.
   */
  async runOnce(referenceDate: Date = new Date()): Promise<{
    scanned: number;
    overdueCreated: number;
    severeCreated: number;
    skippedDedup: number;
    details: Array<{
      subjectId: string;
      scenarioCode: string;
      missedDays: number;
      threshold: number;
      action: 'OVERDUE' | 'SEVERE' | 'OK' | 'DEDUP';
    }>;
  }> {
    const assignments = await this.assignmentRepo
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.scenario', 'sc')
      .leftJoinAndSelect('a.subject', 's')
      .where('a.status = :active', { active: AssignmentStatus.ACTIVE })
      .andWhere('s.deleted_at IS NULL')
      .getMany();

    let overdueCreated = 0;
    let severeCreated = 0;
    let skippedDedup = 0;
    const details: Array<{
      subjectId: string;
      scenarioCode: string;
      missedDays: number;
      threshold: number;
      action: 'OVERDUE' | 'SEVERE' | 'OK' | 'DEDUP';
    }> = [];

    for (const a of assignments) {
      if (!a.scenario || !a.subject) continue;

      const scenario = a.scenario;
      const intervalDays = this.intervalDaysFor(scenario.checkinFrequency);
      const grace = scenario.gracePeriodDays ?? 0;
      const threshold = intervalDays + grace;
      const severeThreshold = threshold * 2;

      // Find most recent successful CHECKIN event
      const lastCheckin = await this.eventRepo
        .createQueryBuilder('e')
        .where('e.subjectId = :sid', { sid: a.subjectId })
        .andWhere('e.type = :type', { type: 'CHECKIN' })
        .andWhere('e.result = :result', { result: EventResult.SUCCESS })
        .orderBy('e.createdAt', 'DESC')
        .getOne();

      // Anchor: last check-in, or assignment start if no check-ins yet
      const anchor = lastCheckin?.createdAt ?? a.assignedAt;
      if (!anchor) continue;

      // Raw days since anchor (ignoring time of day)
      const anchorDay = new Date(this.isoDate(anchor));
      const today = new Date(this.isoDate(referenceDate));
      const rawDays = Math.floor(
        (today.getTime() - anchorDay.getTime()) / (24 * 60 * 60 * 1000),
      );

      // Subtract APPROVED POSTPONE days that fall in [anchor+1, today]
      let missedDays = rawDays;
      if (rawDays > 0) {
        const postponed = await this.requestsService.getApprovedPostponeDates(
          a.subjectId,
          new Date(anchorDay.getTime() + 24 * 60 * 60 * 1000),
          today,
        );
        missedDays = rawDays - postponed.size;
      }

      if (missedDays < threshold) {
        details.push({
          subjectId: a.subjectId,
          scenarioCode: scenario.code,
          missedDays,
          threshold,
          action: 'OK',
        });
        continue;
      }

      const severe = missedDays >= severeThreshold;
      const eventType = severe ? 'SEVERE_OVERDUE' : 'CHECKIN_OVERDUE';

      // Dedupe: skip if an overdue event of the same type already exists today for this subject
      const alreadyToday = await this.eventRepo
        .createQueryBuilder('e')
        .where('e.subjectId = :sid', { sid: a.subjectId })
        .andWhere('e.type = :type', { type: eventType })
        .andWhere(`DATE(e.createdAt AT TIME ZONE 'UTC') = :today`, {
          today: this.isoDate(referenceDate),
        })
        .getCount();

      if (alreadyToday > 0) {
        skippedDedup++;
        details.push({
          subjectId: a.subjectId,
          scenarioCode: scenario.code,
          missedDays,
          threshold,
          action: 'DEDUP',
        });
        continue;
      }

      await this.eventsService.createEvent({
        type: eventType,
        subjectId: a.subjectId,
        scenarioId: scenario.id,
        result: EventResult.WARNING,
        extraData: {
          missed_days: missedDays,
          threshold,
          interval_days: intervalDays,
          grace_period_days: grace,
          last_checkin_at: lastCheckin?.createdAt ?? null,
          scheduler: 'OverdueCheckinScheduler',
          reference_date: this.isoDate(referenceDate),
        },
      });

      if (severe) severeCreated++;
      else overdueCreated++;

      details.push({
        subjectId: a.subjectId,
        scenarioCode: scenario.code,
        missedDays,
        threshold,
        action: severe ? 'SEVERE' : 'OVERDUE',
      });
    }

    return {
      scanned: assignments.length,
      overdueCreated,
      severeCreated,
      skippedDedup,
      details,
    };
  }
}
