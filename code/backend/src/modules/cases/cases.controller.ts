import { Controller, Get, Post, Patch, Query, Param, Body, Res } from '@nestjs/common';
import { Response } from 'express';
import { CasesService } from './cases.service';
import { ListCasesDto } from './dto/list-cases.dto';
import { CreateCaseDto } from './dto/create-case.dto';
import { CloseCaseDto } from './dto/close-case.dto';
import { CreateNoteDto } from './dto/create-note.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('cases')
export class CasesController {
  constructor(private readonly casesService: CasesService) {}

  @Get()
  async findAll(
    @Query() query: ListCasesDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.casesService.list(userId, query);
  }

  @Get('export')
  async exportExcel(
    @Query() query: ListCasesDto,
    @CurrentUser('userId') userId: string,
    @Res() res: Response,
  ) {
    const buffer = await this.casesService.exportExcel(userId, query);
    const filename = `vu-viec-${new Date().toISOString().slice(0, 10)}.xlsx`;
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`,
    );
    res.send(buffer);
  }

  @Post()
  async create(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateCaseDto,
  ) {
    return this.casesService.create(userId, dto);
  }

  @Patch(':id/close')
  async close(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: CloseCaseDto,
  ) {
    return this.casesService.close(id, userId, dto);
  }

  @Post(':id/reopen')
  async reopen(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.casesService.reopen(id, userId);
  }

  @Get(':id/notes')
  async getNotes(@Param('id') id: string) {
    return this.casesService.getNotes(id);
  }

  @Post(':id/notes')
  async addNote(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateNoteDto,
  ) {
    return this.casesService.addNote(id, userId, dto);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.casesService.findOne(id);
  }
}
