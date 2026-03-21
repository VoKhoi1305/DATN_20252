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
import { AlertLevel } from '../entities/alert.entity';
import { ConditionOperator } from './create-alert-rule.dto';

export class UpdateAlertRuleDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsEnum(ConditionOperator)
  condition_operator?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  condition_value?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  condition_window_days?: number | null;

  @IsOptional()
  @IsObject()
  condition_extra?: Record<string, unknown> | null;

  @IsOptional()
  @IsEnum(AlertLevel)
  alert_level?: AlertLevel;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  notification_channels?: string[];

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
