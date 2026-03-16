import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ManagementScenario } from './entities/management-scenario.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ManagementScenario])],
  exports: [TypeOrmModule],
})
export class ScenariosModule {}
