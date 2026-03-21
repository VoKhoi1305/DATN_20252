import { IsOptional, IsString, MaxLength } from 'class-validator';

export class EscalateAlertDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}
