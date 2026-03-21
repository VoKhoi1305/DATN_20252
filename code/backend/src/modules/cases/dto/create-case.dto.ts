import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { IsUUIDLoose } from '../../../common/validators/is-uuid.validator';
import { AlertLevel } from '../../alerts/entities/alert.entity';

export class CreateCaseDto {
  @IsUUIDLoose()
  subject_id!: string;

  @IsEnum(AlertLevel)
  severity!: AlertLevel;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}
