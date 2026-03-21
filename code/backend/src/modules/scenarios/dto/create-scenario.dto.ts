import { IsString, IsOptional, IsNumber, IsBoolean, IsEnum, MaxLength, Min, Max } from 'class-validator';
import { IsUUIDLoose } from '../../../common/validators/is-uuid.validator';
import { Type } from 'class-transformer';

export class CreateScenarioDto {
  @IsString()
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(['DISTRICT', 'PROVINCE', 'SYSTEM'])
  scope!: string;

  @IsString()
  checkin_frequency!: string; // DAILY, WEEKLY, BIWEEKLY, MONTHLY

  @IsString()
  checkin_window_start!: string; // HH:mm

  @IsString()
  checkin_window_end!: string; // HH:mm

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @Max(30)
  grace_period_days?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(50)
  @Max(100)
  face_threshold?: number;

  @IsOptional()
  @IsBoolean()
  nfc_required?: boolean;

  @IsOptional()
  @IsBoolean()
  fallback_allowed?: boolean;

  @IsOptional()
  @IsUUIDLoose()
  geofence_id?: string;

  @IsOptional()
  @IsString()
  curfew_start?: string;

  @IsOptional()
  @IsString()
  curfew_end?: string;

  @IsOptional()
  @IsBoolean()
  travel_approval_required?: boolean;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  travel_threshold_days?: number;

  @IsOptional()
  @IsString()
  effective_from?: string;

  @IsOptional()
  @IsString()
  effective_to?: string;
}
