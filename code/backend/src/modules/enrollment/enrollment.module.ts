import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { EnrollmentController } from './enrollment.controller';
import { EnrollmentService } from './enrollment.service';
import { FaceRecognitionClient } from './face-recognition.client';
import { BiometricModule } from '../biometric/biometric.module';
import { DevicesModule } from '../devices/devices.module';
import { Subject } from '../subjects/entities/subject.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Subject]),
    MulterModule.register({
      storage: memoryStorage(),
    }),
    BiometricModule,
    DevicesModule,
  ],
  controllers: [EnrollmentController],
  providers: [EnrollmentService, FaceRecognitionClient],
  exports: [EnrollmentService, FaceRecognitionClient],
})
export class EnrollmentModule {}
