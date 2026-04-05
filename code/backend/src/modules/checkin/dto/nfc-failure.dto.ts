import { IsNotEmpty, IsString, IsOptional, IsNumber } from 'class-validator';
import { Transform } from 'class-transformer';

export class NfcFailureDto {
  /** Human-readable reason: NFC_READ_ERROR, SECURITY_EXCEPTION, PASSIVE_AUTH_FAILED, etc. */
  @IsString()
  @IsNotEmpty()
  reason!: string;

  @IsString()
  @IsOptional()
  chipSerial?: string;

  @IsString()
  @IsOptional()
  deviceId?: string;

  @IsOptional()
  @Transform(({ value }) => (value != null ? parseFloat(value) : undefined))
  @IsNumber()
  gpsLat?: number;

  @IsOptional()
  @Transform(({ value }) => (value != null ? parseFloat(value) : undefined))
  @IsNumber()
  gpsLng?: number;

  @IsString()
  @IsNotEmpty()
  clientTimestamp!: string;
}
