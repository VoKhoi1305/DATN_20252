import { Controller, Get, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('alerts')
export class AlertsController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('open')
  async getOpenAlerts(
    @CurrentUser('userId') userId: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : 5;
    return this.dashboardService.getOpenAlerts(
      userId,
      isNaN(parsedLimit) ? 5 : Math.min(parsedLimit, 50),
    );
  }
}
