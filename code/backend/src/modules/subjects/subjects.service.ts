import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets, DataSource } from 'typeorm';
import { createHash } from 'crypto';
import * as ExcelJS from 'exceljs';
import { Subject, SubjectLifecycle, Gender } from './entities/subject.entity';
import { SubjectFamily } from './entities/subject-family.entity';
import { SubjectLegal } from './entities/subject-legal.entity';
import { ScenarioAssignment } from './entities/scenario-assignment.entity';
import { ManagementScenario, ScenarioStatus } from '../scenarios/entities/management-scenario.entity';
import { User, UserRole, DataScopeLevel } from '../users/entities/user.entity';
import { AreasService } from '../areas/areas.service';
import { ListSubjectsDto } from './dto/list-subjects.dto';
import { CreateSubjectDto, CreateGender } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { TimelineQueryDto } from './dto/timeline-query.dto';

const SORTABLE_FIELDS: Record<string, string> = {
  ma_ho_so: 's.code',
  full_name: 's.full_name',
  scenario_name: 'scenario.name',
  status: 's.lifecycle',
  created_at: 's.created_at',
};

// Maps frontend lifecycle values to entity enum
const LIFECYCLE_MAP: Record<string, string> = {
  INIT: 'KHOI_TAO',
  ENROLLED: 'ENROLLMENT',
  ACTIVE: 'DANG_QUAN_LY',
  REINTEGRATE: 'TAI_HOA_NHAP',
  ENDED: 'KET_THUC',
};

// Maps entity lifecycle to API response status
const LIFECYCLE_REVERSE_MAP: Record<string, string> = {
  KHOI_TAO: 'INIT',
  ENROLLMENT: 'ENROLLED',
  DANG_QUAN_LY: 'ACTIVE',
  TAI_HOA_NHAP: 'REINTEGRATE',
  KET_THUC: 'ENDED',
};

const ROLES_THAT_CAN_EXPAND_SCOPE = [
  UserRole.CAN_BO_QUAN_LY,
  UserRole.LANH_DAO,
  UserRole.IT_ADMIN,
];

@Injectable()
export class SubjectsService {
  constructor(
    @InjectRepository(Subject)
    private readonly subjectRepo: Repository<Subject>,
    @InjectRepository(SubjectFamily)
    private readonly familyRepo: Repository<SubjectFamily>,
    @InjectRepository(SubjectLegal)
    private readonly legalRepo: Repository<SubjectLegal>,
    @InjectRepository(ScenarioAssignment)
    private readonly assignmentRepo: Repository<ScenarioAssignment>,
    @InjectRepository(ManagementScenario)
    private readonly scenarioRepo: Repository<ManagementScenario>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly areasService: AreasService,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(dto: ListSubjectsDto, userId: string) {
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) throw new NotFoundException('User not found');

    // Scope check
    if (dto.scope === 'all' && !ROLES_THAT_CAN_EXPAND_SCOPE.includes(user.role)) {
      throw new ForbiddenException('Bạn không có quyền tìm kiếm toàn hệ thống.');
    }

    const useSystemScope = dto.scope === 'all' && ROLES_THAT_CAN_EXPAND_SCOPE.includes(user.role);
    const scopeAreaIds = useSystemScope
      ? null
      : await this.areasService.resolveAreaIds(user.dataScopeLevel, user.areaId);

    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    const offset = (page - 1) * limit;

    // Build query
    const qb = this.subjectRepo
      .createQueryBuilder('s')
      .leftJoin(
        ScenarioAssignment,
        'sa',
        "sa.subject_id = s.id AND sa.status = 'ACTIVE'",
      )
      .leftJoin(
        ManagementScenario,
        'scenario',
        'scenario.id = sa.scenario_id',
      )
      .leftJoin(User, 'officer', 'officer.id = s.created_by_id')
      .leftJoin('s.area', 'area')
      .select([
        's.id AS id',
        's.code AS ma_ho_so',
        's.full_name AS full_name',
        's.cccd_encrypted AS cccd_encrypted',
        's.date_of_birth AS date_of_birth',
        's.address AS address',
        's.phone AS phone',
        's.lifecycle AS lifecycle',
        'scenario.id AS scenario_id',
        'scenario.name AS scenario_name',
        'area.name AS area_name',
        'officer.full_name AS officer_name',
        's.created_at AS created_at',
        's.updated_at AS updated_at',
      ])
      .where('s.deleted_at IS NULL');

    // Area scope filter
    if (scopeAreaIds !== null) {
      if (scopeAreaIds.length === 0) {
        return { data: [], total: 0, page, limit };
      }
      qb.andWhere('s.area_id IN (:...areaIds)', { areaIds: scopeAreaIds });
    }

    // Status filter
    if (dto.status) {
      const mapped = LIFECYCLE_MAP[dto.status];
      if (mapped) {
        qb.andWhere('s.lifecycle = :lifecycle', { lifecycle: mapped });
      }
    }

    // Scenario filter
    if (dto.scenario_id) {
      qb.andWhere('scenario.id = :scenarioId', { scenarioId: dto.scenario_id });
    }

    // Date range filter
    if (dto.from) {
      qb.andWhere('s.created_at >= :from', { from: new Date(dto.from) });
    }
    if (dto.to) {
      const toDate = new Date(dto.to);
      toDate.setHours(23, 59, 59, 999);
      qb.andWhere('s.created_at <= :to', { to: toDate });
    }

    // Search (fuzzy ~, exact =, NOT !)
    if (dto.q) {
      const searchTerm = dto.q;
      if (searchTerm.startsWith('~')) {
        const term = `%${searchTerm.slice(1)}%`;
        qb.andWhere(
          new Brackets((sub) => {
            sub
              .where('s.full_name ILIKE :term', { term })
              .orWhere('s.code ILIKE :term', { term })
              .orWhere('s.cccd_encrypted ILIKE :term', { term })
              .orWhere('s.phone ILIKE :term', { term })
              .orWhere('s.address ILIKE :term', { term });
          }),
        );
      } else if (searchTerm.startsWith('!')) {
        const term = `%${searchTerm.slice(1)}%`;
        qb.andWhere('s.full_name NOT ILIKE :term', { term });
      } else {
        const term = `%${searchTerm}%`;
        qb.andWhere(
          new Brackets((sub) => {
            sub
              .where('s.full_name ILIKE :term', { term })
              .orWhere('s.code ILIKE :term', { term })
              .orWhere('s.cccd_encrypted ILIKE :term', { term })
              .orWhere('s.phone ILIKE :term', { term })
              .orWhere('s.address ILIKE :term', { term });
          }),
        );
      }
    }

    // Advanced search conditions
    if (dto.advanced === 'true' && dto.conditions) {
      try {
        const conditions = JSON.parse(dto.conditions) as Array<{
          field: string;
          operator: string;
          value: string;
          connector?: string;
        }>;

        conditions.forEach((cond, idx) => {
          const paramKey = `adv_${idx}`;
          const fieldMap: Record<string, string> = {
            ho_ten: 's.full_name',
            cccd: 's.cccd_encrypted',
            ma_ho_so: 's.code',
            trang_thai: 's.lifecycle',
            dia_ban: 'area.name',
            ngay_tao: 's.created_at',
            sdt: 's.phone',
            dia_chi: 's.address',
          };

          const dbField = fieldMap[cond.field];
          if (!dbField) return;

          let value = cond.value;
          if (cond.field === 'trang_thai') {
            value = LIFECYCLE_MAP[value] || value;
          }

          if (cond.operator === '~') {
            qb.andWhere(`${dbField} ILIKE :${paramKey}`, {
              [paramKey]: `%${value}%`,
            });
          } else if (cond.operator === '=') {
            qb.andWhere(`${dbField} = :${paramKey}`, {
              [paramKey]: value,
            });
          } else if (cond.operator === '!=') {
            qb.andWhere(`${dbField} != :${paramKey}`, {
              [paramKey]: value,
            });
          } else if (cond.operator === '>') {
            qb.andWhere(`${dbField} > :${paramKey}`, {
              [paramKey]: value,
            });
          } else if (cond.operator === '<') {
            qb.andWhere(`${dbField} < :${paramKey}`, {
              [paramKey]: value,
            });
          }
        });
      } catch {
        // Invalid conditions JSON — ignore
      }
    }

    // Count
    const countQb = qb.clone();
    const total = await countQb.getCount();

    // Sort
    const sortField = SORTABLE_FIELDS[dto.sort ?? 'created_at'] ?? 's.created_at';
    const sortOrder = (dto.order ?? 'desc').toUpperCase() as 'ASC' | 'DESC';
    qb.orderBy(sortField, sortOrder);

    // Pagination
    qb.offset(offset).limit(limit);

    const rows = await qb.getRawMany();

    // Determine if CCCD should be masked
    const shouldMask =
      user.role === UserRole.CAN_BO_CO_SO ||
      user.role === UserRole.SUBJECT;

    const data = rows.map((row) => ({
      id: row.id,
      ma_ho_so: row.ma_ho_so,
      full_name: row.full_name,
      cccd: this.formatCccd(row.cccd_encrypted, shouldMask),
      date_of_birth: row.date_of_birth,
      address: row.address,
      phone: row.phone,
      status: LIFECYCLE_REVERSE_MAP[row.lifecycle] ?? row.lifecycle,
      scenario_id: row.scenario_id ?? null,
      scenario_name: row.scenario_name ?? null,
      area_name: row.area_name ?? null,
      officer_name: row.officer_name ?? null,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));

    return {
      data,
      total,
      page,
      limit,
    };
  }

  async getActiveScenarios() {
    const scenarios = await this.scenarioRepo.find({
      where: { status: ScenarioStatus.ACTIVE },
      select: ['id', 'code', 'name'],
      order: { name: 'ASC' },
    });

    return { data: scenarios };
  }

  // =========================================================================
  // Subject self-access (mobile app)
  // =========================================================================

  /**
   * Get the current subject's own profile by their user account ID.
   * No area scope check needed — subjects can always view their own data.
   */
  async findMe(userId: string) {
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) throw new NotFoundException('User not found');

    const subject = await this.subjectRepo.findOne({
      where: { userAccountId: userId },
      relations: ['area'],
    });
    if (!subject) {
      throw new NotFoundException({
        code: 'SUBJECT_NOT_FOUND',
        message: 'Không tìm thấy hồ sơ đối tượng liên kết với tài khoản này',
      });
    }

    // No scope check — self-access is always allowed

    const shouldMask = true; // subjects always see masked CCCD

    const family = await this.familyRepo.findOneBy({ subjectId: subject.id });
    const legal = await this.legalRepo.findOneBy({ subjectId: subject.id });

    const assignment = await this.assignmentRepo.findOne({
      where: { subjectId: subject.id, status: 'ACTIVE' as any },
    });
    let scenario: ManagementScenario | null = null;
    if (assignment) {
      scenario = await this.scenarioRepo.findOneBy({ id: assignment.scenarioId });
    }

    const officer = await this.userRepo.findOne({
      where: { id: subject.createdById },
      select: ['id', 'fullName'],
    });

    return {
      id: subject.id,
      ma_ho_so: subject.code,
      full_name: subject.fullName,
      cccd: this.formatCccd(subject.cccdEncrypted, shouldMask),
      date_of_birth: subject.dateOfBirth,
      gender: subject.gender,
      ethnicity: subject.ethnicity,
      address: subject.address,
      permanent_address: subject.permanentAddress,
      phone: subject.phone,
      photo_url: subject.photoUrl,
      area: subject.area
        ? { id: subject.area.id, name: subject.area.name, level: subject.area.level }
        : null,
      status: LIFECYCLE_REVERSE_MAP[subject.lifecycle] ?? subject.lifecycle,
      lifecycle: subject.lifecycle,
      compliance_rate: subject.complianceRate,
      enrollment_date: subject.enrollmentDate,
      notes: subject.notes,
      custom_fields: subject.customFields,
      officer: officer ? { id: officer.id, full_name: officer.fullName } : null,
      scenario: scenario
        ? {
            id: scenario.id,
            name: scenario.name,
            checkin_frequency: scenario.checkinFrequency,
            assigned_at: assignment!.assignedAt,
          }
        : null,
      family: family
        ? {
            father_name: family.fatherName,
            mother_name: family.motherName,
            spouse_name: family.spouseName,
            dependents: family.dependents,
            notes: family.familyNotes,
          }
        : null,
      legal: legal
        ? {
            decision_number: legal.decisionNumber,
            decision_date: legal.decisionDate,
            management_type: legal.managementType,
            start_date: legal.startDate,
            end_date: legal.endDate,
            issuing_authority: legal.issuingAuthority,
            notes: legal.legalNotes,
          }
        : null,
      created_at: subject.createdAt,
      updated_at: subject.updatedAt,
    };
  }

  /**
   * Get documents for the current subject (self-access, public docs only).
   */
  async getMyDocuments(userId: string) {
    const subject = await this.subjectRepo.findOne({
      where: { userAccountId: userId },
    });
    if (!subject) {
      throw new NotFoundException('Không tìm thấy hồ sơ đối tượng');
    }

    const documents = await this.dataSource.query(
      `SELECT f.id, f.original_name, f.stored_path, f.mime_type, f.size, f.file_type,
              f.uploaded_by_id, u.full_name AS uploaded_by_name, f.created_at,
              COALESCE(f.is_public, false) AS is_public
       FROM files f
       LEFT JOIN users u ON u.id = f.uploaded_by_id
       WHERE f.entity_type = 'SUBJECT' AND f.entity_id = $1
         AND f.deleted_at IS NULL
         AND (f.is_public = true OR f.file_type = 'FACE_PHOTO')
       ORDER BY f.created_at DESC`,
      [subject.id],
    );

    return { data: documents };
  }

  // =========================================================================
  // SCR-021: Subject Detail
  // =========================================================================

  async findOne(id: string, userId: string) {
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) throw new NotFoundException('User not found');

    const subject = await this.subjectRepo.findOne({
      where: { id },
      relations: ['area'],
    });
    if (!subject) throw new NotFoundException('Không tìm thấy hồ sơ.');

    // Scope check
    await this.checkAreaScope(user, subject.areaId);

    // Determine masking
    const shouldMask =
      user.role === UserRole.CAN_BO_CO_SO ||
      user.role === UserRole.SUBJECT;

    // Load related data
    const family = await this.familyRepo.findOneBy({ subjectId: id });
    const legal = await this.legalRepo.findOneBy({ subjectId: id });

    // Load active scenario assignment
    const assignment = await this.assignmentRepo.findOne({
      where: { subjectId: id, status: 'ACTIVE' as any },
    });
    let scenario: ManagementScenario | null = null;
    if (assignment) {
      scenario = await this.scenarioRepo.findOneBy({ id: assignment.scenarioId });
    }

    // Load created-by officer
    const officer = await this.userRepo.findOne({
      where: { id: subject.createdById },
      select: ['id', 'fullName'],
    });

    return {
      id: subject.id,
      ma_ho_so: subject.code,
      full_name: subject.fullName,
      cccd: this.formatCccd(subject.cccdEncrypted, shouldMask),
      date_of_birth: subject.dateOfBirth,
      gender: subject.gender,
      ethnicity: subject.ethnicity,
      address: subject.address,
      permanent_address: subject.permanentAddress,
      phone: subject.phone,
      photo_url: subject.photoUrl,
      area: subject.area
        ? { id: subject.area.id, name: subject.area.name, level: subject.area.level }
        : null,
      status: LIFECYCLE_REVERSE_MAP[subject.lifecycle] ?? subject.lifecycle,
      lifecycle: subject.lifecycle,
      compliance_rate: subject.complianceRate,
      enrollment_date: subject.enrollmentDate,
      notes: subject.notes,
      custom_fields: subject.customFields,
      officer: officer ? { id: officer.id, full_name: officer.fullName } : null,
      scenario: scenario
        ? {
            id: scenario.id,
            name: scenario.name,
            checkin_frequency: scenario.checkinFrequency,
            assigned_at: assignment!.assignedAt,
          }
        : null,
      family: family
        ? {
            father_name: family.fatherName,
            mother_name: family.motherName,
            spouse_name: family.spouseName,
            dependents: family.dependents,
            notes: family.familyNotes,
          }
        : null,
      legal: legal
        ? {
            decision_number: legal.decisionNumber,
            decision_date: legal.decisionDate,
            management_type: legal.managementType,
            start_date: legal.startDate,
            end_date: legal.endDate,
            issuing_authority: legal.issuingAuthority,
            notes: legal.legalNotes,
          }
        : null,
      created_at: subject.createdAt,
      updated_at: subject.updatedAt,
    };
  }

  // =========================================================================
  // SCR-022: Create Subject
  // =========================================================================

  async create(dto: CreateSubjectDto, userId: string) {
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) throw new NotFoundException('User not found');

    // Validate CCCD uniqueness via hash
    const cccdHash = createHash('sha256').update(dto.cccd).digest('hex');
    const existing = await this.subjectRepo.findOne({
      where: { cccdHash },
      // withDeleted: false (default) — cho phép tái sử dụng CCCD của hồ sơ đã bị xóa
    });
    if (existing) {
      throw new ConflictException('Số CCCD đã tồn tại trong hệ thống.');
    }

    // Generate code: HS-YYYY-NNNN
    const code = await this.generateCode();

    // Map gender
    const genderMap: Record<string, Gender> = {
      MALE: Gender.MALE,
      FEMALE: Gender.FEMALE,
      OTHER: Gender.FEMALE, // fallback; entity only has MALE/FEMALE
    };

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Create subject
      const subject = this.subjectRepo.create({
        code,
        fullName: dto.full_name,
        cccdEncrypted: dto.cccd, // In production: encrypt(dto.cccd)
        cccdHash,
        dateOfBirth: new Date(dto.date_of_birth),
        gender: genderMap[dto.gender] ?? Gender.MALE,
        ethnicity: dto.ethnicity ?? null,
        address: dto.address,
        permanentAddress: dto.permanent_address ?? null,
        phone: dto.phone ?? null,
        areaId: dto.area_id,
        lifecycle: SubjectLifecycle.KHOI_TAO,
        notes: dto.notes ?? null,
        createdById: userId,
      });
      const saved = await queryRunner.manager.save(Subject, subject);

      // Create family record if provided
      if (dto.family) {
        const family = this.familyRepo.create({
          subjectId: saved.id,
          fatherName: dto.family.contact_name ?? null,
          motherName: null,
          spouseName: null,
          dependents: 0,
          familyNotes: dto.family.notes ?? null,
        });
        await queryRunner.manager.save(SubjectFamily, family);
      }

      // Create legal record if provided
      if (dto.legal) {
        const legal = this.legalRepo.create({
          subjectId: saved.id,
          decisionNumber: dto.legal.document_number ?? null,
          decisionDate: dto.legal.document_date ? new Date(dto.legal.document_date) : null,
          managementType: dto.legal.management_duration ?? 'STANDARD',
          startDate: dto.legal.start_date ? new Date(dto.legal.start_date) : new Date(),
          endDate: dto.legal.end_date ? new Date(dto.legal.end_date) : null,
          issuingAuthority: dto.legal.authority ?? null,
          legalNotes: dto.legal.reason ?? null,
        });
        await queryRunner.manager.save(SubjectLegal, legal);
      }

      await queryRunner.commitTransaction();

      return {
        id: saved.id,
        ma_ho_so: saved.code,
        full_name: saved.fullName,
        status: LIFECYCLE_REVERSE_MAP[saved.lifecycle] ?? saved.lifecycle,
        created_at: saved.createdAt,
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  // =========================================================================
  // SCR-023: Update Subject
  // =========================================================================

  async update(id: string, dto: UpdateSubjectDto, userId: string) {
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) throw new NotFoundException('User not found');

    const subject = await this.subjectRepo.findOneBy({ id });
    if (!subject) throw new NotFoundException('Không tìm thấy hồ sơ.');

    // Scope check
    await this.checkAreaScope(user, subject.areaId);

    const genderMap: Record<string, Gender> = {
      MALE: Gender.MALE,
      FEMALE: Gender.FEMALE,
      OTHER: Gender.FEMALE,
    };

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Update subject fields (only dirty fields)
      const updates: Partial<Subject> = {};
      if (dto.full_name !== undefined) updates.fullName = dto.full_name;
      if (dto.date_of_birth !== undefined) updates.dateOfBirth = new Date(dto.date_of_birth) as any;
      if (dto.gender !== undefined) updates.gender = genderMap[dto.gender] ?? Gender.MALE;
      if (dto.address !== undefined) updates.address = dto.address;
      if (dto.phone !== undefined) updates.phone = dto.phone ?? null;
      if (dto.area_id !== undefined) updates.areaId = dto.area_id;
      if (dto.ethnicity !== undefined) updates.ethnicity = dto.ethnicity ?? null;
      if (dto.permanent_address !== undefined) updates.permanentAddress = dto.permanent_address ?? null;
      if (dto.notes !== undefined) updates.notes = dto.notes ?? null;

      if (Object.keys(updates).length > 0) {
        await queryRunner.manager.update(Subject, id, updates as any);
      }

      // Update family if provided
      if (dto.family) {
        let family = await this.familyRepo.findOneBy({ subjectId: id });
        if (family) {
          const familyUpdates: Partial<SubjectFamily> = {};
          if (dto.family.contact_name !== undefined) familyUpdates.fatherName = dto.family.contact_name ?? null;
          if (dto.family.notes !== undefined) familyUpdates.familyNotes = dto.family.notes ?? null;
          if (Object.keys(familyUpdates).length > 0) {
            await queryRunner.manager.update(SubjectFamily, family.id, familyUpdates as any);
          }
        } else {
          family = this.familyRepo.create({
            subjectId: id,
            fatherName: dto.family.contact_name ?? null,
            motherName: null,
            spouseName: null,
            dependents: 0,
            familyNotes: dto.family.notes ?? null,
          });
          await queryRunner.manager.save(SubjectFamily, family);
        }
      }

      // Update legal if provided
      if (dto.legal) {
        let legal = await this.legalRepo.findOneBy({ subjectId: id });
        if (legal) {
          const legalUpdates: Partial<SubjectLegal> = {};
          if (dto.legal.document_number !== undefined) legalUpdates.decisionNumber = dto.legal.document_number ?? null;
          if (dto.legal.document_date !== undefined) legalUpdates.decisionDate = dto.legal.document_date ? new Date(dto.legal.document_date) as any : null;
          if (dto.legal.authority !== undefined) legalUpdates.issuingAuthority = dto.legal.authority ?? null;
          if (dto.legal.management_duration !== undefined) legalUpdates.managementType = dto.legal.management_duration;
          if (dto.legal.start_date !== undefined) legalUpdates.startDate = dto.legal.start_date ? new Date(dto.legal.start_date) as any : null;
          if (dto.legal.end_date !== undefined) legalUpdates.endDate = dto.legal.end_date ? new Date(dto.legal.end_date) as any : null;
          if (dto.legal.reason !== undefined) legalUpdates.legalNotes = dto.legal.reason ?? null;
          if (Object.keys(legalUpdates).length > 0) {
            await queryRunner.manager.update(SubjectLegal, legal.id, legalUpdates as any);
          }
        } else {
          legal = this.legalRepo.create({
            subjectId: id,
            decisionNumber: dto.legal.document_number ?? null,
            decisionDate: dto.legal.document_date ? new Date(dto.legal.document_date) : null,
            managementType: dto.legal.management_duration ?? 'STANDARD',
            startDate: dto.legal.start_date ? new Date(dto.legal.start_date) : new Date(),
            endDate: dto.legal.end_date ? new Date(dto.legal.end_date) : null,
            issuingAuthority: dto.legal.authority ?? null,
            legalNotes: dto.legal.reason ?? null,
          });
          await queryRunner.manager.save(SubjectLegal, legal);
        }
      }

      await queryRunner.commitTransaction();

      const updated = await this.subjectRepo.findOneBy({ id });
      return {
        id: updated!.id,
        ma_ho_so: updated!.code,
        full_name: updated!.fullName,
        status: LIFECYCLE_REVERSE_MAP[updated!.lifecycle] ?? updated!.lifecycle,
        updated_at: updated!.updatedAt,
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  // =========================================================================
  // Export to Excel
  // =========================================================================

  async exportExcel(dto: ListSubjectsDto, userId: string): Promise<Buffer> {
    // Re-use findAll but with a high limit to get all matching records
    const exportDto = { ...dto, page: 1, limit: 5000 };
    const result = await this.findAll(exportDto, userId);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'SMTTS';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Hồ sơ đối tượng');

    // Header row
    sheet.columns = [
      { header: 'STT', key: 'stt', width: 6 },
      { header: 'Mã hồ sơ', key: 'ma_ho_so', width: 16 },
      { header: 'Họ tên', key: 'full_name', width: 28 },
      { header: 'CCCD', key: 'cccd', width: 16 },
      { header: 'Ngày sinh', key: 'date_of_birth', width: 14 },
      { header: 'Địa chỉ', key: 'address', width: 36 },
      { header: 'SĐT', key: 'phone', width: 14 },
      { header: 'Kịch bản', key: 'scenario_name', width: 22 },
      { header: 'Trạng thái', key: 'status', width: 16 },
      { header: 'Ngày tạo', key: 'created_at', width: 14 },
    ];

    // Style header row
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, size: 11 };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF9B1C1C' },
    };
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 22;

    const STATUS_LABEL: Record<string, string> = {
      INIT: 'Khởi tạo',
      ENROLLED: 'Đã đăng ký',
      ACTIVE: 'Đang quản lý',
      REINTEGRATE: 'Tái hòa nhập',
      ENDED: 'Kết thúc',
    };

    const formatDate = (iso: string | null) => {
      if (!iso) return '';
      const d = new Date(iso);
      return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    };

    result.data.forEach((row, i) => {
      const dataRow = sheet.addRow({
        stt: i + 1,
        ma_ho_so: row.ma_ho_so,
        full_name: row.full_name,
        cccd: row.cccd,
        date_of_birth: formatDate(row.date_of_birth),
        address: row.address ?? '',
        phone: row.phone ?? '',
        scenario_name: row.scenario_name ?? '',
        status: STATUS_LABEL[row.status] ?? row.status,
        created_at: formatDate(row.created_at),
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

  // =========================================================================
  // SCR-024: CCCD Check
  // =========================================================================

  async checkCccd(cccd: string) {
    if (!cccd || !/^\d{12}$/.test(cccd)) {
      throw new BadRequestException('CCCD phải có đúng 12 chữ số.');
    }

    const cccdHash = createHash('sha256').update(cccd).digest('hex');
    const subject = await this.subjectRepo.findOne({
      where: { cccdHash },
      select: ['id', 'fullName'],
    });

    if (subject) {
      return { exists: true, subject_id: subject.id, full_name: subject.fullName };
    }
    return { exists: false };
  }

  // =========================================================================
  // SCR-021: Timeline (events + alerts)
  // =========================================================================

  async getTimeline(subjectId: string, userId: string, query: TimelineQueryDto) {
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) throw new NotFoundException('User not found');

    const subject = await this.subjectRepo.findOneBy({ id: subjectId });
    if (!subject) throw new NotFoundException('Không tìm thấy hồ sơ.');

    await this.checkAreaScope(user, subject.areaId);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const offset = (page - 1) * limit;

    // Combine events and alerts into a timeline using UNION ALL
    const rawQuery = `
      SELECT * FROM (
        SELECT
          e.id,
          e.code,
          'EVENT' AS source,
          e.type,
          e.result AS detail,
          e.created_at
        FROM events e
        WHERE e.subject_id = $1

        UNION ALL

        SELECT
          a.id,
          a.code,
          'ALERT' AS source,
          a.type,
          a.level AS detail,
          a.created_at
        FROM alerts a
        WHERE a.subject_id = $2
      ) timeline
      ORDER BY timeline.created_at DESC
      LIMIT $3 OFFSET $4
    `;

    const countQuery = `
      SELECT (
        (SELECT COUNT(*) FROM events WHERE subject_id = $1) +
        (SELECT COUNT(*) FROM alerts WHERE subject_id = $1)
      )::int AS total
    `;

    const [rows, countResult] = await Promise.all([
      this.dataSource.query(rawQuery, [subjectId, subjectId, limit, offset]),
      this.dataSource.query(countQuery, [subjectId]),
    ]);

    const total = countResult[0]?.total ?? 0;

    return {
      data: rows,
      total,
      page,
      limit,
    };
  }

  // =========================================================================
  // SCR-021: Devices
  // =========================================================================

  async getDevices(subjectId: string, userId: string) {
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) throw new NotFoundException('User not found');

    const subject = await this.subjectRepo.findOneBy({ id: subjectId });
    if (!subject) throw new NotFoundException('Không tìm thấy hồ sơ.');

    await this.checkAreaScope(user, subject.areaId);

    const devices = await this.dataSource.query(
      `SELECT id, device_id, device_model, os_version, status, enrolled_at, replaced_at, created_at
       FROM devices
       WHERE subject_id = $1
       ORDER BY enrolled_at DESC`,
      [subjectId],
    );

    const current = devices.find((d: any) => d.status === 'ACTIVE') ?? null;
    const history = devices.filter((d: any) => d.status !== 'ACTIVE');

    return { current, history };
  }

  // =========================================================================
  // SCR-021: Documents
  // =========================================================================

  async getDocuments(subjectId: string, userId: string) {
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) throw new NotFoundException('User not found');

    const subject = await this.subjectRepo.findOneBy({ id: subjectId });
    if (!subject) throw new NotFoundException('Không tìm thấy hồ sơ.');

    await this.checkAreaScope(user, subject.areaId);

    const documents = await this.dataSource.query(
      `SELECT f.id, f.original_name, f.stored_path, f.mime_type, f.size, f.file_type,
              f.uploaded_by_id, u.full_name AS uploaded_by_name, f.created_at,
              COALESCE(f.is_public, false) AS is_public
       FROM files f
       LEFT JOIN users u ON u.id = f.uploaded_by_id
       WHERE f.entity_type = 'SUBJECT' AND f.entity_id = $1 AND f.deleted_at IS NULL
       ORDER BY f.created_at DESC`,
      [subjectId],
    );

    return { data: documents };
  }

  // =========================================================================
  // SCR-021: Upload Document
  // =========================================================================

  async uploadDocument(
    subjectId: string,
    file: Express.Multer.File,
    fileType: string,
    userId: string,
    isPublic = false,
  ) {
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) throw new NotFoundException('User not found');

    const subject = await this.subjectRepo.findOneBy({ id: subjectId });
    if (!subject) throw new NotFoundException('Không tìm thấy hồ sơ.');

    await this.checkAreaScope(user, subject.areaId);

    // Store file to disk
    const fs = await import('fs/promises');
    const path = await import('path');
    const uploadDir = path.join(process.cwd(), 'uploads', 'subjects', subjectId);
    await fs.mkdir(uploadDir, { recursive: true });

    const ext = path.extname(file.originalname);
    const storedName = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    const storedPath = path.join(uploadDir, storedName);
    await fs.writeFile(storedPath, file.buffer);

    const relativePath = `/uploads/subjects/${subjectId}/${storedName}`;

    // Insert record into files table
    const result = await this.dataSource.query(
      `INSERT INTO files (original_name, stored_path, mime_type, size, file_type, entity_type, entity_id, uploaded_by_id, is_public)
       VALUES ($1, $2, $3, $4, $5, 'SUBJECT', $6, $7, $8)
       RETURNING id, original_name, stored_path, mime_type, size, file_type, created_at, is_public`,
      [
        file.originalname,
        relativePath,
        file.mimetype,
        file.size,
        fileType,
        subjectId,
        userId,
        isPublic,
      ],
    );

    return result[0];
  }

  async deleteDocument(subjectId: string, docId: string, userId: string) {
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) throw new NotFoundException('User not found');

    const subject = await this.subjectRepo.findOneBy({ id: subjectId });
    if (!subject) throw new NotFoundException('Không tìm thấy hồ sơ.');

    await this.checkAreaScope(user, subject.areaId);

    const result = await this.dataSource.query(
      `UPDATE files SET deleted_at = NOW()
       WHERE id = $1 AND entity_type = 'SUBJECT' AND entity_id = $2 AND deleted_at IS NULL
       RETURNING id`,
      [docId, subjectId],
    );

    if (result[0]?.length === 0) {
      throw new NotFoundException('Không tìm thấy tài liệu.');
    }

    return { success: true };
  }

  // =========================================================================
  // Delete Subject (soft-delete)
  // =========================================================================

  async deleteSubject(id: string, userId: string) {
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) throw new NotFoundException('User not found');

    // Chỉ IT_ADMIN và LANH_DAO mới có quyền xóa hồ sơ
    const allowedRoles = [UserRole.IT_ADMIN, UserRole.LANH_DAO];
    if (!allowedRoles.includes(user.role)) {
      throw new ForbiddenException('Bạn không có quyền xóa hồ sơ.');
    }

    const subject = await this.subjectRepo.findOneBy({ id });
    if (!subject) throw new NotFoundException('Không tìm thấy hồ sơ.');

    // Soft-delete: cập nhật deleted_at, không xóa vật lý
    // CCCD hash sẽ KHÔNG được tính vào kiểm tra trùng lặp khi tạo mới
    await this.subjectRepo.softDelete(id);

    return { success: true, message: 'Đã xóa hồ sơ thành công.' };
  }

  // =========================================================================
  // Scenario Assignment
  // =========================================================================

  async assignScenario(subjectId: string, scenarioId: string, userId: string) {
    const subject = await this.subjectRepo.findOneBy({ id: subjectId });
    if (!subject) throw new NotFoundException('Không tìm thấy hồ sơ.');

    const scenario = await this.scenarioRepo.findOneBy({ id: scenarioId });
    if (!scenario) throw new NotFoundException('Không tìm thấy kịch bản.');

    if (scenario.status !== 'ACTIVE') {
      throw new BadRequestException('Kịch bản phải ở trạng thái "Đang hoạt động" để gán.');
    }

    // Deactivate any existing active assignment
    await this.assignmentRepo.update(
      { subjectId, status: 'ACTIVE' as any },
      { status: 'INACTIVE' as any, unassignedAt: new Date() },
    );

    // Create new assignment
    const assignment = this.assignmentRepo.create({
      subjectId,
      scenarioId,
      assignedById: userId,
      status: 'ACTIVE' as any,
      assignedAt: new Date(),
    });
    await this.assignmentRepo.save(assignment);

    return { success: true, assignment_id: assignment.id };
  }

  async unassignScenario(subjectId: string, userId: string) {
    const result = await this.assignmentRepo.update(
      { subjectId, status: 'ACTIVE' as any },
      { status: 'INACTIVE' as any, unassignedAt: new Date() },
    );

    if (result.affected === 0) {
      throw new NotFoundException('Không tìm thấy gán kịch bản hoạt động.');
    }

    return { success: true };
  }

  // =========================================================================
  // Private helpers
  // =========================================================================

  /**
   * Check that the user has access to the given area.
   * Throws ForbiddenException if not.
   */
  private async checkAreaScope(user: User, subjectAreaId: string): Promise<void> {
    const scopeAreaIds = await this.areasService.resolveAreaIds(
      user.dataScopeLevel,
      user.areaId,
    );
    // null means SYSTEM scope — no restriction
    if (scopeAreaIds !== null && !scopeAreaIds.includes(subjectAreaId)) {
      throw new ForbiddenException('Bạn không có quyền truy cập hồ sơ này.');
    }
  }

  /**
   * Generate the next subject code: HS-YYYY-NNNN
   */
  private async generateCode(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `HS-${year}-`;

    const result = await this.dataSource.query(
      `SELECT code FROM subjects
       WHERE code LIKE $1
       ORDER BY code DESC
       LIMIT 1`,
      [`${prefix}%`],
    );

    let nextNum = 1;
    if (result.length > 0) {
      const lastCode = result[0].code as string;
      const lastNum = parseInt(lastCode.split('-').pop() ?? '0', 10);
      nextNum = lastNum + 1;
    }

    return `${prefix}${String(nextNum).padStart(4, '0')}`;
  }

  /**
   * Format/mask CCCD. In production, cccd_encrypted would be decrypted first.
   * For now, we treat the stored value as the plain CCCD (seed data stores plain).
   */
  private formatCccd(cccdEncrypted: string, mask: boolean): string {
    const cccd = cccdEncrypted; // In production: decrypt(cccdEncrypted)
    if (!mask || cccd.length < 10) return cccd;
    return cccd.slice(0, 6) + '****' + cccd.slice(-2);
  }
}
