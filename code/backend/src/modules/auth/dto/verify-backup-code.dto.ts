import { IsString, Matches } from 'class-validator';

export class VerifyBackupCodeDto {
  @IsString()
  @Matches(/^[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}$/, {
    message: 'Backup code must be in format XXXX-XXXX',
  })
  backupCode!: string;
}
