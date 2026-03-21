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

export enum EventType {
  CHECK_IN = 'CHECK_IN',
  CHECKIN_OVERDUE = 'CHECKIN_OVERDUE',
  SEVERE_OVERDUE = 'SEVERE_OVERDUE',
  FACE_MISMATCH = 'FACE_MISMATCH',
  NFC_FAIL = 'NFC_FAIL',
  NFC_MISMATCH = 'NFC_MISMATCH',
  GEOFENCE_VIOLATION = 'GEOFENCE_VIOLATION',
}

export enum ConditionOperator {
  GTE = '>=',
  LTE = '<=',
  EQ = '==',
  GT = '>',
  LT = '<',
}

export class CreateAlertRuleDto {
  @IsUUIDLoose()
  scenario_id!: string;

  @IsString()
  @MaxLength(200)
  name!: string;

  @IsEnum(EventType)
  event_type!: string;

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
  @IsObject()
  condition_extra?: Record<string, unknown>;

  @IsEnum(AlertLevel)
  alert_level!: AlertLevel;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  notification_channels?: string[];

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
