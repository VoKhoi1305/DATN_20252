import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { IsUUIDLoose } from '../../../common/validators/is-uuid.validator';
import { Type } from 'class-transformer';

export enum CreateGender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
}

export class FamilyDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  contact_name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  contact_phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class LegalDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  document_number?: string;

  @IsOptional()
  @IsString()
  document_date?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  authority?: string;

  @IsOptional()
  @IsString()
  management_duration?: string;

  @IsOptional()
  @IsString()
  start_date?: string;

  @IsOptional()
  @IsString()
  end_date?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class CreateSubjectDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  full_name!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{12}$/, { message: 'CCCD phải có đúng 12 chữ số.' })
  cccd!: string;

  @IsString()
  @IsNotEmpty()
  date_of_birth!: string;

  @IsEnum(CreateGender)
  gender!: CreateGender;

  @IsString()
  @IsNotEmpty()
  address!: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  phone?: string;

  @IsUUIDLoose()
  area_id!: string;

  @IsOptional()
  @IsString()
  ethnicity?: string;

  @IsOptional()
  @IsString()
  permanent_address?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => FamilyDto)
  family?: FamilyDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => LegalDto)
  legal?: LegalDto;
}
