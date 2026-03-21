import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ManagementScenario } from './entities/management-scenario.entity';
import { Geofence } from '../geofences/entities/geofence.entity';
import { ScenarioAssignment } from '../subjects/entities/scenario-assignment.entity';
import { User } from '../users/entities/user.entity';
import { ScenariosService } from './scenarios.service';
import { ScenariosController } from './scenarios.controller';
import { AlertsModule } from '../alerts/alerts.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ManagementScenario, Geofence, ScenarioAssignment, User]),
    AlertsModule,
  ],
  controllers: [ScenariosController],
  providers: [ScenariosService],
  exports: [ScenariosService, TypeOrmModule],
})
export class ScenariosModule {}
