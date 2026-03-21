import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Event, EventResult } from '../events/entities/event.entity';
import {
  Alert,
  AlertLevel,
  AlertStatus,
  AlertRuleSource,
} from '../alerts/entities/alert.entity';
import {
  Case,
  CaseSource,
  CaseStatus,
  EscalationType,
} from '../cases/entities/case.entity';
import { CaseNote } from '../cases/entities/case-note.entity';
import { Subject, SubjectLifecycle, SubjectStatus, Gender } from '../subjects/entities/subject.entity';
import { Area, AreaLevel } from '../areas/entities/area.entity';
import { User, UserRole, DataScopeLevel, UserStatus } from '../users/entities/user.entity';
import { ManagementScenario, ScenarioStatus } from '../scenarios/entities/management-scenario.entity';
import { ScenarioAssignment, AssignmentStatus } from '../subjects/entities/scenario-assignment.entity';
import { Geofence, GeofenceType } from '../geofences/entities/geofence.entity';
import { AlertRule } from '../alerts/entities/alert-rule.entity';
import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';

/* ───── helpers ───── */

function randomFrom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomFloat(min: number, max: number, decimals = 7): number {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(randomInt(6, 22), randomInt(0, 59), randomInt(0, 59), 0);
  return d;
}

function hashCccd(cccd: string): string {
  return crypto.createHash('sha256').update(cccd).digest('hex');
}

function encryptCccd(cccd: string): string {
  // Simple base64 "encryption" for seed data (real app uses AES)
  return Buffer.from(cccd).toString('base64');
}

function uniqueCode(prefix: string): string {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${randomInt(100, 999)}`;
}

/* ───── static data ───── */

// Bách Khoa area coordinates (around HUST campus)
const BACH_KHOA_LAT = 21.0045;
const BACH_KHOA_LNG = 105.8468;
const GPS_JITTER = 0.003; // ~300m

const SUBJECT_DATA = [
  {
    fullName: 'Nguyễn Văn Hùng',
    cccd: '001085012345',
    dob: '1985-03-15',
    gender: Gender.MALE,
    phone: '0912345678',
    address: 'Số 12, ngõ 68, Phố Trần Đại Nghĩa, Phường Bách Khoa, Quận Hai Bà Trưng, Hà Nội',
    ethnicity: 'Kinh',
  },
  {
    fullName: 'Trần Thị Mai',
    cccd: '001290056789',
    dob: '1990-07-22',
    gender: Gender.FEMALE,
    phone: '0987654321',
    address: 'Số 5, ngõ 42, Phố Tạ Quang Bửu, Phường Bách Khoa, Quận Hai Bà Trưng, Hà Nội',
    ethnicity: 'Kinh',
  },
  {
    fullName: 'Lê Đức Anh',
    cccd: '001088098765',
    dob: '1988-11-03',
    gender: Gender.MALE,
    phone: '0978123456',
    address: 'Số 8, ngõ 15, Phố Lê Thanh Nghị, Phường Bách Khoa, Quận Hai Bà Trưng, Hà Nội',
    ethnicity: 'Kinh',
  },
  {
    fullName: 'Phạm Thị Hương',
    cccd: '001292111222',
    dob: '1992-05-18',
    gender: Gender.FEMALE,
    phone: '0965432109',
    address: 'Số 22, ngõ 10, Phố Trần Đại Nghĩa, Phường Bách Khoa, Quận Hai Bà Trưng, Hà Nội',
    ethnicity: 'Kinh',
  },
  {
    fullName: 'Hoàng Minh Tuấn',
    cccd: '001080333444',
    dob: '1980-01-25',
    gender: Gender.MALE,
    phone: '0932111222',
    address: 'Số 3, ngõ 25, Phố Tạ Quang Bửu, Phường Bách Khoa, Quận Hai Bà Trưng, Hà Nội',
    ethnicity: 'Kinh',
  },
  {
    fullName: 'Vũ Thị Lan',
    cccd: '001295555666',
    dob: '1995-09-10',
    gender: Gender.FEMALE,
    phone: '0943222333',
    address: 'Số 17, ngõ 32, Phố Lê Thanh Nghị, Phường Bách Khoa, Quận Hai Bà Trưng, Hà Nội',
    ethnicity: 'Kinh',
  },
];

const DEVICES = [
  { model: 'Samsung Galaxy A54', os: 'Android 14' },
  { model: 'Xiaomi Redmi Note 12', os: 'Android 13' },
  { model: 'OPPO Reno 8', os: 'Android 13' },
  { model: 'Vivo Y36', os: 'Android 13' },
  { model: 'Samsung Galaxy A34', os: 'Android 14' },
  { model: 'Realme C55', os: 'Android 13' },
];

const EVENT_TYPES = [
  'CHECK_IN',
  'FACE_MISMATCH',
  'NFC_FAIL',
  'CHECKIN_OVERDUE',
  'SEVERE_OVERDUE',
  'GEOFENCE_VIOLATION',
] as const;

const ALERT_RULE_NAMES = [
  'OVERDUE',
  'FACE_MISMATCH_STREAK',
  'NFC_CCCD_MISMATCH',
  'SEVERE_OVERDUE',
] as const;

/* ───── service ───── */

@Injectable()
export class SeedService {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Event) private readonly eventRepo: Repository<Event>,
    @InjectRepository(Alert) private readonly alertRepo: Repository<Alert>,
    @InjectRepository(Case) private readonly caseRepo: Repository<Case>,
    @InjectRepository(CaseNote) private readonly noteRepo: Repository<CaseNote>,
    @InjectRepository(Subject) private readonly subjectRepo: Repository<Subject>,
    @InjectRepository(Area) private readonly areaRepo: Repository<Area>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(ManagementScenario) private readonly scenarioRepo: Repository<ManagementScenario>,
    @InjectRepository(ScenarioAssignment) private readonly assignmentRepo: Repository<ScenarioAssignment>,
    @InjectRepository(Geofence) private readonly geofenceRepo: Repository<Geofence>,
    @InjectRepository(AlertRule) private readonly alertRuleRepo: Repository<AlertRule>,
  ) {}

  /* ═══════════ CLEAN ═══════════ */

  async cleanSeedData() {
    this.logger.log('Cleaning seed data in safe FK order...');

    // Use TRUNCATE CASCADE to handle circular FKs (alerts↔cases)
    await this.dataSource.query(
      `TRUNCATE TABLE "case_notes", "cases", "alerts", "alert_rules", "events", "scenario_assignments", "subject_families", "subject_legals", "subjects" CASCADE`,
    );
    this.logger.log('Truncated all seed tables');

    return { message: 'Cleaned: case_notes, cases, alerts, events, scenario_assignments, subjects' };
  }

  /* ═══════════ FULL SEED ═══════════ */

  async seedFull() {
    // Step 0: Clean existing pipeline data
    await this.cleanSeedData();

    const summary: Record<string, number> = {};

    // Step 1: Upsert areas
    const { province, district } = await this.upsertAreas();
    summary.areas = 2;

    // Step 2: Upsert geofence for Bách Khoa
    const geofence = await this.upsertGeofence(district.id);

    // Step 3: Find or create officer user
    const officer = await this.findOrCreateOfficer(district.id);
    summary.officer = 1;

    // Step 4: Upsert subjects
    const subjects = await this.upsertSubjects(district.id, officer.id);
    summary.subjects = subjects.length;

    // Step 5: Upsert scenario
    const scenario = await this.upsertScenario(officer.id, geofence.id);
    summary.scenarios = 1;

    // Step 6: Create scenario assignments
    const assignments = await this.createAssignments(subjects, scenario.id, officer.id);
    summary.assignments = assignments.length;

    // Step 6b: Seed alert rules for the scenario
    const alertRuleMap = await this.seedAlertRules(scenario.id);
    summary.alertRules = Object.keys(alertRuleMap).length;

    // Step 7: Generate events (40-60 across 30 days)
    const events = await this.generateEvents(subjects, scenario.id, officer.id);
    summary.events = events.length;

    // Step 8: Generate alerts from problematic events
    const alerts = await this.generateAlerts(events, scenario.id, alertRuleMap);
    summary.alerts = alerts.length;

    // Step 9: Generate cases + notes
    const { cases, notes } = await this.generateCases(alerts, subjects, officer, events);
    summary.cases = cases.length;
    summary.notes = notes;

    this.logger.log('Full seed completed: ' + JSON.stringify(summary));
    return { message: 'Seed hoàn tất', summary };
  }

  /* ───── Step 1: Areas ───── */

  private async upsertAreas() {
    let province = await this.areaRepo.findOne({ where: { code: 'HN' } });
    if (!province) {
      province = await this.areaRepo.save(
        this.areaRepo.create({
          code: 'HN',
          name: 'Thành phố Hà Nội',
          level: AreaLevel.PROVINCE,
          parentId: null,
        }),
      );
    }

    let district = await this.areaRepo.findOne({ where: { code: 'HBT' } });
    if (!district) {
      district = await this.areaRepo.save(
        this.areaRepo.create({
          code: 'HBT',
          name: 'Quận Hai Bà Trưng',
          level: AreaLevel.DISTRICT,
          parentId: province.id,
        }),
      );
    }

    return { province, district };
  }

  /* ───── Step 2: Geofence ───── */

  private async upsertGeofence(districtId: string) {
    let geofence = await this.geofenceRepo.findOne({ where: { code: 'GEO-BK' } });
    if (!geofence) {
      geofence = await this.geofenceRepo.save(
        this.geofenceRepo.create({
          code: 'GEO-BK',
          name: 'Khu vực Phường Bách Khoa',
          type: GeofenceType.CIRCLE,
          address: 'Phường Bách Khoa, Quận Hai Bà Trưng, Hà Nội',
          centerLat: BACH_KHOA_LAT,
          centerLng: BACH_KHOA_LNG,
          radius: 500,
          areaId: districtId,
          createdById: 'e0000000-0000-0000-0000-000000000001', // admin user, will update after officer created
        }),
      );
    }
    return geofence;
  }

  /* ───── Step 3: Officer ───── */

  private async findOrCreateOfficer(districtId: string) {
    let officer = await this.userRepo.findOne({
      where: { username: 'canbo_bachkhoa' },
    });
    if (!officer) {
      const hashedPassword = await bcrypt.hash('Test@123456', 10);
      officer = await this.userRepo.save(
        this.userRepo.create({
          username: 'canbo_bachkhoa',
          passwordHash: hashedPassword,
          fullName: 'Đặng Văn Minh',
          email: 'minh.dv@bachkhoa.gov.vn',
          phone: '0901234567',
          role: UserRole.CAN_BO_CO_SO,
          areaId: districtId,
          dataScopeLevel: DataScopeLevel.DISTRICT,
          status: UserStatus.ACTIVE,
        }),
      );
    }

    // Update geofence createdById if it was placeholder
    await this.geofenceRepo.update(
      { code: 'GEO-BK' },
      { createdById: officer.id },
    );

    return officer;
  }

  /* ───── Step 4: Subjects ───── */

  private async upsertSubjects(districtId: string, officerId: string) {
    const results: Subject[] = [];

    for (let i = 0; i < SUBJECT_DATA.length; i++) {
      const d = SUBJECT_DATA[i];
      const cccdHash = hashCccd(d.cccd);

      let subject = await this.subjectRepo.findOne({ where: { cccdHash } });
      if (!subject) {
        subject = await this.subjectRepo.save(
          this.subjectRepo.create({
            code: `HS-BK-${String(i + 1).padStart(3, '0')}`,
            fullName: d.fullName,
            cccdEncrypted: encryptCccd(d.cccd),
            cccdHash,
            dateOfBirth: new Date(d.dob),
            gender: d.gender,
            ethnicity: d.ethnicity,
            address: d.address,
            permanentAddress: d.address,
            phone: d.phone,
            areaId: districtId,
            status: SubjectStatus.ACTIVE,
            lifecycle: SubjectLifecycle.DANG_QUAN_LY,
            complianceRate: randomFloat(60, 98, 2),
            enrollmentDate: daysAgo(randomInt(45, 90)),
            createdById: officerId,
            notes: `Đối tượng quản lý tại Phường Bách Khoa, Quận Hai Bà Trưng.`,
          }),
        );
      }
      results.push(subject);
    }

    return results;
  }

  /* ───── Step 5: Scenario ───── */

  private async upsertScenario(officerId: string, geofenceId: string) {
    let scenario = await this.scenarioRepo.findOne({ where: { code: 'KB-BK-01' } });
    if (!scenario) {
      scenario = await this.scenarioRepo.save(
        this.scenarioRepo.create({
          code: 'KB-BK-01',
          name: 'Kịch bản giám sát Phường Bách Khoa',
          description:
            'Kịch bản giám sát tiêu chuẩn cho các đối tượng tại Phường Bách Khoa. Check-in 1 lần/ngày, cửa sổ 06:00-22:00, yêu cầu NFC + khuôn mặt.',
          status: ScenarioStatus.ACTIVE,
          version: 1,
          scope: 'DISTRICT',
          checkinFrequency: 'DAILY',
          checkinWindowStart: '06:00',
          checkinWindowEnd: '22:00',
          gracePeriodDays: 2,
          faceThreshold: 85,
          nfcRequired: true,
          fallbackAllowed: true,
          geofenceId,
          curfewStart: '22:00',
          curfewEnd: '06:00',
          travelApprovalRequired: true,
          travelThresholdDays: 3,
          autoEscalationConfig: {
            autoEscalateLevels: ['CAO', 'KHAN_CAP'],
            autoEscalateAfterMinutes: 60,
          },
          effectiveFrom: daysAgo(60),
          effectiveTo: null,
          createdById: officerId,
          approvedById: officerId,
          approvedAt: daysAgo(59),
        }),
      );
    }
    return scenario;
  }

  /* ───── Step 6: Assignments ───── */

  private async createAssignments(
    subjects: Subject[],
    scenarioId: string,
    officerId: string,
  ) {
    const results: ScenarioAssignment[] = [];

    for (const subject of subjects) {
      // Check for existing
      const existing = await this.assignmentRepo.findOne({
        where: { subjectId: subject.id, scenarioId },
      });
      if (existing) {
        results.push(existing);
        continue;
      }

      const assignment = await this.assignmentRepo.save(
        this.assignmentRepo.create({
          subjectId: subject.id,
          scenarioId,
          status: AssignmentStatus.ACTIVE,
          assignedById: officerId,
          assignedAt: daysAgo(randomInt(30, 55)),
        }),
      );
      results.push(assignment);
    }

    return results;
  }

  /* ───── Step 6b: Alert Rules ───── */

  private async seedAlertRules(scenarioId: string): Promise<Record<string, string>> {
    const rules = [
      {
        code: 'AR-DEFAULT-OVERDUE',
        name: 'Quá hạn điểm danh',
        eventType: 'CHECKIN_OVERDUE',
        alertLevel: AlertLevel.TRUNG_BINH,
        conditionOperator: '>=',
        conditionValue: 1,
        conditionWindowDays: null,
        source: AlertRuleSource.DEFAULT,
        isDeletable: false,
        isEditable: true,
        mapKey: 'OVERDUE',
      },
      {
        code: 'AR-DEFAULT-FACE',
        name: 'Sai khuôn mặt liên tiếp',
        eventType: 'FACE_MISMATCH',
        alertLevel: AlertLevel.CAO,
        conditionOperator: '>=',
        conditionValue: 3,
        conditionWindowDays: 7,
        source: AlertRuleSource.DEFAULT,
        isDeletable: false,
        isEditable: true,
        mapKey: 'FACE_MISMATCH_STREAK',
      },
      {
        code: 'AR-DEFAULT-NFC',
        name: 'NFC không khớp CCCD',
        eventType: 'NFC_FAIL',
        alertLevel: AlertLevel.TRUNG_BINH,
        conditionOperator: '>=',
        conditionValue: 1,
        conditionWindowDays: null,
        source: AlertRuleSource.DEFAULT,
        isDeletable: false,
        isEditable: true,
        mapKey: 'NFC_CCCD_MISMATCH',
      },
      {
        code: 'AR-DEFAULT-SEVERE',
        name: 'Quá hạn nghiêm trọng',
        eventType: 'SEVERE_OVERDUE',
        alertLevel: AlertLevel.KHAN_CAP,
        conditionOperator: '>=',
        conditionValue: 1,
        conditionWindowDays: null,
        source: AlertRuleSource.DEFAULT,
        isDeletable: false,
        isEditable: true,
        mapKey: 'SEVERE_OVERDUE',
      },
    ];

    const ruleMap: Record<string, string> = {};

    for (const r of rules) {
      const saved = await this.alertRuleRepo.save(
        this.alertRuleRepo.create({
          scenarioId,
          code: r.code,
          name: r.name,
          source: r.source,
          eventType: r.eventType,
          conditionOperator: r.conditionOperator,
          conditionValue: r.conditionValue,
          conditionWindowDays: r.conditionWindowDays,
          alertLevel: r.alertLevel,
          isDeletable: r.isDeletable,
          isEditable: r.isEditable,
          isActive: true,
        }),
      );
      ruleMap[r.mapKey] = saved.id;
    }

    this.logger.log(`Seeded ${rules.length} alert rules`);
    return ruleMap;
  }

  /* ───── Step 7: Events ───── */

  private async generateEvents(
    subjects: Subject[],
    scenarioId: string,
    officerId: string,
  ) {
    const allEvents: Event[] = [];

    for (let si = 0; si < subjects.length; si++) {
      const subject = subjects[si];
      const deviceInfo = DEVICES[si % DEVICES.length];
      const deviceId = `device-${subject.id.slice(0, 8)}`;

      // Generate 7-12 events per subject across 30 days
      const eventCount = randomInt(7, 12);

      for (let i = 0; i < eventCount; i++) {
        const dayOffset = Math.round((i / eventCount) * 30);
        const timestamp = daysAgo(30 - dayOffset);

        // 60% normal check-in, 40% problematic
        const roll = Math.random();
        let type: string;
        let result: EventResult;
        let faceMatchScore: number;
        let nfcVerified: boolean;
        let nfcCccdMatch: boolean;
        let inGeofence: boolean;
        let geofenceDistance: number;

        if (roll < 0.60) {
          // Normal successful check-in
          type = 'CHECK_IN';
          result = EventResult.SUCCESS;
          faceMatchScore = randomFloat(85, 99, 2);
          nfcVerified = true;
          nfcCccdMatch = true;
          inGeofence = true;
          geofenceDistance = randomInt(0, 30);
        } else if (roll < 0.72) {
          // Overdue check-in
          type = 'CHECKIN_OVERDUE';
          result = EventResult.WARNING;
          faceMatchScore = randomFloat(85, 98, 2);
          nfcVerified = true;
          nfcCccdMatch = true;
          inGeofence = true;
          geofenceDistance = randomInt(0, 50);
        } else if (roll < 0.80) {
          // Severe overdue
          type = 'SEVERE_OVERDUE';
          result = EventResult.FAILED;
          faceMatchScore = 0;
          nfcVerified = false;
          nfcCccdMatch = false;
          inGeofence = false;
          geofenceDistance = 0;
        } else if (roll < 0.88) {
          // Face mismatch
          type = 'FACE_MISMATCH';
          result = EventResult.FAILED;
          faceMatchScore = randomFloat(20, 60, 2);
          nfcVerified = true;
          nfcCccdMatch = true;
          inGeofence = true;
          geofenceDistance = randomInt(0, 30);
        } else if (roll < 0.94) {
          // NFC fail
          type = 'NFC_FAIL';
          result = EventResult.FAILED;
          faceMatchScore = randomFloat(85, 98, 2);
          nfcVerified = false;
          nfcCccdMatch = false;
          inGeofence = true;
          geofenceDistance = randomInt(0, 30);
        } else {
          // Geofence violation
          type = 'GEOFENCE_VIOLATION';
          result = EventResult.WARNING;
          faceMatchScore = randomFloat(85, 98, 2);
          nfcVerified = true;
          nfcCccdMatch = true;
          inGeofence = false;
          geofenceDistance = randomInt(100, 800);
        }

        const gpsLat = BACH_KHOA_LAT + randomFloat(-GPS_JITTER, GPS_JITTER);
        const gpsLng = BACH_KHOA_LNG + randomFloat(-GPS_JITTER, GPS_JITTER);

        const event = this.eventRepo.create({
          code: uniqueCode('EV'),
          type,
          subjectId: subject.id,
          scenarioId,
          result,
          gpsLat,
          gpsLng,
          gpsAccuracy: randomFloat(3, 50, 2),
          inGeofence,
          geofenceDistance,
          faceMatchScore,
          nfcVerified,
          nfcCccdMatch,
          livenessScore: type === 'SEVERE_OVERDUE' ? null : randomFloat(75, 99, 2),
          faceImageUrl: null,
          deviceId,
          deviceInfo,
          isVoluntary: false,
          extraData: null,
          clientTimestamp: timestamp,
          createdById: officerId,
        });

        const saved = await this.eventRepo.save(event);
        allEvents.push(saved);
      }
    }

    this.logger.log(`Generated ${allEvents.length} events`);
    return allEvents;
  }

  /* ───── Step 8: Alerts ───── */

  private async generateAlerts(events: Event[], scenarioId: string, ruleIds: Record<string, string>) {

    const alertableEvents = events.filter(
      (e) => e.type !== 'CHECK_IN' || e.result !== EventResult.SUCCESS,
    );

    const allAlerts: Alert[] = [];

    // Map event types to alert types + levels
    const eventToAlert: Record<string, { alertType: string; level: AlertLevel }> = {
      CHECKIN_OVERDUE: { alertType: 'OVERDUE', level: AlertLevel.TRUNG_BINH },
      SEVERE_OVERDUE: { alertType: 'SEVERE_OVERDUE', level: AlertLevel.KHAN_CAP },
      FACE_MISMATCH: { alertType: 'FACE_MISMATCH_STREAK', level: AlertLevel.CAO },
      NFC_FAIL: { alertType: 'NFC_CCCD_MISMATCH', level: AlertLevel.TRUNG_BINH },
      GEOFENCE_VIOLATION: { alertType: 'OVERDUE', level: AlertLevel.THAP },
    };

    // Create alert for each alertable event (not all — pick ~70%)
    for (const event of alertableEvents) {
      if (Math.random() > 0.70) continue; // skip 30% to vary data

      const mapping = eventToAlert[event.type];
      if (!mapping) continue;

      // Determine status distribution: 40% OPEN, 20% ACKNOWLEDGED, 25% RESOLVED, 15% ESCALATED
      const statusRoll = Math.random();
      let status: AlertStatus;
      if (statusRoll < 0.40) status = AlertStatus.OPEN;
      else if (statusRoll < 0.60) status = AlertStatus.ACKNOWLEDGED;
      else if (statusRoll < 0.85) status = AlertStatus.RESOLVED;
      else status = AlertStatus.ESCALATED;

      // High/Critical alerts more likely to be escalated
      if (
        (mapping.level === AlertLevel.CAO || mapping.level === AlertLevel.KHAN_CAP) &&
        Math.random() < 0.5
      ) {
        status = AlertStatus.ESCALATED;
      }

      const alert = this.alertRepo.create({
        code: uniqueCode('AL'),
        type: mapping.alertType,
        level: mapping.level,
        status,
        source: AlertRuleSource.DEFAULT,
        subjectId: event.subjectId,
        triggerEventId: event.id,
        alertRuleId: ruleIds[mapping.alertType] ?? ruleIds.OVERDUE,
        scenarioId,
        resolvedAt: status === AlertStatus.RESOLVED ? daysAgo(randomInt(0, 5)) : null,
        escalatedAt: status === AlertStatus.ESCALATED ? daysAgo(randomInt(0, 3)) : null,
      });

      const saved = await this.alertRepo.save(alert);
      allAlerts.push(saved);
    }

    this.logger.log(`Generated ${allAlerts.length} alerts`);
    return allAlerts;
  }

  /* ───── Step 9: Cases + Notes ───── */

  private async generateCases(
    alerts: Alert[],
    subjects: Subject[],
    officer: User,
    events: Event[],
  ) {
    const allCases: Case[] = [];
    let totalNotes = 0;

    // Case 1-2: AUTO-escalated from high/critical alerts
    const escalatedAlerts = alerts.filter((a) => a.status === AlertStatus.ESCALATED);

    for (let i = 0; i < Math.min(2, escalatedAlerts.length); i++) {
      const alert = escalatedAlerts[i];

      const autoCase = await this.caseRepo.save(
        this.caseRepo.create({
          code: uniqueCode('CA'),
          subjectId: alert.subjectId,
          severity: alert.level,
          source: CaseSource.AUTO,
          description:
            i === 0
              ? 'Đối tượng không thực hiện check-in trong 72 giờ liên tiếp. Hệ thống tự động tạo vụ việc để cán bộ xử lý.'
              : 'Phát hiện nhiều lần khuôn mặt không khớp khi check-in. Nghi ngờ có người khác sử dụng thiết bị của đối tượng.',
          escalatedFromAlertId: alert.id,
          escalationType: EscalationType.AUTO,
          escalationReason: `Cảnh báo ${alert.type} mức ${alert.level} được hệ thống tự động leo thang`,
          escalationRuleName: 'Auto-escalation: Mức CAO/KHẨN CẤP',
          linkedEventIds: [alert.triggerEventId],
          assigneeId: officer.id,
          createdByName: 'HỆ THỐNG',
        }),
      );

      // Link case back to alert
      alert.caseId = autoCase.id;
      await this.alertRepo.save(alert);

      allCases.push(autoCase);

      // Notes for auto case
      const noteTexts =
        i === 0
          ? [
              'Đã kiểm tra hệ thống camera khu vực, xác nhận đối tượng không có mặt tại nơi cư trú trong 3 ngày qua.',
              'Đã liên hệ đối tượng qua số 0912345678, không nhận được phản hồi. Sẽ cử cán bộ đến kiểm tra trực tiếp tại nhà.',
              'Cán bộ cơ sở đã đến kiểm tra tại Số 12, ngõ 68 Trần Đại Nghĩa. Đối tượng đang ở nhà, điện thoại bị hỏng nên không check-in được. Đã hướng dẫn đổi thiết bị.',
            ]
          : [
              'Kiểm tra log check-in cho thấy 3 lần liên tiếp khuôn mặt không khớp vào ngày 15, 16, 17 tháng này.',
              'Đã mời đối tượng lên phường để xác minh danh tính trực tiếp. Đối tượng xác nhận là chính mình nhưng do cắt tóc và đeo kính nên camera không nhận diện đúng.',
            ];

      for (const content of noteTexts) {
        await this.noteRepo.save(
          this.noteRepo.create({
            caseId: autoCase.id,
            content,
            authorId: officer.id,
            
          }),
        );
        totalNotes++;
      }
    }

    // Case 3: MANUAL_ESCALATE — officer escalates an alert manually
    const acknowledgedAlerts = alerts.filter((a) => a.status === AlertStatus.ACKNOWLEDGED);
    if (acknowledgedAlerts.length > 0) {
      const alert = acknowledgedAlerts[0];

      const manualEscCase = await this.caseRepo.save(
        this.caseRepo.create({
          code: uniqueCode('CA'),
          subjectId: alert.subjectId,
          severity: AlertLevel.CAO,
          source: CaseSource.MANUAL_ESCALATE,
          description:
            'Cán bộ quản lý phát hiện đối tượng có biểu hiện bất thường qua nhiều lần cảnh báo liên tiếp. Quyết định leo thang thành vụ việc để theo dõi sát hơn.',
          escalatedFromAlertId: alert.id,
          escalationType: EscalationType.MANUAL,
          escalationReason: 'Cán bộ Đặng Văn Minh nhận định cần theo dõi sát do nhiều vi phạm nhỏ liên tiếp',
          linkedEventIds: [alert.triggerEventId],
          assigneeId: officer.id,
          createdById: officer.id,
          createdByName: officer.fullName,
        }),
      );

      alert.caseId = manualEscCase.id;
      alert.status = AlertStatus.ESCALATED;
      alert.escalatedAt = new Date();
      await this.alertRepo.save(alert);

      allCases.push(manualEscCase);

      // Notes
      const noteTexts = [
        'Đã kiểm tra lịch sử check-in của đối tượng, phát hiện 5 lần trễ giờ và 2 lần NFC lỗi trong 2 tuần qua.',
        'Báo cáo lãnh đạo phòng. Chờ chỉ đạo về phương án tăng cường giám sát.',
      ];
      for (const content of noteTexts) {
        await this.noteRepo.save(
          this.noteRepo.create({
            caseId: manualEscCase.id,
            content,
            authorId: officer.id,
            
          }),
        );
        totalNotes++;
      }
    }

    // Case 4: MANUAL_NEW — created directly by officer
    if (subjects.length >= 4) {
      const manualCase = await this.caseRepo.save(
        this.caseRepo.create({
          code: uniqueCode('CA'),
          subjectId: subjects[3].id,
          severity: AlertLevel.TRUNG_BINH,
          source: CaseSource.MANUAL_NEW,
          description:
            'Nhận được phản ánh từ tổ dân phố về việc đối tượng thường xuyên vắng nhà vào ban đêm. Tạo vụ việc để xác minh và theo dõi.',
          linkedEventIds: events
            .filter((e) => e.subjectId === subjects[3].id)
            .slice(0, 3)
            .map((e) => e.id),
          assigneeId: officer.id,
          createdById: officer.id,
          createdByName: officer.fullName,
        }),
      );

      allCases.push(manualCase);

      const noteTexts = [
        'Tổ trưởng tổ dân phố số 5 phản ánh: đối tượng thường ra ngoài sau 23h và về nhà khoảng 4-5h sáng trong tuần qua.',
        'Đã trao đổi trực tiếp với đối tượng. Đối tượng giải trình do đi làm ca đêm tại nhà hàng trên phố Bạch Mai. Yêu cầu cung cấp xác nhận từ nhà hàng.',
        'Đối tượng đã nộp giấy xác nhận làm việc ca đêm có xác nhận của chủ nhà hàng. Đề xuất điều chỉnh khung giờ check-in phù hợp.',
      ];
      for (const content of noteTexts) {
        await this.noteRepo.save(
          this.noteRepo.create({
            caseId: manualCase.id,
            content,
            authorId: officer.id,
            
          }),
        );
        totalNotes++;
      }
    }

    // Case 5: A CLOSED case (to test the closed tab in UI)
    if (subjects.length >= 5) {
      const closedCase = await this.caseRepo.save(
        this.caseRepo.create({
          code: uniqueCode('CA'),
          subjectId: subjects[4].id,
          severity: AlertLevel.THAP,
          source: CaseSource.MANUAL_NEW,
          status: CaseStatus.CLOSED,
          description:
            'Đối tượng không check-in 2 ngày do đi viện. Đã xác minh và đóng vụ việc.',
          assigneeId: officer.id,
          createdById: officer.id,
          createdByName: officer.fullName,
          closingNote:
            'Đã xác minh đối tượng nằm viện tại BV Bạch Mai từ ngày 10-12/03. Có giấy xác nhận xuất viện. Đối tượng đã check-in trở lại bình thường. Đóng vụ việc.',
          closedById: officer.id,
          closedAt: daysAgo(2),
        }),
      );

      allCases.push(closedCase);

      await this.noteRepo.save(
        this.noteRepo.create({
          caseId: closedCase.id,
          content: 'Đối tượng đã nộp giấy xuất viện BV Bạch Mai. Xác nhận thông tin chính xác.',
          authorId: officer.id,
          
        }),
      );
      totalNotes++;
    }

    this.logger.log(`Generated ${allCases.length} cases, ${totalNotes} notes`);
    return { cases: allCases, notes: totalNotes };
  }
}
