import { IsString, MinLength, Matches, Length } from 'class-validator';

export class ActivateDto {
  @IsString()
  @MinLength(1)
  subjectCode!: string;

  @IsString()
  @Length(12, 12, { message: 'CCCD phải có đúng 12 chữ số' })
  @Matches(/^\d{12}$/, { message: 'CCCD phải là 12 chữ số' })
  cccd!: string;

  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message:
      'Mật khẩu phải chứa ít nhất 1 chữ hoa, 1 chữ thường và 1 chữ số',
  })
  password!: string;

  @IsString()
  confirmPassword!: string;
}
