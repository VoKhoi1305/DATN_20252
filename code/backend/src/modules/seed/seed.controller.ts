import { Controller, Post, Delete } from '@nestjs/common';
import { SeedService } from './seed.service';
import { Public } from '../auth/decorators/public.decorator';

@Public()
@Controller('seed')
export class SeedController {
  constructor(private readonly seedService: SeedService) {}

  @Post('full')
  async seedFull() {
    return this.seedService.seedFull();
  }

  @Delete('clean')
  async clean() {
    return this.seedService.cleanSeedData();
  }

  // Keep legacy endpoint for backwards compat
  @Post('events-alerts-cases')
  async seedLegacy() {
    return this.seedService.seedFull();
  }
}
