import {
  Injectable,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Device, DeviceStatus } from './entities/device.entity';

@Injectable()
export class DevicesService {
  private readonly logger = new Logger(DevicesService.name);

  constructor(
    @InjectRepository(Device)
    private readonly deviceRepo: Repository<Device>,
  ) {}

  /**
   * Enroll a new device for a subject.
   * Replaces any existing active device (1 device per subject).
   */
  async enrollDevice(
    subjectId: string,
    data: { deviceId: string; deviceModel?: string; osVersion?: string },
  ): Promise<Device> {
    // Replace existing active device
    const existing = await this.getActiveDevice(subjectId);
    if (existing) {
      await this.deviceRepo.update(existing.id, {
        status: DeviceStatus.REPLACED,
        replacedAt: new Date(),
      });
      this.logger.log(
        `Replaced device ${existing.deviceId} for subject ${subjectId}`,
      );
    }

    const device = this.deviceRepo.create({
      subjectId,
      deviceId: data.deviceId,
      deviceModel: data.deviceModel ?? null,
      osVersion: data.osVersion ?? null,
      status: DeviceStatus.ACTIVE,
      enrolledAt: new Date(),
    });

    const saved = await this.deviceRepo.save(device);
    this.logger.log(
      `Enrolled device ${data.deviceId} (${data.deviceModel}) for subject ${subjectId}`,
    );
    return saved;
  }

  /**
   * Get the current active device for a subject.
   */
  async getActiveDevice(subjectId: string): Promise<Device | null> {
    return this.deviceRepo.findOne({
      where: { subjectId, status: DeviceStatus.ACTIVE },
    });
  }

  /**
   * Verify that the device matches the enrolled device.
   * Returns { matched, enrolledDeviceId } for logging.
   */
  async verifyDevice(
    subjectId: string,
    deviceId: string,
  ): Promise<{ matched: boolean; enrolledDeviceId: string | null }> {
    const active = await this.getActiveDevice(subjectId);
    if (!active) {
      return { matched: false, enrolledDeviceId: null };
    }
    return {
      matched: active.deviceId === deviceId,
      enrolledDeviceId: active.deviceId,
    };
  }

  /**
   * Get device history for a subject.
   */
  async getDeviceHistory(subjectId: string): Promise<Device[]> {
    return this.deviceRepo.find({
      where: { subjectId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Mark the subject's active device as REPLACED. The row is kept for history,
   * but the subject must enroll a new device. Idempotent — returns false when
   * no active device exists.
   */
  async resetActiveDevice(subjectId: string): Promise<boolean> {
    const active = await this.getActiveDevice(subjectId);
    if (!active) return false;

    await this.deviceRepo.update(active.id, {
      status: DeviceStatus.REPLACED,
      replacedAt: new Date(),
    });
    this.logger.log(
      `Reset active device ${active.deviceId} for subject ${subjectId}`,
    );
    return true;
  }
}
