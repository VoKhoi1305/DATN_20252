import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subject } from '../subjects/entities/subject.entity';
import { BiometricService } from '../biometric/biometric.service';
import { FaceRecognitionClient } from '../enrollment/face-recognition.client';
import { DevicesService } from '../devices/devices.service';
import { EventsService } from '../events/events.service';
import { EventResult } from '../events/entities/event.entity';
import {
  FaceResult,
  LivenessResult as BiometricLivenessResult,
  NfcResult,
} from '../biometric/entities/biometric-log.entity';
import { ErrorCodes } from '../../common/constants/error-codes';
import { CreateCheckinDto } from './dto/create-checkin.dto';

@Injectable()
export class CheckinService {
  private readonly logger = new Logger(CheckinService.name);

  constructor(
    @InjectRepository(Subject)
    private readonly subjectRepo: Repository<Subject>,
    private readonly biometricService: BiometricService,
    private readonly faceRecognitionClient: FaceRecognitionClient,
    private readonly devicesService: DevicesService,
    private readonly eventsService: EventsService,
  ) {}

  /**
   * Process a check-in submission.
   *
   * Pipeline:
   * 1. Identify subject from JWT
   * 2. Verify NFC chip hash against enrolled record
   * 3. Verify device matches enrolled device
   * 4. Verify face against stored template + liveness detection
   * 5. Create Event record (SUCCESS/FAILED/WARNING)
   * 6. Create BiometricLog record
   * 7. Return result with face match score
   */
  async processCheckin(
    userId: string,
    dto: CreateCheckinDto,
    faceImageBuffer: Buffer,
    faceImageFilename: string,
  ) {
    const startTime = Date.now();

    // 1. Find subject
    const subject = await this.findSubjectByUserId(userId);

    // Track results for event/log creation
    let nfcVerified = false;
    let nfcCccdMatch = false;
    let faceMatchScore = 0;
    let faceMatched = false;
    let livenessScore = 0;
    let livenessPass = false;
    let deviceMatched = true;
    let faceThreshold = 45; // default 0.45 as percentage
    let eventResult = EventResult.SUCCESS;
    let eventType = 'CHECKIN';
    const errors: string[] = [];

    // 2. NFC verification
    try {
      const chipHash = this.biometricService.hashChipData(dto.chipDataHash);
      nfcVerified = await this.biometricService.verifyNfc(
        subject.id,
        chipHash,
      );
      nfcCccdMatch = nfcVerified; // chip hash implies CCCD match

      if (!nfcVerified) {
        errors.push('NFC chip hash does not match enrolled record');
        eventType = 'NFC_MISMATCH';
        eventResult = EventResult.FAILED;
      }
    } catch (e: any) {
      this.logger.error(`NFC verification error for subject ${subject.id}: ${e.message}`);
      errors.push(`NFC verification error: ${e.message}`);
      eventResult = EventResult.FAILED;
    }

    // 3. Device verification
    if (dto.deviceId) {
      const deviceCheck = await this.devicesService.verifyDevice(
        subject.id,
        dto.deviceId,
      );
      deviceMatched = deviceCheck.matched;
      if (!deviceMatched) {
        errors.push(
          `Device mismatch: got ${dto.deviceId}, enrolled ${deviceCheck.enrolledDeviceId}`,
        );
        if (eventResult !== EventResult.FAILED) {
          eventResult = EventResult.WARNING;
          eventType = 'DEVICE_CHANGE';
        }
      }
    }

    // 4. Face verification + liveness
    try {
      const faceTemplate = await this.biometricService.getActiveFaceTemplate(
        subject.id,
      );

      if (!faceTemplate) {
        throw new BadRequestException({
          code: ErrorCodes.FACE_VERIFICATION_FAILED,
          message: 'No enrolled face template found. Please complete enrollment first.',
        });
      }

      const storedEmbedding = this.biometricService.decodeEmbedding(
        faceTemplate.embedding,
      );

      // Run face verify + liveness in parallel
      const result = await this.faceRecognitionClient.verifyFaceWithLiveness(
        faceImageBuffer,
        faceImageFilename,
        storedEmbedding,
        faceThreshold / 100, // convert percentage to decimal
      );

      faceMatchScore = result.verify.similarity;
      faceMatched = result.verify.match;
      faceThreshold = Math.round(result.verify.threshold * 100);
      livenessScore = result.liveness.liveness_score;
      livenessPass = result.liveness.is_real;

      if (!faceMatched) {
        errors.push(
          `Face mismatch: score ${(faceMatchScore * 100).toFixed(1)}% < threshold ${faceThreshold}%`,
        );
        eventType = 'FACE_MISMATCH';
        eventResult = EventResult.FAILED;
      }

      if (!livenessPass) {
        errors.push(
          `Liveness failed: score ${(livenessScore * 100).toFixed(1)}%`,
        );
        if (eventResult !== EventResult.FAILED) {
          eventResult = EventResult.FAILED;
        }
      }
    } catch (e: any) {
      if (e instanceof BadRequestException) throw e;
      this.logger.error(
        `Face verification error for subject ${subject.id}: ${e.message}`,
      );
      errors.push(`Face verification error: ${e.message}`);
      eventResult = EventResult.FAILED;
    }

    // 5. Determine final result
    if (eventResult === EventResult.SUCCESS && !deviceMatched) {
      eventResult = EventResult.WARNING;
    }

    const matchDurationMs = Date.now() - startTime;

    // 6. Create Event
    const event = await this.eventsService.createEvent({
      type: eventType,
      subjectId: subject.id,
      result: eventResult,
      gpsLat: dto.gpsLat,
      gpsLng: dto.gpsLng,
      faceMatchScore: Math.round(faceMatchScore * 100) / 100,
      nfcVerified,
      nfcCccdMatch,
      livenessScore: Math.round(livenessScore * 100) / 100,
      deviceId: dto.deviceId,
      deviceInfo: dto.deviceModel
        ? { model: dto.deviceModel, os: dto.osVersion }
        : undefined,
      clientTimestamp: dto.clientTimestamp
        ? new Date(dto.clientTimestamp)
        : undefined,
      isVoluntary: true,
      extraData: errors.length > 0 ? { errors } : undefined,
    });

    // 7. Create BiometricLog
    await this.biometricService.createBiometricLog({
      subjectId: subject.id,
      eventId: event.id,
      faceMatchScore,
      faceThreshold,
      faceResult: faceMatched
        ? FaceResult.MATCH
        : faceMatchScore > 0
          ? FaceResult.MISMATCH
          : FaceResult.ERROR,
      livenessResult: livenessPass
        ? BiometricLivenessResult.PASS
        : livenessScore > 0
          ? BiometricLivenessResult.FAIL
          : BiometricLivenessResult.SKIPPED,
      nfcResult: nfcVerified
        ? NfcResult.VERIFIED
        : NfcResult.FAILED,
      matchDurationMs,
    });

    // 8. Build response
    const message = this.buildResultMessage(
      eventResult,
      faceMatchScore,
      nfcVerified,
      livenessPass,
      deviceMatched,
    );

    this.logger.log(
      `Checkin ${event.code}: ${eventResult} | face=${(faceMatchScore * 100).toFixed(1)}% | nfc=${nfcVerified} | liveness=${livenessPass} | device=${deviceMatched} | ${matchDurationMs}ms`,
    );

    return {
      event: {
        id: event.id,
        code: event.code,
        type: event.type,
        result: event.result,
        nfc_verified: nfcVerified,
        nfc_cccd_match: nfcCccdMatch,
        face_match_score: Math.round(faceMatchScore * 10000) / 100, // as percentage 0-100
        liveness_score: Math.round(livenessScore * 10000) / 100,
        liveness_pass: livenessPass,
        device_matched: deviceMatched,
        in_geofence: event.inGeofence,
        created_at: event.createdAt,
      },
      message,
    };
  }

  private buildResultMessage(
    result: EventResult,
    faceScore: number,
    nfcOk: boolean,
    livenessOk: boolean,
    deviceOk: boolean,
  ): string {
    if (result === EventResult.SUCCESS) {
      return `Điểm danh thành công. Khuôn mặt khớp ${(faceScore * 100).toFixed(0)}%.`;
    }

    const issues: string[] = [];
    if (!nfcOk) issues.push('NFC không khớp');
    if (faceScore < 0.45) issues.push(`Khuôn mặt không khớp (${(faceScore * 100).toFixed(0)}%)`);
    if (!livenessOk) issues.push('Phát hiện ảnh tĩnh');
    if (!deviceOk) issues.push('Thiết bị không khớp');

    if (result === EventResult.WARNING) {
      return `Điểm danh có cảnh báo: ${issues.join(', ')}.`;
    }

    return `Điểm danh thất bại: ${issues.join(', ')}.`;
  }

  private async findSubjectByUserId(userId: string): Promise<Subject> {
    const subject = await this.subjectRepo.findOne({
      where: { userAccountId: userId },
    });

    if (!subject) {
      throw new NotFoundException({
        code: ErrorCodes.SUBJECT_NOT_FOUND,
        message: 'Không tìm thấy hồ sơ đối tượng liên kết với tài khoản này',
      });
    }

    return subject;
  }
}
