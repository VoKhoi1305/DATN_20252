import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as ExcelJS from 'exceljs';
import { Alert, AlertStatus } from './entities/alert.entity';
import { Case, CaseSource, EscalationType } from '../cases/entities/case.entity';
import { User } from '../users/entities/user.entity';
import { AreasService } from '../areas/areas.service';
import { ListAlertsDto } from './dto/list-alerts.dto';
import { EscalateAlertDto } from './dto/escalate-alert.dto';

@Injectable()
export class AlertsService {
  constructor(
    @InjectRepository(Alert)
    private readonly alertRepo: Repository<Alert>,
    @InjectRepository(Case)
    private readonly caseRepo: Repository<Case>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly areasService: AreasService,
  ) {}

  async list(userId: string, query: ListAlertsDto) {
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const areaIds = await this.areasService.resolveAreaIds(
      user.dataScopeLevel,
      user.areaId,
    );

    const qb = this.alertRepo
      .createQueryBuilder('alert')
      .innerJoinAndSelect('alert.subject', 'subject');

    // Scope filtering
    if (areaIds !== null) {
      if (areaIds.length === 0) {
        return { data: [], total: 0, page: query.page, limit: query.limit };
      }
      qb.andWhere('subject.areaId IN (:...areaIds)', { areaIds });
    }

    // Apply filters
    if (query.status) {
      qb.andWhere('alert.status = :status', { status: query.status });
    }
    if (query.level) {
      qb.andWhere('alert.level = :level', { level: query.level });
    }
    if (query.subject_id) {
      qb.andWhere('alert.subjectId = :subjectId', { subjectId: query.subject_id });
    }
    if (query.type) {
      qb.andWhere('alert.type = :type', { type: query.type });
    }
    if (query.source) {
      qb.andWhere('alert.source = :source', { source: query.source });
    }
    if (query.from) {
      qb.andWhere('alert.createdAt >= :from', { from: query.from });
    }
    if (query.to) {
      qb.andWhere('alert.createdAt <= :to', { to: query.to });
    }

    // Sorting
    const allowedSortColumns: Record<string, string> = {
      created_at: 'alert.createdAt',
      level: 'alert.level',
      status: 'alert.status',
      type: 'alert.type',
    };
    const sortColumn = allowedSortColumns[query.sort] || 'alert.createdAt';
    const sortOrder = query.order === 'asc' ? 'ASC' : 'DESC';
    qb.orderBy(sortColumn, sortOrder);

    // Pagination
    const skip = (query.page - 1) * query.limit;
    qb.skip(skip).take(query.limit);

    const [items, total] = await qb.getManyAndCount();

    const data = items.map((alert) => ({
      id: alert.id,
      code: alert.code,
      type: alert.type,
      level: alert.level,
      status: alert.status,
      source: alert.source,
      created_at: alert.createdAt,
      subject: {
        id: alert.subject.id,
        code: alert.subject.code,
        full_name: alert.subject.fullName,
      },
    }));

    return { data, total, page: query.page, limit: query.limit };
  }

  async findOne(id: string) {
    const alert = await this.alertRepo
      .createQueryBuilder('alert')
      .innerJoinAndSelect('alert.subject', 'subject')
      .leftJoinAndMapOne(
        'alert._triggerEvent',
        'events',
        'event',
        'event.id = alert.triggerEventId',
      )
      .where('alert.id = :id', { id })
      .getOne();

    if (!alert) {
      throw new NotFoundException('Alert not found');
    }

    // Extract the joined event from raw mapped property
    const triggerEvent = (alert as any)._triggerEvent;

    return {
      id: alert.id,
      code: alert.code,
      type: alert.type,
      level: alert.level,
      status: alert.status,
      source: alert.source,
      subject_id: alert.subjectId,
      trigger_event_id: alert.triggerEventId,
      alert_rule_id: alert.alertRuleId,
      scenario_id: alert.scenarioId,
      case_id: alert.caseId,
      resolved_at: alert.resolvedAt,
      escalated_at: alert.escalatedAt,
      created_at: alert.createdAt,
      updated_at: alert.updatedAt,
      subject: {
        id: alert.subject.id,
        code: alert.subject.code,
        full_name: alert.subject.fullName,
      },
      trigger_event: triggerEvent
        ? {
            id: triggerEvent.id,
            code: triggerEvent.code,
            type: triggerEvent.type,
            result: triggerEvent.result,
            created_at: triggerEvent.createdAt,
          }
        : null,
    };
  }

  async getOpen(userId: string, limit: number) {
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const areaIds = await this.areasService.resolveAreaIds(
      user.dataScopeLevel,
      user.areaId,
    );

    const qb = this.alertRepo
      .createQueryBuilder('alert')
      .innerJoinAndSelect('alert.subject', 'subject')
      .where('alert.status = :status', { status: AlertStatus.OPEN })
      .orderBy('alert.createdAt', 'DESC')
      .take(limit);

    if (areaIds !== null) {
      if (areaIds.length === 0) {
        return [];
      }
      qb.andWhere('subject.areaId IN (:...areaIds)', { areaIds });
    }

    const items = await qb.getMany();

    return items.map((alert) => ({
      id: alert.id,
      code: alert.code,
      type: alert.type,
      level: alert.level,
      status: alert.status,
      source: alert.source,
      created_at: alert.createdAt,
      subject: {
        id: alert.subject.id,
        code: alert.subject.code,
        full_name: alert.subject.fullName,
      },
    }));
  }

  async acknowledge(id: string, userId: string) {
    const alert = await this.alertRepo.findOneBy({ id });
    if (!alert) {
      throw new NotFoundException('Alert not found');
    }

    if (alert.status !== AlertStatus.OPEN) {
      throw new BadRequestException(
        'Only alerts with OPEN status can be acknowledged',
      );
    }

    alert.status = AlertStatus.ACKNOWLEDGED;
    const updated = await this.alertRepo.save(alert);

    return {
      id: updated.id,
      code: updated.code,
      type: updated.type,
      level: updated.level,
      status: updated.status,
      updated_at: updated.updatedAt,
    };
  }

  async resolve(id: string, userId: string) {
    const alert = await this.alertRepo.findOneBy({ id });
    if (!alert) {
      throw new NotFoundException('Alert not found');
    }

    if (
      alert.status !== AlertStatus.OPEN &&
      alert.status !== AlertStatus.ACKNOWLEDGED
    ) {
      throw new BadRequestException(
        'Only alerts with OPEN or ACKNOWLEDGED status can be resolved',
      );
    }

    alert.status = AlertStatus.RESOLVED;
    alert.resolvedAt = new Date();
    const updated = await this.alertRepo.save(alert);

    return {
      id: updated.id,
      code: updated.code,
      type: updated.type,
      level: updated.level,
      status: updated.status,
      resolved_at: updated.resolvedAt,
      updated_at: updated.updatedAt,
    };
  }

  async escalate(id: string, userId: string, dto: EscalateAlertDto) {
    const alert = await this.alertRepo.findOneBy({ id });
    if (!alert) {
      throw new NotFoundException('Alert not found');
    }

    if (
      alert.status !== AlertStatus.OPEN &&
      alert.status !== AlertStatus.ACKNOWLEDGED
    ) {
      throw new BadRequestException(
        'Only alerts with OPEN or ACKNOWLEDGED status can be escalated',
      );
    }

    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Generate case code
    const caseCode = `CA-${Date.now().toString(36).toUpperCase()}`;

    // Create new case
    const newCase = this.caseRepo.create({
      code: caseCode,
      subjectId: alert.subjectId,
      severity: alert.level,
      source: CaseSource.MANUAL_ESCALATE,
      escalatedFromAlertId: alert.id,
      escalationType: EscalationType.MANUAL,
      escalationReason: dto.reason || null,
      createdById: userId,
      createdByName: user.fullName,
      linkedEventIds: [alert.triggerEventId],
    });
    const savedCase = await this.caseRepo.save(newCase);

    // Update alert
    alert.status = AlertStatus.ESCALATED;
    alert.escalatedAt = new Date();
    alert.caseId = savedCase.id;
    const updatedAlert = await this.alertRepo.save(alert);

    return {
      alert: {
        id: updatedAlert.id,
        code: updatedAlert.code,
        type: updatedAlert.type,
        level: updatedAlert.level,
        status: updatedAlert.status,
        escalated_at: updatedAlert.escalatedAt,
        case_id: updatedAlert.caseId,
        updated_at: updatedAlert.updatedAt,
      },
      case: {
        id: savedCase.id,
        code: savedCase.code,
        subject_id: savedCase.subjectId,
        severity: savedCase.severity,
        source: savedCase.source,
        escalation_type: savedCase.escalationType,
        escalation_reason: savedCase.escalationReason,
        created_at: savedCase.createdAt,
      },
    };
  }

  // =========================================================================
  // Export to Excel
  // =========================================================================

  async exportExcel(userId: string, query: ListAlertsDto): Promise<Buffer> {
    const exportDto = { ...query, page: 1, limit: 5000 };
    const result = await this.list(userId, exportDto);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'SMTTS';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Cảnh báo');

    // Header row
    sheet.columns = [
      { header: 'STT', key: 'stt', width: 6 },
      { header: 'Mã', key: 'code', width: 18 },
      { header: 'Loại', key: 'type', width: 22 },
      { header: 'Mức độ', key: 'level', width: 14 },
      { header: 'Trạng thái', key: 'status', width: 16 },
      { header: 'Nguồn', key: 'source', width: 14 },
      { header: 'Đối tượng', key: 'subject', width: 28 },
      { header: 'Thời gian', key: 'created_at', width: 20 },
    ];

    // Style header row
    const headerRow = sheet.getRow(1);
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF9B1C1C' },
    };
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 22;

    const TYPE_LABEL: Record<string, string> = {
      CHECKIN_OVERDUE: 'Quá hạn điểm danh',
      FACE_MISMATCH_STREAK: 'Khuôn mặt không khớp liên tiếp',
      NFC_CCCD_MISMATCH: 'NFC CCCD không khớp',
      SEVERE_OVERDUE: 'Quá hạn nghiêm trọng',
      GEOFENCE_EXIT: 'Ra khỏi vùng',
      CURFEW_VIOLATION: 'Vi phạm giờ giới nghiêm',
    };

    const LEVEL_LABEL: Record<string, string> = {
      THAP: 'Thấp',
      TRUNG_BINH: 'Trung bình',
      CAO: 'Cao',
      KHAN_CAP: 'Khẩn cấp',
    };

    const STATUS_LABEL: Record<string, string> = {
      OPEN: 'Mở',
      ACKNOWLEDGED: 'Đã xác nhận',
      RESOLVED: 'Đã giải quyết',
      ESCALATED: 'Đã leo thang',
    };

    const SOURCE_LABEL: Record<string, string> = {
      DEFAULT: 'Mặc định',
      CUSTOM: 'Tùy chỉnh',
    };

    const formatDateTime = (iso: string | Date | null) => {
      if (!iso) return '';
      const d = new Date(iso);
      return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    };

    result.data.forEach((row, i) => {
      const dataRow = sheet.addRow({
        stt: i + 1,
        code: row.code,
        type: TYPE_LABEL[row.type] ?? row.type,
        level: LEVEL_LABEL[row.level] ?? row.level,
        status: STATUS_LABEL[row.status] ?? row.status,
        source: SOURCE_LABEL[row.source] ?? row.source,
        subject: row.subject?.full_name ?? '',
        created_at: formatDateTime(row.created_at),
      });
      dataRow.alignment = { vertical: 'middle' };
      if (i % 2 === 1) {
        dataRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF9F9F9' },
        };
      }
    });

    // Auto-filter on header row
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: sheet.columns.length },
    };

    // Freeze first row
    sheet.views = [{ state: 'frozen', ySplit: 1 }];

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
