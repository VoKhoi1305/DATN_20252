import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Geofence } from './entities/geofence.entity';
import { GeofencesService } from './geofences.service';
import { GeofencesController } from './geofences.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Geofence])],
  controllers: [GeofencesController],
  providers: [GeofencesService],
  exports: [GeofencesService, TypeOrmModule],
})
export class GeofencesModule {}
