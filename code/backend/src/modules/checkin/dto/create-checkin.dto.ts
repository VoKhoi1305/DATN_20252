import { IsNotEmpty, IsString, IsOptional, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateCheckinDto {
  @IsString()
  @IsNotEmpty()
  chipDataHash!: string;

  @IsString()
  @IsNotEmpty()
  chipSerial!: string;

  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  passiveAuthVerified!: boolean;

  @IsString()
  @IsOptional()
  passiveAuthData?: string;

  @IsOptional()
  @Transform(({ value }) => (value ? parseFloat(value) : undefined))
  gpsLat?: number;

  @IsOptional()
  @Transform(({ value }) => (value ? parseFloat(value) : undefined))
  gpsLng?: number;

  @IsString()
  @IsNotEmpty()
  clientTimestamp!: string;

  @IsString()
  @IsOptional()
  deviceId?: string;

  @IsString()
  @IsOptional()
  deviceModel?: string;

  @IsString()
  @IsOptional()
  osVersion?: string;
}
