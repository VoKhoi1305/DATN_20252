import { Controller, Get } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  async getSummary(@CurrentUser('userId') userId: string) {
    return this.dashboardService.getSummary(userId);
  }

  @Get('charts')
  async getCharts(@CurrentUser('userId') userId: string) {
    return this.dashboardService.getCharts(userId);
  }
}
