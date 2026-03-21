import { Controller, Get, Post, Patch, Delete, Query, Param, Body } from '@nestjs/common';
import { ScenariosService } from './scenarios.service';
import { ListScenariosDto } from './dto/list-scenarios.dto';
import { CreateScenarioDto } from './dto/create-scenario.dto';
import { UpdateScenarioDto } from './dto/update-scenario.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('scenarios')
export class ScenariosController {
  constructor(private readonly scenariosService: ScenariosService) {}

  @Get()
  async findAll(
    @Query() dto: ListScenariosDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.scenariosService.findAll(dto, userId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.scenariosService.findOne(id);
  }

  @Post()
  async create(
    @Body() dto: CreateScenarioDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.scenariosService.create(dto, userId);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateScenarioDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.scenariosService.update(id, dto, userId);
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.scenariosService.updateStatus(id, status, userId);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.scenariosService.remove(id);
  }
}
