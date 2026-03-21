import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  MaxLength,
  MinLength,
  Matches,
  IsEmail,
} from 'class-validator';
import { IsUUIDLoose } from '../../../common/validators/is-uuid.validator';
import { UserRole, DataScopeLevel } from '../entities/user.entity';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(100)
  @Matches(/^[a-zA-Z0-9._]+$/, {
    message: 'Tên đăng nhập chỉ chứa chữ, số, dấu chấm và gạch dưới.',
  })
  username!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  full_name!: string;

  @IsOptional()
  @IsEmail({}, { message: 'Email không hợp lệ.' })
  @MaxLength(200)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  phone?: string;

  @IsEnum(UserRole)
  role!: UserRole;

  @IsOptional()
  @IsUUIDLoose()
  area_id?: string;

  @IsEnum(DataScopeLevel)
  data_scope_level!: DataScopeLevel;
}
