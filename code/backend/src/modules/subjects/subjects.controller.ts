import {
  Controller, Get, Post, Patch, Delete, Query, Param, Body, Res,
  UseInterceptors, UploadedFile, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
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

  @Get('export')
  async exportExcel(
    @Query() dto: ListSubjectsDto,
    @CurrentUser('userId') userId: string,
    @Res() res: Response,
  ) {
    const buffer = await this.subjectsService.exportExcel(dto, userId);
    const filename = `ho-so-doi-tuong-${new Date().toISOString().slice(0, 10)}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  @Post(':id/assign-scenario')
  async assignScenario(
    @Param('id') id: string,
    @Body('scenario_id') scenarioId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.subjectsService.assignScenario(id, scenarioId, userId);
  }

  @Post(':id/unassign-scenario')
  async unassignScenario(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.subjectsService.unassignScenario(id, userId);
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

  @Post(':id/documents')
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (_req: any, file: any, cb: any) => {
      const allowed = [
        'application/pdf',
        'image/jpeg', 'image/png', 'image/gif',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ];
      if (allowed.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new BadRequestException('Loại file không được hỗ trợ'), false);
      }
    },
  }))
  async uploadDocument(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('file_type') fileType: string,
    @CurrentUser('userId') userId: string,
  ) {
    if (!file) throw new BadRequestException('File không được để trống');
    return this.subjectsService.uploadDocument(id, file, fileType || 'OTHER', userId);
  }

  @Delete(':id/documents/:docId')
  async deleteDocument(
    @Param('id') id: string,
    @Param('docId') docId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.subjectsService.deleteDocument(id, docId, userId);
  }
}
