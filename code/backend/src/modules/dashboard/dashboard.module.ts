import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AreasModule } from '../areas/areas.module';
import { SubjectsModule } from '../subjects/subjects.module';
import { EventsModule } from '../events/events.module';
import { AlertsModule } from '../alerts/alerts.module';
import { CasesModule } from '../cases/cases.module';
import { User } from '../users/entities/user.entity';
import { DashboardController } from './dashboard.controller';
import { EventsController } from './events.controller';
import { AlertsController } from './alerts.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    AreasModule,
    SubjectsModule,
    EventsModule,
    AlertsModule,
    CasesModule,
  ],
  controllers: [DashboardController, EventsController, AlertsController],
  providers: [DashboardService],
})
export class DashboardModule {}
