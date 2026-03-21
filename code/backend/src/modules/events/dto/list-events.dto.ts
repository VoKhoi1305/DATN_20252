import { IsOptional, IsString, IsEnum, IsDateString, IsIn, Min, Max, IsNumber } from 'class-validator';
import { IsUUIDLoose } from '../../../common/validators/is-uuid.validator';
import { Transform } from 'class-transformer';
import { EventResult } from '../entities/event.entity';

export class ListEventsDto {
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @IsOptional()
  @IsUUIDLoose()
  subject_id?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsEnum(EventResult)
  result?: EventResult;

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
