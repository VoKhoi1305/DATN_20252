import { IsOptional, IsEnum, IsString, IsInt, Min, Max, IsDateString, IsIn } from 'class-validator';
import { IsUUIDLoose } from '../../../common/validators/is-uuid.validator';
import { Type } from 'class-transformer';
import { CaseStatus, CaseSource } from '../entities/case.entity';
import { AlertLevel } from '../../alerts/entities/alert.entity';

export class ListCasesDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @IsOptional()
  @IsEnum(CaseStatus)
  status?: CaseStatus;

  @IsOptional()
  @IsEnum(AlertLevel)
  severity?: AlertLevel;

  @IsOptional()
  @IsEnum(CaseSource)
  source?: CaseSource;

  @IsOptional()
  @IsUUIDLoose()
  subject_id?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsString()
  sort: string = 'created_at';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  order: 'asc' | 'desc' = 'desc';
}
