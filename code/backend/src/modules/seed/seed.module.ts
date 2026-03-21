import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Event } from '../events/entities/event.entity';
import { Alert } from '../alerts/entities/alert.entity';
import { Case } from '../cases/entities/case.entity';
import { CaseNote } from '../cases/entities/case-note.entity';
import { Subject } from '../subjects/entities/subject.entity';
import { Area } from '../areas/entities/area.entity';
import { User } from '../users/entities/user.entity';
import { ManagementScenario } from '../scenarios/entities/management-scenario.entity';
import { ScenarioAssignment } from '../subjects/entities/scenario-assignment.entity';
import { Geofence } from '../geofences/entities/geofence.entity';
import { AlertRule } from '../alerts/entities/alert-rule.entity';
import { SeedService } from './seed.service';
import { SeedController } from './seed.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Event,
      Alert,
      AlertRule,
      Case,
      CaseNote,
      Subject,
      Area,
      User,
      ManagementScenario,
      ScenarioAssignment,
      Geofence,
    ]),
  ],
  providers: [SeedService],
  controllers: [SeedController],
})
export class SeedModule {}
