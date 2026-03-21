import { Controller, Get, Post, Patch, Delete, Query, Param, Body } from '@nestjs/common';
import { GeofencesService } from './geofences.service';
import { CreateGeofenceDto } from './dto/create-geofence.dto';
import { UpdateGeofenceDto } from './dto/update-geofence.dto';
import { ListGeofencesDto } from './dto/list-geofences.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('geofences')
export class GeofencesController {
  constructor(private readonly geofencesService: GeofencesService) {}

  @Get()
  async findAll(
    @Query() dto: ListGeofencesDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.geofencesService.findAll(dto, userId);
  }

  @Get('geocode')
  async geocode(@Query('address') address: string) {
    return this.geofencesService.geocodeSearch(address);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.geofencesService.findOne(id, userId);
  }

  @Post()
  async create(
    @Body() dto: CreateGeofenceDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.geofencesService.create(dto, userId);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateGeofenceDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.geofencesService.update(id, dto, userId);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.geofencesService.remove(id);
  }

  @Post(':id/check-point')
  async checkPoint(
    @Param('id') id: string,
    @Body() body: { lat: number; lng: number },
  ) {
    return this.geofencesService.checkPoint(id, body.lat, body.lng);
  }
}
