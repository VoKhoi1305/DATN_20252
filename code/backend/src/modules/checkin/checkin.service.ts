import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
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
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Process a check-in submission.
   *
   * Pipeline:
   * 1. Identify subject from JWT
   * 2. Verify NFC chip hash against enrolled record
   * 3. Verify device matches enrolled device
   * 4. Verify face against stored template + liveness detection
   * 5. Check geofence (does NOT block check-in per SBR-06, but marks result as WARNING)
   * 6. Create Event record (SUCCESS/FAILED/WARNING) — ALWAYS created, even on partial failure
   * 7. Create BiometricLog record
   * 8. Return result with face match score
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
      nfcCccdMatch = nfcVerified;

      if (!nfcVerified) {
        errors.push('NFC chip hash does not match enrolled record');
        eventType = 'NFC_MISMATCH';
        eventResult = EventResult.FAILED;
        this.logger.warn(
          `NFC_MISMATCH for subject ${subject.id}: chip hash not matched`,
        );
      }
    } catch (e: any) {
      this.logger.error(`NFC verification error for subject ${subject.id}: ${e.message}`);
      errors.push(`NFC verification error: ${e.message}`);
      eventType = 'NFC_MISMATCH';
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
    // IMPORTANT: exceptions here must NOT prevent event creation.
    // If face verification cannot run (no template, API down), log the event as FAILED
    // and return a proper response — never throw before the event is created.
    let fatalError: BadRequestException | null = null;
    try {
      const faceTemplate = await this.biometricService.getActiveFaceTemplate(
        subject.id,
      );

      if (!faceTemplate) {
        // No template = enrollment incomplete. Log as FAILED but don't throw yet.
        errors.push('No enrolled face template found. Please complete enrollment first.');
        eventResult = EventResult.FAILED;
        fatalError = new BadRequestException({
          code: ErrorCodes.FACE_VERIFICATION_FAILED,
          message: 'Chưa đăng ký khuôn mặt. Vui lòng hoàn tất đăng ký sinh trắc học trước.',
        });
      } else {
        const storedEmbedding = this.biometricService.decodeEmbedding(
          faceTemplate.embedding,
        );

        const result = await this.faceRecognitionClient.verifyFaceWithLiveness(
          faceImageBuffer,
          faceImageFilename,
          storedEmbedding,
          faceThreshold / 100,
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
          if (eventResult !== EventResult.FAILED) {
            eventType = 'FACE_MISMATCH';
          }
          eventResult = EventResult.FAILED;
        }

        if (!livenessPass) {
          errors.push(`Liveness failed: score ${(livenessScore * 100).toFixed(1)}%`);
          eventResult = EventResult.FAILED;
        }
      }
    } catch (e: any) {
      // Capture but do NOT re-throw — we must still create the event log.
      this.logger.error(
        `Face verification error for subject ${subject.id}: ${e.message}`,
      );
      errors.push(`Face verification error: ${e.message}`);
      eventResult = EventResult.FAILED;
      if (e instanceof BadRequestException) {
        fatalError = e;
      }
    }

    // 5. Geofence check
    // Per SBR-06: wrong location does NOT block check-in, but is logged as WARNING.
    let inGeofence: boolean | null = null;
    let geofenceDistance: number | null = null;

    if (dto.gpsLat != null && dto.gpsLng != null) {
      const geo = await this.resolveActiveGeofence(subject.id);
      if (geo) {
        geofenceDistance = this.calculateDistanceMeters(
          dto.gpsLat,
          dto.gpsLng,
          geo.centerLat,
          geo.centerLng,
        );
        inGeofence = geofenceDistance <= geo.radius;

        if (!inGeofence) {
          errors.push(
            `Outside geofence: ${geofenceDistance}m from center (radius ${geo.radius}m)`,
          );
          // Per SBR-06: log GEOFENCE_EXIT and set WARNING only if nothing else has failed.
          if (eventResult === EventResult.SUCCESS) {
            eventResult = EventResult.WARNING;
            eventType = 'GEOFENCE_EXIT';
          } else {
            // Already FAILED — record the geofence violation in extra_data only.
            errors.push(`[GEOFENCE_EXIT distance=${geofenceDistance}m]`);
          }
        }
      }
    }

    // 6. Final result correction
    if (eventResult === EventResult.SUCCESS && !deviceMatched) {
      eventResult = EventResult.WARNING;
    }

    const matchDurationMs = Date.now() - startTime;

    // 7. Create Event — ALWAYS created regardless of what failed above.
    const event = await this.eventsService.createEvent({
      type: eventType,
      subjectId: subject.id,
      result: eventResult,
      gpsLat: dto.gpsLat,
      gpsLng: dto.gpsLng,
      inGeofence: inGeofence ?? undefined,
      geofenceDistance: geofenceDistance ?? undefined,
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

    // 8. Create BiometricLog
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

    this.logger.log(
      `Checkin ${event.code}: ${eventResult} | face=${(faceMatchScore * 100).toFixed(1)}% | nfc=${nfcVerified} | liveness=${livenessPass} | device=${deviceMatched} | geofence=${inGeofence} | ${matchDurationMs}ms`,
    );

    // 9. If face template was missing, return proper error after event is logged.
    if (fatalError) {
      throw fatalError;
    }

    // 10. Build response
    const message = this.buildResultMessage(
      eventResult,
      faceMatchScore,
      nfcVerified,
      livenessPass,
      deviceMatched,
      inGeofence,
    );

    return {
      event: {
        id: event.id,
        code: event.code,
        type: event.type,
        result: event.result,
        nfc_verified: nfcVerified,
        nfc_cccd_match: nfcCccdMatch,
        face_match_score: Math.round(faceMatchScore * 10000) / 100,
        liveness_score: Math.round(livenessScore * 10000) / 100,
        liveness_pass: livenessPass,
        device_matched: deviceMatched,
        in_geofence: event.inGeofence,
        geofence_distance: geofenceDistance,
        created_at: event.createdAt,
      },
      message,
    };
  }

  /**
   * Log a mobile-side NFC read failure as a FAILED event.
   * Called when the NFC chip cannot be read or passive auth fails on the device
   * — before any face image is captured, so no biometric log is created.
   */
  async logNfcFailure(
    userId: string,
    dto: {
      reason: string;
      chipSerial?: string;
      deviceId?: string;
      gpsLat?: number;
      gpsLng?: number;
      clientTimestamp: string;
    },
  ) {
    const subject = await this.findSubjectByUserId(userId);

    let inGeofence: boolean | null = null;
    let geofenceDistance: number | null = null;
    if (dto.gpsLat != null && dto.gpsLng != null) {
      const geo = await this.resolveActiveGeofence(subject.id);
      if (geo) {
        geofenceDistance = this.calculateDistanceMeters(dto.gpsLat, dto.gpsLng, geo.centerLat, geo.centerLng);
        inGeofence = geofenceDistance <= geo.radius;
      }
    }

    const event = await this.eventsService.createEvent({
      type: 'NFC_MISMATCH',
      subjectId: subject.id,
      result: EventResult.FAILED,
      gpsLat: dto.gpsLat,
      gpsLng: dto.gpsLng,
      inGeofence: inGeofence ?? undefined,
      geofenceDistance: geofenceDistance ?? undefined,
      nfcVerified: false,
      nfcCccdMatch: false,
      deviceId: dto.deviceId,
      clientTimestamp: new Date(dto.clientTimestamp),
      isVoluntary: true,
      extraData: {
        nfcReadError: dto.reason,
        chipSerial: dto.chipSerial ?? null,
        source: 'mobile_nfc_failure',
      },
    });

    this.logger.warn(
      `NFC read failure logged for subject ${subject.id}: reason=${dto.reason} event=${event.code}`,
    );

    return {
      eventId: event.id,
      eventCode: event.code,
      message: 'Ghi nhận lỗi quét NFC thành công',
    };
  }

  // ── Private helpers ────────────────────────────────────────

  /**
   * Find the active scenario's geofence for a subject.
   * Returns null if no active scenario or scenario has no geofence.
   */
  private async resolveActiveGeofence(
    subjectId: string,
  ): Promise<{ centerLat: number; centerLng: number; radius: number } | null> {
    try {
      const rows = await this.dataSource.query(
        `SELECT g.center_lat, g.center_lng, g.radius
         FROM scenario_assignments sa
         JOIN management_scenarios ms ON ms.id = sa.scenario_id
         JOIN geofences g ON g.id = ms.geofence_id
         WHERE sa.subject_id = $1
           AND sa.status = 'ACTIVE'
           AND ms.status = 'ACTIVE'
           AND ms.geofence_id IS NOT NULL
           AND g.deleted_at IS NULL
           AND g.center_lat IS NOT NULL
           AND g.center_lng IS NOT NULL
           AND g.radius IS NOT NULL
         LIMIT 1`,
        [subjectId],
      );
      if (!rows.length) return null;
      return {
        centerLat: Number(rows[0].center_lat),
        centerLng: Number(rows[0].center_lng),
        radius: Number(rows[0].radius),
      };
    } catch (e: any) {
      this.logger.warn(`Could not resolve geofence for subject ${subjectId}: ${e.message}`);
      return null;
    }
  }

  /**
   * Haversine formula — distance in meters between two GPS coordinates.
   */
  private calculateDistanceMeters(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): number {
    const R = 6371000;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  }

  private buildResultMessage(
    result: EventResult,
    faceScore: number,
    nfcOk: boolean,
    livenessOk: boolean,
    deviceOk: boolean,
    inGeofence: boolean | null,
  ): string {
    if (result === EventResult.SUCCESS) {
      return `Điểm danh thành công. Khuôn mặt khớp ${(faceScore * 100).toFixed(0)}%.`;
    }

    const issues: string[] = [];
    if (!nfcOk) issues.push('NFC không khớp');
    if (faceScore > 0 && faceScore < 0.45) issues.push(`Khuôn mặt không khớp (${(faceScore * 100).toFixed(0)}%)`);
    if (!livenessOk && faceScore > 0) issues.push('Phát hiện ảnh tĩnh');
    if (!deviceOk) issues.push('Thiết bị không khớp');
    if (inGeofence === false) issues.push('Ngoài vùng cho phép');

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
