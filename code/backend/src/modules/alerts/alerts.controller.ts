import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Query,
  Body,
  Res,
  ParseUUIDPipe,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { Response } from 'express';
import { AlertsService } from './alerts.service';
import { ListAlertsDto } from './dto/list-alerts.dto';
import { EscalateAlertDto } from './dto/escalate-alert.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('alerts')
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Get()
  async list(
    @Query() query: ListAlertsDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.alertsService.list(userId, query);
  }

  @Get('open')
  async getOpen(
    @CurrentUser('userId') userId: string,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.alertsService.getOpen(userId, limit);
  }

  @Get('export')
  async exportExcel(
    @Query() query: ListAlertsDto,
    @CurrentUser('userId') userId: string,
    @Res() res: Response,
  ) {
    const buffer = await this.alertsService.exportExcel(userId, query);
    const filename = `canh-bao-${new Date().toISOString().slice(0, 10)}.xlsx`;
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
    return this.alertsService.findOne(id);
  }

  @Patch(':id/acknowledge')
  async acknowledge(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.alertsService.acknowledge(id, userId);
  }

  @Patch(':id/resolve')
  async resolve(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.alertsService.resolve(id, userId);
  }

  @Post(':id/escalate')
  async escalate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: EscalateAlertDto,
  ) {
    return this.alertsService.escalate(id, userId, dto);
  }
}
