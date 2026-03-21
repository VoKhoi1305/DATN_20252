import { IsString, IsNumber, IsOptional, IsBoolean, Min, Max, MaxLength } from 'class-validator';
import { IsUUIDLoose } from '../../../common/validators/is-uuid.validator';
import { Type } from 'class-transformer';

export class UpdateGeofenceDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(-90)
  @Max(90)
  center_lat?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(-180)
  @Max(180)
  center_lng?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(50)
  @Max(50000)
  radius?: number;

  @IsOptional()
  @IsUUIDLoose()
  area_id?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
