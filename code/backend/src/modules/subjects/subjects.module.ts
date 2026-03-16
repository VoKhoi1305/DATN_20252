import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Subject } from './entities/subject.entity';
import { SubjectFamily } from './entities/subject-family.entity';
import { SubjectLegal } from './entities/subject-legal.entity';
import { ScenarioAssignment } from './entities/scenario-assignment.entity';
import { ManagementScenario } from '../scenarios/entities/management-scenario.entity';
import { User } from '../users/entities/user.entity';
import { AreasModule } from '../areas/areas.module';
import { SubjectsController } from './subjects.controller';
import { SubjectsService } from './subjects.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Subject, SubjectFamily, SubjectLegal, ScenarioAssignment, ManagementScenario, User]),
    AreasModule,
  ],
  controllers: [SubjectsController],
  providers: [SubjectsService],
  exports: [TypeOrmModule, SubjectsService],
})
export class SubjectsModule {}
