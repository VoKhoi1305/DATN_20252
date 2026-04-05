import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class EnrollDeviceDto {
  @IsString()
  @IsNotEmpty()
  deviceId!: string;

  @IsString()
  @IsOptional()
  deviceModel?: string;

  @IsString()
  @IsOptional()
  osVersion?: string;
}
