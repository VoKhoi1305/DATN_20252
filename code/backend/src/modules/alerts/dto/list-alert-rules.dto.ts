import { IsOptional, IsEnum, IsInt, Min, Max } from 'class-validator';
import { IsUUIDLoose } from '../../../common/validators/is-uuid.validator';
import { Type, Transform } from 'class-transformer';
import { AlertRuleSource } from '../entities/alert.entity';

export class ListAlertRulesDto {
  @IsUUIDLoose()
  scenario_id!: string;

  @IsOptional()
  @IsEnum(AlertRuleSource)
  source?: AlertRuleSource;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  is_active?: boolean;

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
}
