import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { CheckinController } from './checkin.controller';
import { CheckinService } from './checkin.service';
import { Subject } from '../subjects/entities/subject.entity';
import { BiometricModule } from '../biometric/biometric.module';
import { EnrollmentModule } from '../enrollment/enrollment.module';
import { DevicesModule } from '../devices/devices.module';
import { EventsModule } from '../events/events.module';
import { RequestsModule } from '../requests/requests.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Subject]),
    MulterModule.register({
      storage: memoryStorage(),
    }),
    BiometricModule,
    EnrollmentModule,    // provides FaceRecognitionClient
    DevicesModule,
    EventsModule,
    RequestsModule,      // provides RequestsService (travel/postpone lookups)
  ],
  controllers: [CheckinController],
  providers: [CheckinService],
})
export class CheckinModule {}
