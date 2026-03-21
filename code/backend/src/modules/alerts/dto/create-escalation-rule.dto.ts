import {
  IsString,
  IsEnum,
  IsInt,
  IsOptional,
  IsBoolean,
  IsObject,
  IsArray,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { IsUUIDLoose } from '../../../common/validators/is-uuid.validator';
import { AlertLevel } from '../entities/alert.entity';
import { ConditionOperator } from './create-alert-rule.dto';

export class CreateEscalationRuleDto {
  @IsUUIDLoose()
  scenario_id!: string;

  @IsString()
  @MaxLength(200)
  name!: string;

  @IsString()
  alert_type!: string;

  @IsOptional()
  @IsEnum(AlertLevel)
  alert_level_filter?: AlertLevel;

  @IsEnum(ConditionOperator)
  condition_operator!: string;

  @IsInt()
  @Min(1)
  condition_value!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  condition_window_days?: number;

  @IsOptional()
  @IsBoolean()
  condition_consecutive?: boolean;

  @IsOptional()
  @IsObject()
  condition_extra?: Record<string, unknown>;

  @IsEnum(AlertLevel)
  case_severity!: AlertLevel;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  case_description_tpl?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  notification_channels?: string[];

  @IsOptional()
  @IsBoolean()
  auto_assign?: boolean;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
