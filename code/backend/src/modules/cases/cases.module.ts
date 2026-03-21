import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Case } from './entities/case.entity';
import { CaseNote } from './entities/case-note.entity';
import { User } from '../users/entities/user.entity';
import { AreasModule } from '../areas/areas.module';
import { CasesService } from './cases.service';
import { CasesController } from './cases.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Case, CaseNote, User]),
    AreasModule,
  ],
  controllers: [CasesController],
  providers: [CasesService],
  exports: [CasesService, TypeOrmModule],
})
export class CasesModule {}
