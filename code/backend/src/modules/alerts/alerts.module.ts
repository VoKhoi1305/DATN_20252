import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Alert } from './entities/alert.entity';
import { AlertRule } from './entities/alert-rule.entity';
import { EscalationRule } from './entities/escalation-rule.entity';
import { Case } from '../cases/entities/case.entity';
import { User } from '../users/entities/user.entity';
import { Event } from '../events/entities/event.entity';
import { ScenarioAssignment } from '../subjects/entities/scenario-assignment.entity';
import { ManagementScenario } from '../scenarios/entities/management-scenario.entity';
import { AreasModule } from '../areas/areas.module';
import { EventsModule } from '../events/events.module';
import { RequestsModule } from '../requests/requests.module';
import { AlertsService } from './alerts.service';
import { AlertRulesService } from './alert-rules.service';
import { EscalationRulesService } from './escalation-rules.service';
import { EventProcessorService } from './event-processor.service';
import { OverdueCheckinScheduler } from './overdue-checkin.scheduler';
import { AlertsController } from './alerts.controller';
import { AlertRulesController } from './alert-rules.controller';
import { EscalationRulesController } from './escalation-rules.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Alert,
      AlertRule,
      EscalationRule,
      Case,
      User,
      Event,
      ScenarioAssignment,
      ManagementScenario,
    ]),
    AreasModule,
    forwardRef(() => EventsModule),
    RequestsModule,
  ],
  providers: [
    AlertsService,
    AlertRulesService,
    EscalationRulesService,
    EventProcessorService,
    OverdueCheckinScheduler,
  ],
  controllers: [AlertsController, AlertRulesController, EscalationRulesController],
  exports: [
    AlertsService,
    AlertRulesService,
    EscalationRulesService,
    EventProcessorService,
    OverdueCheckinScheduler,
    TypeOrmModule,
  ],
})
export class AlertsModule {}
