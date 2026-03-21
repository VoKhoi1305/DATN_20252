import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EscalationRule } from './entities/escalation-rule.entity';
import { AlertLevel, AlertRuleSource } from './entities/alert.entity';
import { CreateEscalationRuleDto } from './dto/create-escalation-rule.dto';
import { UpdateEscalationRuleDto } from './dto/update-escalation-rule.dto';
import { ListEscalationRulesDto } from './dto/list-escalation-rules.dto';

@Injectable()
export class EscalationRulesService {
  constructor(
    @InjectRepository(EscalationRule)
    private readonly escalationRuleRepo: Repository<EscalationRule>,
  ) {}

  async list(query: ListEscalationRulesDto) {
    const qb = this.escalationRuleRepo
      .createQueryBuilder('rule')
      .where('rule.scenarioId = :scenarioId', {
        scenarioId: query.scenario_id,
      });

    if (query.source) {
      qb.andWhere('rule.source = :source', { source: query.source });
    }

    if (query.is_active !== undefined) {
      qb.andWhere('rule.isActive = :isActive', { isActive: query.is_active });
    }

    qb.orderBy('rule.createdAt', 'ASC');

    const skip = (query.page - 1) * query.limit;
    qb.skip(skip).take(query.limit);

    const [items, total] = await qb.getManyAndCount();

    const data = items.map((rule) => ({
      id: rule.id,
      code: rule.code,
      name: rule.name,
      source: rule.source,
      alert_type: rule.alertType,
      alert_level_filter: rule.alertLevelFilter,
      condition_operator: rule.conditionOperator,
      condition_value: rule.conditionValue,
      condition_window_days: rule.conditionWindowDays,
      condition_consecutive: rule.conditionConsecutive,
      condition_extra: rule.conditionExtra,
      case_severity: rule.caseSeverity,
      case_description_tpl: rule.caseDescriptionTpl,
      notification_channels: rule.notificationChannels,
      auto_assign: rule.autoAssign,
      is_editable: rule.isEditable,
      is_deletable: rule.isDeletable,
      is_active: rule.isActive,
      created_at: rule.createdAt,
      updated_at: rule.updatedAt,
    }));

    return { data, total, page: query.page, limit: query.limit };
  }

  async findOne(id: string) {
    const rule = await this.escalationRuleRepo
      .createQueryBuilder('rule')
      .leftJoinAndSelect('rule.scenario', 'scenario')
      .where('rule.id = :id', { id })
      .getOne();

    if (!rule) {
      throw new NotFoundException(`Escalation rule with id "${id}" not found`);
    }

    return {
      id: rule.id,
      code: rule.code,
      name: rule.name,
      source: rule.source,
      alert_type: rule.alertType,
      alert_level_filter: rule.alertLevelFilter,
      condition_operator: rule.conditionOperator,
      condition_value: rule.conditionValue,
      condition_window_days: rule.conditionWindowDays,
      condition_consecutive: rule.conditionConsecutive,
      condition_extra: rule.conditionExtra,
      case_severity: rule.caseSeverity,
      case_description_tpl: rule.caseDescriptionTpl,
      notification_channels: rule.notificationChannels,
      auto_assign: rule.autoAssign,
      is_editable: rule.isEditable,
      is_deletable: rule.isDeletable,
      is_active: rule.isActive,
      scenario_id: rule.scenarioId,
      created_at: rule.createdAt,
      updated_at: rule.updatedAt,
      scenario: rule.scenario
        ? {
            id: rule.scenario.id,
            code: rule.scenario.code,
            name: rule.scenario.name,
          }
        : null,
    };
  }

  async create(dto: CreateEscalationRuleDto) {
    const code = `ER-CUSTOM-${Date.now()}`;

    const rule = this.escalationRuleRepo.create({
      scenarioId: dto.scenario_id,
      code,
      name: dto.name,
      source: AlertRuleSource.CUSTOM,
      alertType: dto.alert_type,
      alertLevelFilter: dto.alert_level_filter ?? null,
      conditionOperator: dto.condition_operator,
      conditionValue: dto.condition_value,
      conditionWindowDays: dto.condition_window_days ?? null,
      conditionConsecutive: dto.condition_consecutive ?? false,
      conditionExtra: dto.condition_extra ?? null,
      caseSeverity: dto.case_severity,
      caseDescriptionTpl: dto.case_description_tpl ?? null,
      notificationChannels: dto.notification_channels ?? ['PUSH'],
      autoAssign: dto.auto_assign ?? false,
      isEditable: true,
      isDeletable: true,
      isActive: dto.is_active ?? true,
    });

    const saved = await this.escalationRuleRepo.save(rule);

    return {
      id: saved.id,
      code: saved.code,
      name: saved.name,
      source: saved.source,
      alert_type: saved.alertType,
      alert_level_filter: saved.alertLevelFilter,
      condition_operator: saved.conditionOperator,
      condition_value: saved.conditionValue,
      condition_window_days: saved.conditionWindowDays,
      condition_consecutive: saved.conditionConsecutive,
      condition_extra: saved.conditionExtra,
      case_severity: saved.caseSeverity,
      case_description_tpl: saved.caseDescriptionTpl,
      notification_channels: saved.notificationChannels,
      auto_assign: saved.autoAssign,
      is_editable: saved.isEditable,
      is_deletable: saved.isDeletable,
      is_active: saved.isActive,
      created_at: saved.createdAt,
    };
  }

  async update(id: string, dto: UpdateEscalationRuleDto) {
    const rule = await this.escalationRuleRepo.findOneBy({ id });
    if (!rule) {
      throw new NotFoundException(`Escalation rule with id "${id}" not found`);
    }

    if (!rule.isEditable) {
      throw new BadRequestException('This escalation rule is not editable');
    }

    // Default rules have restricted editable fields
    if (rule.source === AlertRuleSource.DEFAULT) {
      // Defaults can only update: condition_value, condition_window_days,
      // case_severity, is_active, alert_level_filter, notification_channels
      if (dto.condition_value !== undefined) {
        rule.conditionValue = dto.condition_value;
      }
      if (dto.condition_window_days !== undefined) {
        rule.conditionWindowDays = dto.condition_window_days;
      }
      if (dto.case_severity !== undefined) {
        rule.caseSeverity = dto.case_severity;
      }
      if (dto.is_active !== undefined) {
        rule.isActive = dto.is_active;
      }
      if (dto.alert_level_filter !== undefined) {
        rule.alertLevelFilter = dto.alert_level_filter;
      }
      if (dto.notification_channels !== undefined) {
        rule.notificationChannels = dto.notification_channels;
      }
    } else {
      // Custom rules can update all fields
      if (dto.name !== undefined) {
        rule.name = dto.name;
      }
      if (dto.alert_type !== undefined) {
        rule.alertType = dto.alert_type;
      }
      if (dto.alert_level_filter !== undefined) {
        rule.alertLevelFilter = dto.alert_level_filter;
      }
      if (dto.condition_operator !== undefined) {
        rule.conditionOperator = dto.condition_operator;
      }
      if (dto.condition_value !== undefined) {
        rule.conditionValue = dto.condition_value;
      }
      if (dto.condition_window_days !== undefined) {
        rule.conditionWindowDays = dto.condition_window_days;
      }
      if (dto.condition_consecutive !== undefined) {
        rule.conditionConsecutive = dto.condition_consecutive;
      }
      if (dto.condition_extra !== undefined) {
        rule.conditionExtra = dto.condition_extra;
      }
      if (dto.case_severity !== undefined) {
        rule.caseSeverity = dto.case_severity;
      }
      if (dto.case_description_tpl !== undefined) {
        rule.caseDescriptionTpl = dto.case_description_tpl;
      }
      if (dto.notification_channels !== undefined) {
        rule.notificationChannels = dto.notification_channels;
      }
      if (dto.auto_assign !== undefined) {
        rule.autoAssign = dto.auto_assign;
      }
      if (dto.is_active !== undefined) {
        rule.isActive = dto.is_active;
      }
    }

    const saved = await this.escalationRuleRepo.save(rule);

    return {
      id: saved.id,
      code: saved.code,
      name: saved.name,
      source: saved.source,
      alert_type: saved.alertType,
      alert_level_filter: saved.alertLevelFilter,
      condition_operator: saved.conditionOperator,
      condition_value: saved.conditionValue,
      condition_window_days: saved.conditionWindowDays,
      condition_consecutive: saved.conditionConsecutive,
      condition_extra: saved.conditionExtra,
      case_severity: saved.caseSeverity,
      case_description_tpl: saved.caseDescriptionTpl,
      notification_channels: saved.notificationChannels,
      auto_assign: saved.autoAssign,
      is_editable: saved.isEditable,
      is_deletable: saved.isDeletable,
      is_active: saved.isActive,
      updated_at: saved.updatedAt,
    };
  }

  async delete(id: string) {
    const rule = await this.escalationRuleRepo.findOneBy({ id });
    if (!rule) {
      throw new NotFoundException(`Escalation rule with id "${id}" not found`);
    }

    if (!rule.isDeletable) {
      throw new BadRequestException(
        'This escalation rule cannot be deleted. Default rules are protected.',
      );
    }

    await this.escalationRuleRepo.remove(rule);

    return { message: 'Escalation rule deleted successfully' };
  }

  async toggleActive(id: string) {
    const rule = await this.escalationRuleRepo.findOneBy({ id });
    if (!rule) {
      throw new NotFoundException(`Escalation rule with id "${id}" not found`);
    }

    rule.isActive = !rule.isActive;
    const saved = await this.escalationRuleRepo.save(rule);

    return {
      id: saved.id,
      code: saved.code,
      name: saved.name,
      is_active: saved.isActive,
      updated_at: saved.updatedAt,
    };
  }

  async createDefaultRules(scenarioId: string) {
    const defaults = [
      {
        code: `ER-DEF-URGENT-${Date.now()}`,
        name: 'Leo thang cảnh báo khẩn cấp',
        alertType: 'SEVERE_OVERDUE',
        alertLevelFilter: AlertLevel.KHAN_CAP,
        conditionOperator: '>=',
        conditionValue: 1,
        conditionWindowDays: null as number | null,
        conditionConsecutive: false,
        conditionExtra: null as Record<string, unknown> | null,
        caseSeverity: AlertLevel.KHAN_CAP,
        caseDescriptionTpl: 'Đối tượng quá hạn nghiêm trọng — hệ thống tự động leo thang.',
      },
      {
        code: `ER-DEF-HIGH-${Date.now()}`,
        name: 'Leo thang cảnh báo mức cao',
        alertType: 'FACE_MISMATCH_STREAK',
        alertLevelFilter: AlertLevel.CAO,
        conditionOperator: '>=',
        conditionValue: 2,
        conditionWindowDays: 7,
        conditionConsecutive: true,
        conditionExtra: null as Record<string, unknown> | null,
        caseSeverity: AlertLevel.CAO,
        caseDescriptionTpl: 'Cảnh báo mức cao lặp lại — hệ thống tự động tạo vụ việc.',
      },
    ];

    const entities = defaults.map((def) =>
      this.escalationRuleRepo.create({
        scenarioId,
        code: def.code,
        name: def.name,
        source: AlertRuleSource.DEFAULT,
        alertType: def.alertType,
        alertLevelFilter: def.alertLevelFilter,
        conditionOperator: def.conditionOperator,
        conditionValue: def.conditionValue,
        conditionWindowDays: def.conditionWindowDays,
        conditionConsecutive: def.conditionConsecutive,
        conditionExtra: def.conditionExtra,
        caseSeverity: def.caseSeverity,
        caseDescriptionTpl: def.caseDescriptionTpl,
        notificationChannels: ['PUSH'],
        autoAssign: false,
        isEditable: true,
        isDeletable: false,
        isActive: true,
      }),
    );

    const saved = await this.escalationRuleRepo.save(entities);

    return saved.map((rule) => ({
      id: rule.id,
      code: rule.code,
      name: rule.name,
      source: rule.source,
      alert_type: rule.alertType,
      case_severity: rule.caseSeverity,
      is_active: rule.isActive,
    }));
  }
}
