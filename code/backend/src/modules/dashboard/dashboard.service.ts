import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { User, DataScopeLevel } from '../users/entities/user.entity';
import { Subject } from '../subjects/entities/subject.entity';
import { Event, EventResult } from '../events/entities/event.entity';
import { Alert, AlertStatus } from '../alerts/entities/alert.entity';
import { Case, CaseStatus } from '../cases/entities/case.entity';
import { AreasService } from '../areas/areas.service';

// --- Label mappings ---

const EVENT_TYPE_LABELS: Record<string, string> = {
  CHECKIN: 'Check-in',
  CHECKIN_OVERDUE: 'Quá hạn check-in',
  FACE_MISMATCH: 'Sai khuôn mặt',
  NFC_MISMATCH: 'NFC không khớp',
  GEOFENCE_VIOLATION: 'Ngoài vùng giám sát',
  CURFEW_VIOLATION: 'Vi phạm giờ giới nghiêm',
};

const ALERT_TYPE_LABELS: Record<string, string> = {
  OVERDUE: 'Quá hạn check-in',
  FACE_MISMATCH_STREAK: 'Sai mặt liên tiếp',
  NFC_CCCD_MISMATCH: 'NFC CCCD không khớp',
  SEVERE_OVERDUE: 'Quá hạn nghiêm trọng',
  GEOFENCE_VIOLATION: 'Vi phạm vùng giám sát',
  CURFEW_VIOLATION: 'Vi phạm giờ giới nghiêm',
};

const SEVERITY_LABELS: Record<string, string> = {
  KHAN_CAP: 'Khẩn cấp',
  CAO: 'Cao',
  TRUNG_BINH: 'Trung bình',
  THAP: 'Thấp',
};

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Subject)
    private readonly subjectRepo: Repository<Subject>,
    @InjectRepository(Event)
    private readonly eventRepo: Repository<Event>,
    @InjectRepository(Alert)
    private readonly alertRepo: Repository<Alert>,
    @InjectRepository(Case)
    private readonly caseRepo: Repository<Case>,
    private readonly areasService: AreasService,
  ) {}

  // ─── Summary ───────────────────────────────────────────────────────

  async getSummary(userId: string) {
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) throw new NotFoundException('User not found');

    const scopeAreaIds = await this.areasService.resolveAreaIds(
      user.dataScopeLevel,
      user.areaId,
    );

    const subjectIds = await this.getSubjectIdsInScope(scopeAreaIds);

    const [
      totalSubjects,
      newSubjectsLast30d,
      complianceRate,
      openAlerts,
      openAlertsToday,
      openCases,
      openCasesToday,
      complianceTrend,
    ] = await Promise.all([
      this.countSubjects(scopeAreaIds),
      this.countNewSubjects(scopeAreaIds, 30),
      this.avgComplianceRate(scopeAreaIds),
      this.countOpenAlerts(subjectIds),
      this.countOpenAlertsToday(subjectIds),
      this.countOpenCases(subjectIds),
      this.countOpenCasesToday(subjectIds),
      this.getComplianceTrend(subjectIds),
    ]);

    // Compliance change: compare last 7 days vs previous 7 days
    const complianceChange = await this.getComplianceChange(subjectIds);

    const scopeLabel = await this.getScopeLabel(user);

    return {
      stats: {
        totalSubjects,
        totalSubjectsChange: newSubjectsLast30d > 0 ? `+${newSubjectsLast30d}` : '0',
        totalSubjectsChangePeriod: 'tháng trước',
        complianceRate,
        complianceRateChange: complianceChange,
        complianceRateChangePeriod: 'tuần trước',
        openAlerts,
        openAlertsToday,
        openCases,
        openCasesToday,
      },
      complianceTrend,
      scope: {
        label: scopeLabel,
        level: user.dataScopeLevel,
        id: user.areaId || 'system',
      },
    };
  }

  // ─── Charts data ──────────────────────────────────────────────────

  async getCharts(userId: string) {
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) throw new NotFoundException('User not found');

    const scopeAreaIds = await this.areasService.resolveAreaIds(
      user.dataScopeLevel,
      user.areaId,
    );
    const subjectIds = await this.getSubjectIdsInScope(scopeAreaIds);

    const [
      eventsByType,
      alertsBySeverity,
      subjectsByStatus,
      eventsPerDay,
    ] = await Promise.all([
      this.getEventsByType(subjectIds),
      this.getAlertsBySeverity(subjectIds),
      this.getSubjectsByStatus(scopeAreaIds),
      this.getEventsPerDay(subjectIds),
    ]);

    return {
      eventsByType,
      alertsBySeverity,
      subjectsByStatus,
      eventsPerDay,
    };
  }

  private async getEventsByType(
    subjectIds: string[] | null,
  ): Promise<{ name: string; value: number }[]> {
    if (subjectIds !== null && subjectIds.length === 0) return [];

    const qb = this.eventRepo
      .createQueryBuilder('e')
      .select('e.type', 'type')
      .addSelect('COUNT(*)::int', 'count')
      .where("e.created_at >= NOW() - INTERVAL '30 days'");

    if (subjectIds !== null) {
      qb.andWhere('e.subject_id IN (:...ids)', { ids: subjectIds });
    }

    qb.groupBy('e.type').orderBy('count', 'DESC');

    const rows: { type: string; count: number }[] = await qb.getRawMany();
    return rows.map((r) => ({
      name: EVENT_TYPE_LABELS[r.type] || r.type,
      value: r.count,
    }));
  }

  private async getAlertsBySeverity(
    subjectIds: string[] | null,
  ): Promise<{ name: string; value: number; key: string }[]> {
    if (subjectIds !== null && subjectIds.length === 0) return [];

    const qb = this.alertRepo
      .createQueryBuilder('a')
      .select('a.level', 'level')
      .addSelect('COUNT(*)::int', 'count')
      .where('a.status = :status', { status: AlertStatus.OPEN });

    if (subjectIds !== null) {
      qb.andWhere('a.subject_id IN (:...ids)', { ids: subjectIds });
    }

    qb.groupBy('a.level').orderBy('count', 'DESC');

    const rows: { level: string; count: number }[] = await qb.getRawMany();
    return rows.map((r) => ({
      name: SEVERITY_LABELS[r.level] || r.level,
      value: r.count,
      key: r.level,
    }));
  }

  private async getSubjectsByStatus(
    scopeAreaIds: string[] | null,
  ): Promise<{ name: string; value: number; key: string }[]> {
    const STATUS_LABELS: Record<string, string> = {
      KHOI_TAO: 'Khởi tạo',
      ENROLLMENT: 'Đăng ký',
      DANG_QUAN_LY: 'Đang quản lý',
      TAI_HOA_NHAP: 'Tái hòa nhập',
      KET_THUC: 'Kết thúc',
    };

    const qb = this.subjectRepo
      .createQueryBuilder('s')
      .select('s.lifecycle', 'lifecycle')
      .addSelect('COUNT(*)::int', 'count')
      .where('s.deleted_at IS NULL');

    if (scopeAreaIds !== null) {
      qb.andWhere('s.area_id IN (:...areaIds)', { areaIds: scopeAreaIds });
    }

    qb.groupBy('s.lifecycle').orderBy('count', 'DESC');

    const rows: { lifecycle: string; count: number }[] = await qb.getRawMany();
    return rows.map((r) => ({
      name: STATUS_LABELS[r.lifecycle] || r.lifecycle,
      value: r.count,
      key: r.lifecycle,
    }));
  }

  private async getEventsPerDay(
    subjectIds: string[] | null,
  ): Promise<{ date: string; total: number; success: number; failed: number }[]> {
    const days: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().split('T')[0]);
    }

    if (subjectIds !== null && subjectIds.length === 0) {
      return days.map((date) => ({ date, total: 0, success: 0, failed: 0 }));
    }

    const qb = this.eventRepo
      .createQueryBuilder('e')
      .select("TO_CHAR(e.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD')", 'date')
      .addSelect('COUNT(*)::int', 'total')
      .addSelect("COUNT(*) FILTER (WHERE e.result = 'SUCCESS')::int", 'success')
      .addSelect("COUNT(*) FILTER (WHERE e.result = 'FAILED')::int", 'failed')
      .where("e.created_at >= NOW() - INTERVAL '7 days'");

    if (subjectIds !== null) {
      qb.andWhere('e.subject_id IN (:...ids)', { ids: subjectIds });
    }

    qb.groupBy("TO_CHAR(e.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD')");

    const rows: { date: string; total: number; success: number; failed: number }[] =
      await qb.getRawMany();

    const dayMap = new Map(rows.map((r) => [r.date, r]));

    return days.map((date) => {
      const data = dayMap.get(date);
      return {
        date,
        total: data?.total ?? 0,
        success: data?.success ?? 0,
        failed: data?.failed ?? 0,
      };
    });
  }

  // ─── Recent Events ─────────────────────────────────────────────────

  async getRecentEvents(userId: string, limit: number) {
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) throw new NotFoundException('User not found');

    const scopeAreaIds = await this.areasService.resolveAreaIds(
      user.dataScopeLevel,
      user.areaId,
    );
    const subjectIds = await this.getSubjectIdsInScope(scopeAreaIds);

    if (subjectIds !== null && subjectIds.length === 0) {
      return { data: [] };
    }

    const findOptions: any = {
      relations: ['subject'],
      order: { createdAt: 'DESC' },
      take: limit,
    };

    if (subjectIds !== null) {
      findOptions.where = { subjectId: In(subjectIds) };
    }

    const events = await this.eventRepo.find(findOptions);

    return {
      data: events.map((e) => ({
        id: e.id,
        code: e.code,
        timestamp: e.createdAt.toISOString(),
        subject: {
          id: e.subject.id,
          name: e.subject.fullName,
          code: e.subject.code,
        },
        type: e.type,
        typeLabel: EVENT_TYPE_LABELS[e.type] || e.type,
        ...this.mapEventResult(e),
      })),
    };
  }

  // ─── Open Alerts ───────────────────────────────────────────────────

  async getOpenAlerts(userId: string, limit: number) {
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) throw new NotFoundException('User not found');

    const scopeAreaIds = await this.areasService.resolveAreaIds(
      user.dataScopeLevel,
      user.areaId,
    );
    const subjectIds = await this.getSubjectIdsInScope(scopeAreaIds);

    if (subjectIds !== null && subjectIds.length === 0) {
      return { data: [] };
    }

    const findOptions: any = {
      relations: ['subject'],
      where: { status: AlertStatus.OPEN } as any,
      order: { level: 'DESC', createdAt: 'DESC' },
      take: limit,
    };

    if (subjectIds !== null) {
      findOptions.where = {
        status: AlertStatus.OPEN,
        subjectId: In(subjectIds),
      };
    }

    const alerts = await this.alertRepo.find(findOptions);

    return {
      data: alerts.map((a) => ({
        id: a.id,
        code: a.code,
        subject: {
          id: a.subject.id,
          name: a.subject.fullName,
          code: a.subject.code,
        },
        type: a.type,
        typeLabel: ALERT_TYPE_LABELS[a.type] || a.type,
        severity: a.level,
        severityLabel: SEVERITY_LABELS[a.level] || a.level,
        timestamp: a.createdAt.toISOString(),
      })),
    };
  }

  // ─── Private helpers ───────────────────────────────────────────────

  private async getSubjectIdsInScope(
    scopeAreaIds: string[] | null,
  ): Promise<string[] | null> {
    if (scopeAreaIds === null) return null; // SYSTEM scope

    const subjects = await this.subjectRepo
      .createQueryBuilder('s')
      .select('s.id')
      .where('s.area_id IN (:...areaIds)', { areaIds: scopeAreaIds })
      .andWhere('s.deleted_at IS NULL')
      .getMany();

    return subjects.map((s) => s.id);
  }

  private async countSubjects(scopeAreaIds: string[] | null): Promise<number> {
    const qb = this.subjectRepo
      .createQueryBuilder('s')
      .where('s.deleted_at IS NULL')
      .andWhere("s.status IN ('ACTIVE', 'ENROLLED')");

    if (scopeAreaIds !== null) {
      qb.andWhere('s.area_id IN (:...areaIds)', { areaIds: scopeAreaIds });
    }

    return qb.getCount();
  }

  private async countNewSubjects(
    scopeAreaIds: string[] | null,
    days: number,
  ): Promise<number> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const qb = this.subjectRepo
      .createQueryBuilder('s')
      .where('s.deleted_at IS NULL')
      .andWhere('s.created_at >= :since', { since });

    if (scopeAreaIds !== null) {
      qb.andWhere('s.area_id IN (:...areaIds)', { areaIds: scopeAreaIds });
    }

    return qb.getCount();
  }

  private async avgComplianceRate(
    scopeAreaIds: string[] | null,
  ): Promise<number> {
    const qb = this.subjectRepo
      .createQueryBuilder('s')
      .select('AVG(s.compliance_rate)', 'avg')
      .where('s.deleted_at IS NULL')
      .andWhere('s.compliance_rate IS NOT NULL');

    if (scopeAreaIds !== null) {
      qb.andWhere('s.area_id IN (:...areaIds)', { areaIds: scopeAreaIds });
    }

    const result = await qb.getRawOne();
    return result?.avg ? parseFloat(parseFloat(result.avg).toFixed(1)) : 0;
  }

  private async countOpenAlerts(
    subjectIds: string[] | null,
  ): Promise<number> {
    if (subjectIds !== null && subjectIds.length === 0) return 0;

    const qb = this.alertRepo
      .createQueryBuilder('a')
      .where('a.status = :status', { status: AlertStatus.OPEN });

    if (subjectIds !== null) {
      qb.andWhere('a.subject_id IN (:...ids)', { ids: subjectIds });
    }

    return qb.getCount();
  }

  private async countOpenAlertsToday(
    subjectIds: string[] | null,
  ): Promise<number> {
    if (subjectIds !== null && subjectIds.length === 0) return 0;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const qb = this.alertRepo
      .createQueryBuilder('a')
      .where('a.status = :status', { status: AlertStatus.OPEN })
      .andWhere('a.created_at >= :today', { today: todayStart });

    if (subjectIds !== null) {
      qb.andWhere('a.subject_id IN (:...ids)', { ids: subjectIds });
    }

    return qb.getCount();
  }

  private async countOpenCases(
    subjectIds: string[] | null,
  ): Promise<number> {
    if (subjectIds !== null && subjectIds.length === 0) return 0;

    const qb = this.caseRepo
      .createQueryBuilder('c')
      .where('c.status = :status', { status: CaseStatus.OPEN });

    if (subjectIds !== null) {
      qb.andWhere('c.subject_id IN (:...ids)', { ids: subjectIds });
    }

    return qb.getCount();
  }

  private async countOpenCasesToday(
    subjectIds: string[] | null,
  ): Promise<number> {
    if (subjectIds !== null && subjectIds.length === 0) return 0;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const qb = this.caseRepo
      .createQueryBuilder('c')
      .where('c.status = :status', { status: CaseStatus.OPEN })
      .andWhere('c.created_at >= :today', { today: todayStart });

    if (subjectIds !== null) {
      qb.andWhere('c.subject_id IN (:...ids)', { ids: subjectIds });
    }

    return qb.getCount();
  }

  private async getComplianceTrend(
    subjectIds: string[] | null,
  ): Promise<{ date: string; rate: number }[]> {
    const days: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().split('T')[0]);
    }

    if (subjectIds !== null && subjectIds.length === 0) {
      return days.map((date) => ({ date, rate: 0 }));
    }

    const qb = this.eventRepo
      .createQueryBuilder('e')
      .select("TO_CHAR(e.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD')", 'date')
      .addSelect('COUNT(*)::int', 'total')
      .addSelect("COUNT(*) FILTER (WHERE e.result = 'SUCCESS')::int", 'success')
      .where("e.created_at >= NOW() - INTERVAL '7 days'");

    if (subjectIds !== null) {
      qb.andWhere('e.subject_id IN (:...ids)', { ids: subjectIds });
    }

    qb.groupBy("TO_CHAR(e.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD')");

    const rows: { date: string; total: number; success: number }[] =
      await qb.getRawMany();

    const dayMap = new Map(rows.map((r) => [r.date, r]));

    return days.map((date) => {
      const data = dayMap.get(date);
      const rate =
        data && data.total > 0
          ? Math.round((data.success / data.total) * 1000) / 10
          : 0;
      return { date, rate };
    });
  }

  private async getComplianceChange(
    subjectIds: string[] | null,
  ): Promise<string> {
    if (subjectIds !== null && subjectIds.length === 0) return '+0.0';

    const calcRate = async (daysAgo: number, window: number) => {
      const from = new Date();
      from.setDate(from.getDate() - daysAgo);
      const to = new Date();
      to.setDate(to.getDate() - (daysAgo - window));

      const qb = this.eventRepo
        .createQueryBuilder('e')
        .select('COUNT(*)::int', 'total')
        .addSelect("COUNT(*) FILTER (WHERE e.result = 'SUCCESS')::int", 'success')
        .where('e.created_at >= :from', { from })
        .andWhere('e.created_at < :to', { to });

      if (subjectIds !== null) {
        qb.andWhere('e.subject_id IN (:...ids)', { ids: subjectIds });
      }

      const row = await qb.getRawOne();
      if (!row || row.total === 0) return null;
      return (row.success / row.total) * 100;
    };

    const thisWeek = await calcRate(7, 7);
    const lastWeek = await calcRate(14, 7);

    if (thisWeek === null || lastWeek === null) return '+0.0';

    const diff = thisWeek - lastWeek;
    const sign = diff >= 0 ? '+' : '';
    return `${sign}${diff.toFixed(1)}`;
  }

  private async getScopeLabel(user: User): Promise<string> {
    if (
      user.dataScopeLevel === DataScopeLevel.SYSTEM ||
      !user.areaId
    ) {
      return 'Toàn hệ thống';
    }

    const area = await this.areasService.findById(user.areaId);
    return area ? area.name : '';
  }

  private mapEventResult(event: Event): {
    result: string;
    resultLabel: string;
  } {
    if (event.result === EventResult.SUCCESS) {
      return { result: 'VALID', resultLabel: 'Hợp lệ' };
    }

    if (event.result === EventResult.FAILED) {
      if (
        event.type === 'CHECKIN_OVERDUE' ||
        event.type === 'SEVERE_OVERDUE'
      ) {
        return { result: 'OVERDUE', resultLabel: 'Quá hạn' };
      }
      return { result: 'VIOLATION', resultLabel: 'Vi phạm' };
    }

    // WARNING
    return { result: 'PROCESSING', resultLabel: 'Đang xử lý' };
  }
}
