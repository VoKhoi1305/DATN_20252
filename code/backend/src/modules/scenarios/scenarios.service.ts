import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ManagementScenario, ScenarioStatus } from './entities/management-scenario.entity';
import { Geofence } from '../geofences/entities/geofence.entity';
import { ScenarioAssignment } from '../subjects/entities/scenario-assignment.entity';
import { User } from '../users/entities/user.entity';
import { ListScenariosDto } from './dto/list-scenarios.dto';
import { CreateScenarioDto } from './dto/create-scenario.dto';
import { UpdateScenarioDto } from './dto/update-scenario.dto';
import { AlertRulesService } from '../alerts/alert-rules.service';
import { EscalationRulesService } from '../alerts/escalation-rules.service';

@Injectable()
export class ScenariosService {
  constructor(
    @InjectRepository(ManagementScenario)
    private readonly scenarioRepo: Repository<ManagementScenario>,
    @InjectRepository(Geofence)
    private readonly geofenceRepo: Repository<Geofence>,
    @InjectRepository(ScenarioAssignment)
    private readonly assignmentRepo: Repository<ScenarioAssignment>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly alertRulesService: AlertRulesService,
    private readonly escalationRulesService: EscalationRulesService,
  ) {}

  async findAll(dto: ListScenariosDto, userId: string) {
    const page = Math.max(1, parseInt(dto.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(dto.limit || '20', 10)));
    const offset = (page - 1) * limit;

    const qb = this.scenarioRepo.createQueryBuilder('s');

    if (dto.search) {
      qb.andWhere('(s.name ILIKE :s OR s.code ILIKE :s)', { s: `%${dto.search}%` });
    }

    if (dto.status) {
      qb.andWhere('s.status = :status', { status: dto.status });
    }

    qb.orderBy('s.created_at', 'DESC');

    const [data, total] = await qb.skip(offset).take(limit).getManyAndCount();

    // Get subject counts per scenario
    const scenarioIds = data.map((s) => s.id);
    const counts: Record<string, number> = {};
    if (scenarioIds.length > 0) {
      const countRows = await this.assignmentRepo
        .createQueryBuilder('sa')
        .select('sa.scenario_id', 'scenario_id')
        .addSelect('COUNT(*)', 'cnt')
        .where('sa.scenario_id IN (:...ids)', { ids: scenarioIds })
        .andWhere('sa.status = :st', { st: 'ACTIVE' })
        .groupBy('sa.scenario_id')
        .getRawMany();

      for (const row of countRows) {
        counts[row.scenario_id] = parseInt(row.cnt, 10);
      }
    }

    return {
      data: data.map((s) => this.toListResponse(s, counts[s.id] || 0)),
      total,
      page,
      limit,
    };
  }

  async findOne(id: string) {
    const scenario = await this.scenarioRepo.findOneBy({ id });
    if (!scenario) throw new NotFoundException('Scenario not found');

    // Get geofence info if linked
    let geofence: Geofence | null = null;
    if (scenario.geofenceId) {
      geofence = await this.geofenceRepo.findOneBy({ id: scenario.geofenceId });
    }

    // Get subject count
    const subjectCount = await this.assignmentRepo.count({
      where: { scenarioId: id, status: 'ACTIVE' as any },
    });

    return this.toDetailResponse(scenario, geofence, subjectCount);
  }

  async create(dto: CreateScenarioDto, userId: string) {
    const code = await this.generateCode();

    const scenario = this.scenarioRepo.create({
      code,
      name: dto.name,
      description: dto.description || null,
      status: ScenarioStatus.DRAFT,
      scope: dto.scope,
      checkinFrequency: dto.checkin_frequency,
      checkinWindowStart: dto.checkin_window_start,
      checkinWindowEnd: dto.checkin_window_end,
      gracePeriodDays: dto.grace_period_days ?? 2,
      faceThreshold: dto.face_threshold ?? 85,
      nfcRequired: dto.nfc_required ?? true,
      fallbackAllowed: dto.fallback_allowed ?? true,
      geofenceId: dto.geofence_id || null,
      curfewStart: dto.curfew_start || null,
      curfewEnd: dto.curfew_end || null,
      travelApprovalRequired: dto.travel_approval_required ?? true,
      travelThresholdDays: dto.travel_threshold_days ?? 3,
      effectiveFrom: dto.effective_from ? new Date(dto.effective_from) : null,
      effectiveTo: dto.effective_to ? new Date(dto.effective_to) : null,
      createdById: userId,
    });

    const saved = await this.scenarioRepo.save(scenario);

    // Auto-generate default alert rules and escalation rules
    const [defaultAlertRules, defaultEscalationRules] = await Promise.all([
      this.alertRulesService.createDefaultRules(saved.id),
      this.escalationRulesService.createDefaultRules(saved.id),
    ]);

    return {
      ...this.toListResponse(saved, 0),
      default_alert_rules: defaultAlertRules,
      default_escalation_rules: defaultEscalationRules,
    };
  }

  async update(id: string, dto: UpdateScenarioDto, userId: string) {
    const scenario = await this.scenarioRepo.findOneBy({ id });
    if (!scenario) throw new NotFoundException('Scenario not found');

    if (dto.name !== undefined) scenario.name = dto.name;
    if (dto.description !== undefined) scenario.description = dto.description || null;
    if (dto.scope !== undefined) scenario.scope = dto.scope;
    if (dto.checkin_frequency !== undefined) scenario.checkinFrequency = dto.checkin_frequency;
    if (dto.checkin_window_start !== undefined) scenario.checkinWindowStart = dto.checkin_window_start;
    if (dto.checkin_window_end !== undefined) scenario.checkinWindowEnd = dto.checkin_window_end;
    if (dto.grace_period_days !== undefined) scenario.gracePeriodDays = dto.grace_period_days;
    if (dto.face_threshold !== undefined) scenario.faceThreshold = dto.face_threshold;
    if (dto.nfc_required !== undefined) scenario.nfcRequired = dto.nfc_required;
    if (dto.fallback_allowed !== undefined) scenario.fallbackAllowed = dto.fallback_allowed;
    if (dto.geofence_id !== undefined) scenario.geofenceId = dto.geofence_id || null;
    if (dto.curfew_start !== undefined) scenario.curfewStart = dto.curfew_start || null;
    if (dto.curfew_end !== undefined) scenario.curfewEnd = dto.curfew_end || null;
    if (dto.travel_approval_required !== undefined) scenario.travelApprovalRequired = dto.travel_approval_required;
    if (dto.travel_threshold_days !== undefined) scenario.travelThresholdDays = dto.travel_threshold_days ?? null;
    if (dto.effective_from !== undefined) scenario.effectiveFrom = dto.effective_from ? new Date(dto.effective_from) : null;
    if (dto.effective_to !== undefined) scenario.effectiveTo = dto.effective_to ? new Date(dto.effective_to) : null;

    // Status transitions
    if (dto.status !== undefined) {
      this.validateStatusTransition(scenario.status, dto.status as ScenarioStatus);
      scenario.status = dto.status as ScenarioStatus;
    }

    const saved = await this.scenarioRepo.save(scenario);
    return this.toListResponse(saved, 0);
  }

  async remove(id: string) {
    const scenario = await this.scenarioRepo.findOneBy({ id });
    if (!scenario) throw new NotFoundException('Scenario not found');
    await this.scenarioRepo.softRemove(scenario);
    return { success: true };
  }

  async updateStatus(id: string, status: string, userId: string) {
    const scenario = await this.scenarioRepo.findOneBy({ id });
    if (!scenario) throw new NotFoundException('Scenario not found');

    this.validateStatusTransition(scenario.status, status as ScenarioStatus);
    scenario.status = status as ScenarioStatus;

    if (status === ScenarioStatus.ACTIVE) {
      scenario.approvedById = userId;
      scenario.approvedAt = new Date();
    }

    const saved = await this.scenarioRepo.save(scenario);
    return this.toListResponse(saved, 0);
  }

  private validateStatusTransition(current: ScenarioStatus, next: ScenarioStatus) {
    const allowed: Record<string, string[]> = {
      [ScenarioStatus.DRAFT]: [ScenarioStatus.PENDING_APPROVAL],
      [ScenarioStatus.PENDING_APPROVAL]: [ScenarioStatus.ACTIVE, ScenarioStatus.DRAFT],
      [ScenarioStatus.ACTIVE]: [ScenarioStatus.SUSPENDED, ScenarioStatus.EXPIRED],
      [ScenarioStatus.SUSPENDED]: [ScenarioStatus.ACTIVE, ScenarioStatus.EXPIRED],
      [ScenarioStatus.EXPIRED]: [],
    };

    if (!allowed[current]?.includes(next)) {
      throw new BadRequestException(`Cannot transition from ${current} to ${next}`);
    }
  }

  private async generateCode(): Promise<string> {
    const count = await this.scenarioRepo.count({ withDeleted: true });
    return `KB-${String(count + 1).padStart(4, '0')}`;
  }

  private toListResponse(s: ManagementScenario, subjectCount: number) {
    return {
      id: s.id,
      code: s.code,
      name: s.name,
      description: s.description,
      status: s.status,
      scope: s.scope,
      checkin_frequency: s.checkinFrequency,
      checkin_window_start: s.checkinWindowStart,
      checkin_window_end: s.checkinWindowEnd,
      grace_period_days: s.gracePeriodDays,
      face_threshold: s.faceThreshold,
      nfc_required: s.nfcRequired,
      fallback_allowed: s.fallbackAllowed,
      geofence_id: s.geofenceId,
      curfew_start: s.curfewStart,
      curfew_end: s.curfewEnd,
      travel_approval_required: s.travelApprovalRequired,
      travel_threshold_days: s.travelThresholdDays,
      effective_from: s.effectiveFrom,
      effective_to: s.effectiveTo,
      subject_count: subjectCount,
      created_at: s.createdAt,
      updated_at: s.updatedAt,
    };
  }

  private toDetailResponse(s: ManagementScenario, geofence: Geofence | null, subjectCount: number) {
    return {
      ...this.toListResponse(s, subjectCount),
      version: s.version,
      created_by_id: s.createdById,
      approved_by_id: s.approvedById,
      approved_at: s.approvedAt,
      geofence: geofence
        ? {
            id: geofence.id,
            code: geofence.code,
            name: geofence.name,
            address: geofence.address,
            center_lat: Number(geofence.centerLat),
            center_lng: Number(geofence.centerLng),
            radius: geofence.radius,
          }
        : null,
    };
  }
}
