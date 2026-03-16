import { Controller, Get, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('events')
export class EventsController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('recent')
  async getRecentEvents(
    @CurrentUser('userId') userId: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : 5;
    return this.dashboardService.getRecentEvents(
      userId,
      isNaN(parsedLimit) ? 5 : Math.min(parsedLimit, 50),
    );
  }
}
