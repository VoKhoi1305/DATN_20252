import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AlertRule } from './entities/alert-rule.entity';
import { AlertLevel, AlertRuleSource } from './entities/alert.entity';
import { CreateAlertRuleDto } from './dto/create-alert-rule.dto';
import { UpdateAlertRuleDto } from './dto/update-alert-rule.dto';
import { ListAlertRulesDto } from './dto/list-alert-rules.dto';

@Injectable()
export class AlertRulesService {
  constructor(
    @InjectRepository(AlertRule)
    private readonly alertRuleRepo: Repository<AlertRule>,
  ) {}

  async list(query: ListAlertRulesDto) {
    const qb = this.alertRuleRepo
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
      event_type: rule.eventType,
      condition_operator: rule.conditionOperator,
      condition_value: rule.conditionValue,
      condition_window_days: rule.conditionWindowDays,
      condition_extra: rule.conditionExtra,
      alert_level: rule.alertLevel,
      notification_channels: rule.notificationChannels,
      is_editable: rule.isEditable,
      is_deletable: rule.isDeletable,
      is_active: rule.isActive,
      created_at: rule.createdAt,
      updated_at: rule.updatedAt,
    }));

    return { data, total, page: query.page, limit: query.limit };
  }

  async findOne(id: string) {
    const rule = await this.alertRuleRepo
      .createQueryBuilder('rule')
      .leftJoinAndSelect('rule.scenario', 'scenario')
      .where('rule.id = :id', { id })
      .getOne();

    if (!rule) {
      throw new NotFoundException(`Alert rule with id "${id}" not found`);
    }

    return {
      id: rule.id,
      code: rule.code,
      name: rule.name,
      source: rule.source,
      event_type: rule.eventType,
      condition_operator: rule.conditionOperator,
      condition_value: rule.conditionValue,
      condition_window_days: rule.conditionWindowDays,
      condition_extra: rule.conditionExtra,
      alert_level: rule.alertLevel,
      notification_channels: rule.notificationChannels,
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

  async create(dto: CreateAlertRuleDto) {
    const code = `AR-CUSTOM-${Date.now()}`;

    const rule = this.alertRuleRepo.create({
      scenarioId: dto.scenario_id,
      code,
      name: dto.name,
      source: AlertRuleSource.CUSTOM,
      eventType: dto.event_type,
      conditionOperator: dto.condition_operator,
      conditionValue: dto.condition_value,
      conditionWindowDays: dto.condition_window_days ?? null,
      conditionExtra: dto.condition_extra ?? null,
      alertLevel: dto.alert_level,
      notificationChannels: dto.notification_channels ?? ['PUSH'],
      isEditable: true,
      isDeletable: true,
      isActive: dto.is_active ?? true,
    });

    const saved = await this.alertRuleRepo.save(rule);

    return {
      id: saved.id,
      code: saved.code,
      name: saved.name,
      source: saved.source,
      event_type: saved.eventType,
      condition_operator: saved.conditionOperator,
      condition_value: saved.conditionValue,
      condition_window_days: saved.conditionWindowDays,
      condition_extra: saved.conditionExtra,
      alert_level: saved.alertLevel,
      notification_channels: saved.notificationChannels,
      is_editable: saved.isEditable,
      is_deletable: saved.isDeletable,
      is_active: saved.isActive,
      created_at: saved.createdAt,
    };
  }

  async update(id: string, dto: UpdateAlertRuleDto) {
    const rule = await this.alertRuleRepo.findOneBy({ id });
    if (!rule) {
      throw new NotFoundException(`Alert rule with id "${id}" not found`);
    }

    if (!rule.isEditable) {
      throw new BadRequestException('This alert rule is not editable');
    }

    // Default rules have restricted editable fields
    if (rule.source === AlertRuleSource.DEFAULT) {
      // Defaults can only update: condition_value, condition_window_days,
      // alert_level, is_active, notification_channels
      if (dto.condition_value !== undefined) {
        rule.conditionValue = dto.condition_value;
      }
      if (dto.condition_window_days !== undefined) {
        rule.conditionWindowDays = dto.condition_window_days;
      }
      if (dto.alert_level !== undefined) {
        rule.alertLevel = dto.alert_level;
      }
      if (dto.is_active !== undefined) {
        rule.isActive = dto.is_active;
      }
      if (dto.notification_channels !== undefined) {
        rule.notificationChannels = dto.notification_channels;
      }
    } else {
      // Custom rules can update all fields
      if (dto.name !== undefined) {
        rule.name = dto.name;
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
      if (dto.condition_extra !== undefined) {
        rule.conditionExtra = dto.condition_extra;
      }
      if (dto.alert_level !== undefined) {
        rule.alertLevel = dto.alert_level;
      }
      if (dto.notification_channels !== undefined) {
        rule.notificationChannels = dto.notification_channels;
      }
      if (dto.is_active !== undefined) {
        rule.isActive = dto.is_active;
      }
    }

    const saved = await this.alertRuleRepo.save(rule);

    return {
      id: saved.id,
      code: saved.code,
      name: saved.name,
      source: saved.source,
      event_type: saved.eventType,
      condition_operator: saved.conditionOperator,
      condition_value: saved.conditionValue,
      condition_window_days: saved.conditionWindowDays,
      condition_extra: saved.conditionExtra,
      alert_level: saved.alertLevel,
      notification_channels: saved.notificationChannels,
      is_editable: saved.isEditable,
      is_deletable: saved.isDeletable,
      is_active: saved.isActive,
      updated_at: saved.updatedAt,
    };
  }

  async delete(id: string) {
    const rule = await this.alertRuleRepo.findOneBy({ id });
    if (!rule) {
      throw new NotFoundException(`Alert rule with id "${id}" not found`);
    }

    if (!rule.isDeletable) {
      throw new BadRequestException(
        'This alert rule cannot be deleted. Default rules are protected.',
      );
    }

    await this.alertRuleRepo.remove(rule);

    return { message: 'Alert rule deleted successfully' };
  }

  async toggleActive(id: string) {
    const rule = await this.alertRuleRepo.findOneBy({ id });
    if (!rule) {
      throw new NotFoundException(`Alert rule with id "${id}" not found`);
    }

    rule.isActive = !rule.isActive;
    const saved = await this.alertRuleRepo.save(rule);

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
        code: `AR-DEF-OVERDUE-${Date.now()}`,
        name: 'Quá hạn check-in',
        eventType: 'CHECKIN_OVERDUE',
        conditionOperator: '>=',
        conditionValue: 1,
        conditionWindowDays: null as number | null,
        conditionExtra: null as Record<string, unknown> | null,
        alertLevel: AlertLevel.TRUNG_BINH,
      },
      {
        code: `AR-DEF-FACE-${Date.now()}`,
        name: 'Khuôn mặt không khớp liên tiếp',
        eventType: 'FACE_MISMATCH',
        conditionOperator: '>=',
        conditionValue: 3,
        conditionWindowDays: 7,
        conditionExtra: null as Record<string, unknown> | null,
        alertLevel: AlertLevel.CAO,
      },
      {
        code: `AR-DEF-NFC-${Date.now()}`,
        name: 'CCCD không khớp',
        eventType: 'NFC_MISMATCH',
        conditionOperator: '>=',
        conditionValue: 1,
        conditionWindowDays: null as number | null,
        conditionExtra: null as Record<string, unknown> | null,
        alertLevel: AlertLevel.CAO,
      },
      {
        code: `AR-DEF-SEVERE-${Date.now()}`,
        name: 'Quá hạn nghiêm trọng',
        eventType: 'SEVERE_OVERDUE',
        conditionOperator: '>=',
        conditionValue: 1,
        conditionWindowDays: null as number | null,
        conditionExtra: null as Record<string, unknown> | null,
        alertLevel: AlertLevel.KHAN_CAP,
      },
    ];

    const entities = defaults.map((def) =>
      this.alertRuleRepo.create({
        scenarioId,
        code: def.code,
        name: def.name,
        source: AlertRuleSource.DEFAULT,
        eventType: def.eventType,
        conditionOperator: def.conditionOperator,
        conditionValue: def.conditionValue,
        conditionWindowDays: def.conditionWindowDays,
        conditionExtra: def.conditionExtra,
        alertLevel: def.alertLevel,
        notificationChannels: ['PUSH'],
        isEditable: true,
        isDeletable: false,
        isActive: true,
      }),
    );

    const saved = await this.alertRuleRepo.save(entities);

    return saved.map((rule) => ({
      id: rule.id,
      code: rule.code,
      name: rule.name,
      source: rule.source,
      event_type: rule.eventType,
      alert_level: rule.alertLevel,
      is_active: rule.isActive,
    }));
  }
}
