import {
  IsString,
  IsOptional,
  IsEnum,
  MaxLength,
  MinLength,
  IsEmail,
  IsBoolean,
} from 'class-validator';
import { IsUUIDLoose } from '../../../common/validators/is-uuid.validator';
import { UserRole, DataScopeLevel, UserStatus } from '../entities/user.entity';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  full_name?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Email không hợp lệ.' })
  @MaxLength(200)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  phone?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsUUIDLoose()
  area_id?: string;

  @IsOptional()
  @IsEnum(DataScopeLevel)
  data_scope_level?: DataScopeLevel;

  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;
}

export class ResetPasswordDto {
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  new_password!: string;
}
