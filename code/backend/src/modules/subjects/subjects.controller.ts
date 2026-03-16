import { Controller, Get, Post, Patch, Query, Param, Body } from '@nestjs/common';
import { SubjectsService } from './subjects.service';
import { ListSubjectsDto } from './dto/list-subjects.dto';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { TimelineQueryDto } from './dto/timeline-query.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('subjects')
export class SubjectsController {
  constructor(private readonly subjectsService: SubjectsService) {}

  @Get()
  async findAll(
    @Query() dto: ListSubjectsDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.subjectsService.findAll(dto, userId);
  }

  @Get('scenarios')
  async getScenarios() {
    return this.subjectsService.getActiveScenarios();
  }

  @Get('check-cccd')
  async checkCccd(@Query('cccd') cccd: string) {
    return this.subjectsService.checkCccd(cccd);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.subjectsService.findOne(id, userId);
  }

  @Post()
  async create(
    @Body() dto: CreateSubjectDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.subjectsService.create(dto, userId);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateSubjectDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.subjectsService.update(id, dto, userId);
  }

  @Get(':id/timeline')
  async getTimeline(
    @Param('id') id: string,
    @Query() query: TimelineQueryDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.subjectsService.getTimeline(id, userId, query);
  }

  @Get(':id/devices')
  async getDevices(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.subjectsService.getDevices(id, userId);
  }

  @Get(':id/documents')
  async getDocuments(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.subjectsService.getDocuments(id, userId);
  }
}
