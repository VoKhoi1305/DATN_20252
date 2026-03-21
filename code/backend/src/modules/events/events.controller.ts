import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { EventsService } from './events.service';
import { ListEventsDto } from './dto/list-events.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  async list(
    @Query() query: ListEventsDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.eventsService.list(userId, query);
  }

  @Get('recent')
  async getRecent(
    @CurrentUser('userId') userId: string,
    @Query('limit') limit?: string,
  ) {
    const take = limit ? Math.min(Math.max(Number(limit), 1), 100) : 10;
    return this.eventsService.getRecent(userId, take);
  }

  @Get('trace')
  async trace(@Query('cccd') cccd: string) {
    return this.eventsService.trace(cccd);
  }

  @Get('export')
  async exportExcel(
    @Query() query: ListEventsDto,
    @CurrentUser('userId') userId: string,
    @Res() res: Response,
  ) {
    const buffer = await this.eventsService.exportExcel(userId, query);
    const filename = `su-kien-${new Date().toISOString().slice(0, 10)}.xlsx`;
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

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.eventsService.findOne(id);
  }
}
