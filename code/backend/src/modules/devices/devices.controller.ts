import { Controller, Get } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { DevicesService } from './devices.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subject } from '../subjects/entities/subject.entity';

@Controller('devices')
export class DevicesController {
  constructor(
    private readonly devicesService: DevicesService,
    @InjectRepository(Subject)
    private readonly subjectRepo: Repository<Subject>,
  ) {}

  /**
   * GET /api/v1/devices/current
   * Get the current active device for the logged-in subject.
   */
  @Get('current')
  async getCurrent(@CurrentUser('userId') userId: string) {
    const subject = await this.subjectRepo.findOne({
      where: { userAccountId: userId },
    });
    if (!subject) {
      return { current: null, history: [] };
    }

    const current = await this.devicesService.getActiveDevice(subject.id);
    const history = await this.devicesService.getDeviceHistory(subject.id);

    return {
      current: current
        ? {
            id: current.id,
            device_id: current.deviceId,
            device_model: current.deviceModel,
            os_version: current.osVersion,
            status: current.status,
            enrolled_at: current.enrolledAt,
          }
        : null,
      history: history.map((d) => ({
        id: d.id,
        device_id: d.deviceId,
        device_model: d.deviceModel,
        os_version: d.osVersion,
        status: d.status,
        enrolled_at: d.enrolledAt,
        replaced_at: d.replacedAt,
      })),
    };
  }
}
