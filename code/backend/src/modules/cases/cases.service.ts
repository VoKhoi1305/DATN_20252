import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as ExcelJS from 'exceljs';
import { Case, CaseStatus, CaseSource } from './entities/case.entity';
import { CaseNote } from './entities/case-note.entity';
import { User } from '../users/entities/user.entity';
import { AreasService } from '../areas/areas.service';
import { ListCasesDto } from './dto/list-cases.dto';
import { CreateCaseDto } from './dto/create-case.dto';
import { CloseCaseDto } from './dto/close-case.dto';
import { CreateNoteDto } from './dto/create-note.dto';

const SORTABLE_FIELDS: Record<string, string> = {
  created_at: 'c.created_at',
  severity: 'c.severity',
  status: 'c.status',
  code: 'c.code',
};

@Injectable()
export class CasesService {
  constructor(
    @InjectRepository(Case)
    private readonly caseRepo: Repository<Case>,
    @InjectRepository(CaseNote)
    private readonly noteRepo: Repository<CaseNote>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly areasService: AreasService,
  ) {}

  async list(userId: string, query: ListCasesDto) {
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) throw new NotFoundException('User not found');

    const scopeAreaIds = await this.areasService.resolveAreaIds(
      user.dataScopeLevel,
      user.areaId,
    );

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const offset = (page - 1) * limit;

    const qb = this.caseRepo
      .createQueryBuilder('c')
      .leftJoin('c.subject', 's')
      .leftJoin(User, 'assignee', 'assignee.id = c.assigneeId')
      .select([
        'c.id AS id',
        'c.code AS code',
        'c.severity AS severity',
        'c.status AS status',
        'c.source AS source',
        'c.description AS description',
        'c.escalation_type AS escalation_type',
        'c.created_at AS created_at',
        's.id AS subject_id',
        's.code AS subject_code',
        's.full_name AS subject_full_name',
        'assignee.full_name AS assignee_name',
      ]);

    // Area scope filter via subject
    if (scopeAreaIds !== null) {
      if (scopeAreaIds.length === 0) {
        return { data: [], total: 0, page, limit };
      }
      qb.andWhere('s.area_id IN (:...areaIds)', { areaIds: scopeAreaIds });
    }

    // Filters
    if (query.status) {
      qb.andWhere('c.status = :status', { status: query.status });
    }
    if (query.severity) {
      qb.andWhere('c.severity = :severity', { severity: query.severity });
    }
    if (query.source) {
      qb.andWhere('c.source = :source', { source: query.source });
    }
    if (query.subject_id) {
      qb.andWhere('c.subject_id = :subjectId', { subjectId: query.subject_id });
    }
    if (query.from) {
      qb.andWhere('c.created_at >= :from', { from: new Date(query.from) });
    }
    if (query.to) {
      const toDate = new Date(query.to);
      toDate.setHours(23, 59, 59, 999);
      qb.andWhere('c.created_at <= :to', { to: toDate });
    }

    // Count
    const countQb = qb.clone();
    const total = await countQb.getCount();

    // Sort
    const sortField = SORTABLE_FIELDS[query.sort ?? 'created_at'] ?? 'c.created_at';
    const sortOrder = (query.order ?? 'desc').toUpperCase() as 'ASC' | 'DESC';
    qb.orderBy(sortField, sortOrder);

    // Pagination
    qb.offset(offset).limit(limit);

    const rows = await qb.getRawMany();

    const data = rows.map((row) => ({
      id: row.id,
      code: row.code,
      severity: row.severity,
      status: row.status,
      source: row.source,
      description: row.description,
      escalation_type: row.escalation_type,
      created_at: row.created_at,
      subject: {
        id: row.subject_id,
        code: row.subject_code,
        full_name: row.subject_full_name,
      },
      assignee_name: row.assignee_name ?? null,
    }));

    return { data, total, page, limit };
  }

  async findOne(id: string) {
    const caseEntity = await this.caseRepo.findOne({
      where: { id },
      relations: ['subject'],
    });
    if (!caseEntity) throw new NotFoundException('Không tìm thấy vụ việc.');

    const notes = await this.noteRepo.find({
      where: { caseId: id },
      relations: ['author'],
      order: { createdAt: 'ASC' },
    });

    // Load assignee name if assigned
    let assigneeName: string | null = null;
    if (caseEntity.assigneeId) {
      const assignee = await this.userRepo.findOne({
        where: { id: caseEntity.assigneeId },
        select: ['id', 'fullName'],
      });
      assigneeName = assignee?.fullName ?? null;
    }

    return {
      id: caseEntity.id,
      code: caseEntity.code,
      severity: caseEntity.severity,
      status: caseEntity.status,
      source: caseEntity.source,
      description: caseEntity.description,
      escalated_from_alert_id: caseEntity.escalatedFromAlertId,
      escalation_type: caseEntity.escalationType,
      escalation_reason: caseEntity.escalationReason,
      escalation_rule_name: caseEntity.escalationRuleName,
      linked_event_ids: caseEntity.linkedEventIds,
      assignee_id: caseEntity.assigneeId,
      assignee_name: assigneeName,
      created_by_id: caseEntity.createdById,
      created_by_name: caseEntity.createdByName,
      closing_note: caseEntity.closingNote,
      closed_by_id: caseEntity.closedById,
      closed_at: caseEntity.closedAt,
      related_case_id: caseEntity.relatedCaseId,
      created_at: caseEntity.createdAt,
      updated_at: caseEntity.updatedAt,
      subject: caseEntity.subject
        ? {
            id: caseEntity.subject.id,
            code: caseEntity.subject.code,
            full_name: caseEntity.subject.fullName,
          }
        : null,
      notes: notes.map((n) => ({
        id: n.id,
        content: n.content,
        photos: n.photos,
        is_closing_note: n.isClosingNote,
        author_id: n.authorId,
        author_name: n.author?.fullName ?? null,
        created_at: n.createdAt,
      })),
    };
  }

  async create(userId: string, dto: CreateCaseDto) {
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) throw new NotFoundException('User not found');

    const code = `CA-${Date.now().toString(36).toUpperCase()}`;

    const caseEntity = this.caseRepo.create({
      code,
      subjectId: dto.subject_id,
      severity: dto.severity,
      source: CaseSource.MANUAL_NEW,
      description: dto.description ?? null,
      createdById: userId,
      createdByName: user.fullName,
    });

    const saved = await this.caseRepo.save(caseEntity);

    return {
      id: saved.id,
      code: saved.code,
      severity: saved.severity,
      status: saved.status,
      source: saved.source,
      created_at: saved.createdAt,
    };
  }

  async close(id: string, userId: string, dto: CloseCaseDto) {
    const caseEntity = await this.caseRepo.findOneBy({ id });
    if (!caseEntity) throw new NotFoundException('Không tìm thấy vụ việc.');

    if (caseEntity.status !== CaseStatus.OPEN) {
      throw new BadRequestException('Chỉ có thể đóng vụ việc đang mở.');
    }

    caseEntity.closingNote = dto.closing_note;
    caseEntity.closedById = userId;
    caseEntity.closedAt = new Date();
    caseEntity.status = CaseStatus.CLOSED;

    const saved = await this.caseRepo.save(caseEntity);

    return {
      id: saved.id,
      code: saved.code,
      status: saved.status,
      closed_at: saved.closedAt,
    };
  }

  async reopen(id: string, userId: string) {
    const oldCase = await this.caseRepo.findOneBy({ id });
    if (!oldCase) throw new NotFoundException('Không tìm thấy vụ việc.');

    if (oldCase.status !== CaseStatus.CLOSED) {
      throw new BadRequestException('Chỉ có thể mở lại vụ việc đã đóng.');
    }

    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) throw new NotFoundException('User not found');

    const code = `CA-${Date.now().toString(36).toUpperCase()}`;

    const newCase = this.caseRepo.create({
      code,
      subjectId: oldCase.subjectId,
      severity: oldCase.severity,
      source: CaseSource.MANUAL_NEW,
      relatedCaseId: oldCase.id,
      createdById: userId,
      createdByName: user.fullName,
    });

    const saved = await this.caseRepo.save(newCase);

    return {
      id: saved.id,
      code: saved.code,
      severity: saved.severity,
      status: saved.status,
      source: saved.source,
      related_case_id: saved.relatedCaseId,
      created_at: saved.createdAt,
    };
  }

  async getNotes(caseId: string) {
    const caseExists = await this.caseRepo.findOneBy({ id: caseId });
    if (!caseExists) throw new NotFoundException('Không tìm thấy vụ việc.');

    const notes = await this.noteRepo.find({
      where: { caseId },
      order: { createdAt: 'ASC' },
    });

    return notes.map((n) => ({
      id: n.id,
      content: n.content,
      photos: n.photos,
      is_closing_note: n.isClosingNote,
      author_id: n.authorId,
      author_name: null as string | null,
      created_at: n.createdAt,
    }));
  }

  async addNote(caseId: string, userId: string, dto: CreateNoteDto) {
    const caseExists = await this.caseRepo.findOneBy({ id: caseId });
    if (!caseExists) throw new NotFoundException('Không tìm thấy vụ việc.');

    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) throw new NotFoundException('User not found');

    const note = this.noteRepo.create({
      caseId,
      content: dto.content,
      authorId: userId,
    });

    const saved = await this.noteRepo.save(note);

    return {
      id: saved.id,
      content: saved.content,
      photos: saved.photos,
      is_closing_note: saved.isClosingNote,
      author_id: saved.authorId,
      author_name: user.fullName,
      created_at: saved.createdAt,
    };
  }

  // =========================================================================
  // Export to Excel
  // =========================================================================

  async exportExcel(userId: string, query: ListCasesDto): Promise<Buffer> {
    const exportDto = { ...query, page: 1, limit: 5000 };
    const result = await this.list(userId, exportDto);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'SMTTS';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Vụ việc');

    // Header row
    sheet.columns = [
      { header: 'STT', key: 'stt', width: 6 },
      { header: 'Mã', key: 'code', width: 18 },
      { header: 'Mức độ', key: 'severity', width: 14 },
      { header: 'Trạng thái', key: 'status', width: 14 },
      { header: 'Nguồn', key: 'source', width: 18 },
      { header: 'Đối tượng', key: 'subject', width: 28 },
      { header: 'Người tạo', key: 'assignee', width: 22 },
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

    const SEVERITY_LABEL: Record<string, string> = {
      THAP: 'Thấp',
      TRUNG_BINH: 'Trung bình',
      CAO: 'Cao',
      KHAN_CAP: 'Khẩn cấp',
    };

    const STATUS_LABEL: Record<string, string> = {
      OPEN: 'Mở',
      CLOSED: 'Đã đóng',
    };

    const SOURCE_LABEL: Record<string, string> = {
      AUTO: 'Tự động',
      MANUAL_ESCALATE: 'Leo thang thủ công',
      MANUAL_NEW: 'Tạo thủ công',
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
        severity: SEVERITY_LABEL[row.severity] ?? row.severity,
        status: STATUS_LABEL[row.status] ?? row.status,
        source: SOURCE_LABEL[row.source] ?? row.source,
        subject: row.subject?.full_name ?? '',
        assignee: row.assignee_name ?? '',
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
