import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Alert } from './entities/alert.entity';
import { AlertRule } from './entities/alert-rule.entity';
import { EscalationRule } from './entities/escalation-rule.entity';
import { Case } from '../cases/entities/case.entity';
import { User } from '../users/entities/user.entity';
import { AreasModule } from '../areas/areas.module';
import { AlertsService } from './alerts.service';
import { AlertRulesService } from './alert-rules.service';
import { EscalationRulesService } from './escalation-rules.service';
import { AlertsController } from './alerts.controller';
import { AlertRulesController } from './alert-rules.controller';
import { EscalationRulesController } from './escalation-rules.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Alert, AlertRule, EscalationRule, Case, User]),
    AreasModule,
  ],
  providers: [AlertsService, AlertRulesService, EscalationRulesService],
  controllers: [AlertsController, AlertRulesController, EscalationRulesController],
  exports: [AlertsService, AlertRulesService, EscalationRulesService, TypeOrmModule],
})
export class AlertsModule {}
