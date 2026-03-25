import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FaceTemplate } from './entities/face-template.entity';
import { NfcRecord } from './entities/nfc-record.entity';
import { BiometricLog } from './entities/biometric-log.entity';
import { BiometricService } from './biometric.service';
import { BIOMETRIC_DB_CONNECTION } from '../../config/biometric-database.config';

@Module({
  imports: [
    TypeOrmModule.forFeature(
      [FaceTemplate, NfcRecord, BiometricLog],
      BIOMETRIC_DB_CONNECTION,
    ),
  ],
  providers: [BiometricService],
  exports: [BiometricService],
})
export class BiometricModule {}
