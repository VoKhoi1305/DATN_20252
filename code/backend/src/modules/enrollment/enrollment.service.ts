import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { Subject, SubjectLifecycle } from '../subjects/entities/subject.entity';
import { BiometricService } from '../biometric/biometric.service';
import { FaceRecognitionClient } from './face-recognition.client';
import { DevicesService } from '../devices/devices.service';
import { ErrorCodes } from '../../common/constants/error-codes';

@Injectable()
export class EnrollmentService {
  private readonly logger = new Logger(EnrollmentService.name);

  constructor(
    @InjectRepository(Subject)
    private readonly subjectRepository: Repository<Subject>,
    private readonly biometricService: BiometricService,
    private readonly faceRecognitionClient: FaceRecognitionClient,
    private readonly devicesService: DevicesService,
  ) {}

  /**
   * Get current enrollment status for a subject.
   */
  async getStatus(subjectId: string) {
    const subject = await this.findSubjectByUserId(subjectId);
    const biometric = await this.biometricService.getEnrollmentStatus(subject.id);
    const device = await this.devicesService.getActiveDevice(subject.id);

    return {
      subjectId: subject.id,
      lifecycle: subject.lifecycle,
      nfcEnrolled: biometric.nfcEnrolled,
      faceEnrolled: biometric.faceEnrolled,
      deviceEnrolled: device !== null,
      enrollmentComplete: biometric.complete && device !== null,
    };
  }

  /**
   * Step 1: Enroll NFC data from CCCD chip.
   *
   * NFC Technology for Vietnamese CCCD (Căn cước công dân):
   * ─────────────────────────────────────────────────────────
   * The CCCD chip follows ICAO 9303 standard (same as e-Passports):
   *
   * 1. BAC (Basic Access Control):
   *    - Mobile reads MRZ (Machine Readable Zone) via OCR or manual input
   *    - MRZ data (CCCD number + DOB + expiry) derives session key
   *    - Session key unlocks chip communication (encrypted channel)
   *
   * 2. Data Groups stored on chip:
   *    - DG1: MRZ data (personal info: name, DOB, CCCD number, gender)
   *    - DG2: Face photo (JPEG2000, used for cross-matching)
   *    - DG3: Fingerprints (access restricted)
   *    - DG14: Security info for Active Authentication
   *
   * 3. Passive Authentication (what we verify):
   *    - Chip contains SOD (Document Security Object)
   *    - SOD has digital signature from Vietnam's CSCA (Country Signing CA)
   *    - We verify: SOD signature → proves data hasn't been tampered
   *    - Hash chain: SOD signs hashes of DG1, DG2, DG3
   *    - If hashes match → chip data is genuine
   *
   * 4. Active Authentication (optional, prevents chip cloning):
   *    - Chip proves it has a private key (challenge-response)
   *    - Proves this is the original chip, not a copy
   *
   * Library: JMRTD (Java Machine Readable Travel Documents) on Android
   * ─────────────────────────────────────────────────────────
   */
  async enrollNfc(
    userId: string,
    data: {
      chipData: string;
      chipSerial?: string;
      passiveAuthData?: string;
      chipFullName?: string;
      chipCccdNumber?: string;
      dg2FaceImage?: string; // Base64-encoded face photo from CCCD chip DG2
    },
  ) {
    const subject = await this.findSubjectByUserId(userId);

    this.validateEnrollmentState(subject);

    // Cross-verify chip CCCD number with subject record
    if (data.chipCccdNumber) {
      const chipCccdHash = crypto
        .createHash('sha256')
        .update(data.chipCccdNumber)
        .digest('hex');
      if (chipCccdHash !== subject.cccdHash) {
        throw new BadRequestException({
          code: ErrorCodes.CCCD_MISMATCH,
          message:
            'Số CCCD trên chip không khớp với hồ sơ. Vui lòng sử dụng đúng CCCD đã đăng ký.',
        });
      }
    }

    // Cross-verify name from chip
    if (data.chipFullName) {
      const chipName = data.chipFullName.trim().toUpperCase();
      const subjectName = subject.fullName.trim().toUpperCase();
      if (chipName !== subjectName) {
        this.logger.warn(
          `NFC name mismatch for subject ${subject.id}: chip="${chipName}" vs record="${subjectName}"`,
        );
        // Log warning but don't block — name formatting may differ
      }
    }

    // Hash chip data for storage
    const chipHash = this.biometricService.hashChipData(data.chipData);

    // Decode Passive Authentication data if provided
    const passiveAuthBuffer = data.passiveAuthData
      ? Buffer.from(data.passiveAuthData, 'base64')
      : undefined;

    // Store NFC record in biometric DB
    const nfcRecord = await this.biometricService.enrollNfcRecord({
      subjectId: subject.id,
      cccdChipHash: chipHash,
      chipSerial: data.chipSerial,
      passiveAuthData: passiveAuthBuffer,
    });

    this.logger.log(`NFC enrolled for subject ${subject.id}`);

    // If DG2 face image from CCCD chip is provided, extract and store face template
    let dg2FaceEnrolled = false;
    if (data.dg2FaceImage) {
      try {
        const faceImageBuffer = Buffer.from(data.dg2FaceImage, 'base64');
        const faceResult = await this.faceRecognitionClient.enrollFace(
          faceImageBuffer,
          'cccd_dg2_face.jpg',
        );

        // Store the CCCD face embedding as the reference template
        const sourceImageHash = crypto
          .createHash('sha256')
          .update(faceImageBuffer)
          .digest('hex');

        await this.biometricService.enrollFaceTemplate({
          subjectId: subject.id,
          embedding: faceResult.embedding,
          embeddingVersion: faceResult.embedding_version,
          sourceImageHash,
          qualityScore: faceResult.quality_score,
        });

        dg2FaceEnrolled = true;
        this.logger.log(
          `DG2 face template enrolled for subject ${subject.id} (quality=${faceResult.quality_score})`,
        );
      } catch (e: any) {
        // DG2 face enrollment is optional — log but don't block
        this.logger.warn(
          `DG2 face enrollment failed for subject ${subject.id}: ${e.message}. Will use selfie enrollment instead.`,
        );
      }
    }

    return {
      nfcRecordId: nfcRecord.id,
      enrolledAt: nfcRecord.enrolledAt,
      dg2FaceEnrolled,
      message: dg2FaceEnrolled
        ? 'Đăng ký NFC và ảnh chân dung CCCD thành công'
        : 'Đăng ký NFC thành công',
    };
  }

  /**
   * Step 2: Enroll face image.
   *
   * Face Recognition Technology:
   * ─────────────────────────────────────────────────────────
   * Model: InsightFace buffalo_l pack with ArcFace-R100
   *
   * 1. Detection — RetinaFace:
   *    - Single-stage anchor-free detector
   *    - Handles various poses, occlusions, small faces
   *    - Returns bounding box + 5-point landmarks
   *
   * 2. Recognition — ArcFace (Additive Angular Margin Loss):
   *    - ResNet-100 backbone trained on MS1MV3 dataset
   *    - Produces 512-dimensional L2-normalized embedding
   *    - Cosine similarity for matching (dot product since normalized)
   *    - Threshold: 0.45 for 1:1 verification (configurable per scenario)
   *    - Accuracy: 99.83% on LFW, 98.28% on CFP-FP
   *
   * 3. Anti-Spoofing / Liveness Detection:
   *    - Texture-based frequency analysis:
   *      a) Laplacian variance — measures micro-texture sharpness
   *      b) DCT high-frequency energy — real faces have richer HF
   *      c) Color saturation variance — screens have limited gamut
   *    - Combined weighted score (threshold: 0.5)
   *    - Prevents: printed photo attacks, screen replay attacks
   *
   * 4. Quality Assessment:
   *    - Detection confidence (RetinaFace score)
   *    - Face sharpness (Laplacian variance)
   *    - Face size (min 80px for reliable embedding)
   *    - Combined quality score must exceed 0.4
   *
   * Pipeline: Device captures image → NestJS receives upload →
   *           Forwards to Python FastAPI service → InsightFace processes →
   *           Returns embedding + quality + liveness → NestJS stores in biometric DB
   * ─────────────────────────────────────────────────────────
   */
  async enrollFace(
    userId: string,
    imageBuffer: Buffer,
    filename: string,
  ) {
    const subject = await this.findSubjectByUserId(userId);

    this.validateEnrollmentState(subject);

    // Send to Face Recognition service for processing
    let faceResult;
    try {
      faceResult = await this.faceRecognitionClient.enrollFace(imageBuffer, filename);
    } catch (error: any) {
      this.logger.error(`Face service error: ${error.message}`);
      throw new BadRequestException({
        code: ErrorCodes.FACE_ENROLLMENT_FAILED,
        message: error.message || 'Không thể xử lý ảnh khuôn mặt. Vui lòng thử lại.',
      });
    }

    // Validate liveness
    if (!faceResult.liveness.is_real) {
      throw new BadRequestException({
        code: ErrorCodes.LIVENESS_CHECK_FAILED,
        message:
          'Phát hiện khuôn mặt không thật. Vui lòng chụp trực tiếp khuôn mặt, không sử dụng ảnh in hoặc màn hình.',
      });
    }

    // Hash source image for audit trail
    const sourceImageHash = crypto
      .createHash('sha256')
      .update(imageBuffer)
      .digest('hex');

    // Store face template in biometric DB
    const template = await this.biometricService.enrollFaceTemplate({
      subjectId: subject.id,
      embedding: faceResult.embedding,
      embeddingVersion: faceResult.embedding_version,
      sourceImageHash,
      qualityScore: faceResult.quality_score,
    });

    this.logger.log(
      `Face enrolled for subject ${subject.id} (quality=${faceResult.quality_score}, liveness=${faceResult.liveness.liveness_score})`,
    );

    return {
      faceTemplateId: template.id,
      enrolledAt: template.enrolledAt,
      qualityScore: faceResult.quality_score,
      livenessScore: faceResult.liveness.liveness_score,
      message: 'Đăng ký khuôn mặt thành công',
    };
  }

  /**
   * Step 3: Enroll the subject's device.
   * Captures Android device ID, model, and OS version.
   */
  async enrollDevice(
    userId: string,
    data: { deviceId: string; deviceModel?: string; osVersion?: string },
  ) {
    const subject = await this.findSubjectByUserId(userId);

    this.validateEnrollmentState(subject);

    const device = await this.devicesService.enrollDevice(subject.id, data);

    this.logger.log(
      `Device enrolled for subject ${subject.id}: ${data.deviceId} (${data.deviceModel})`,
    );

    return {
      deviceRecordId: device.id,
      enrolledAt: device.enrolledAt,
      message: 'Đăng ký thiết bị thành công',
    };
  }

  /**
   * Complete enrollment: verify NFC + Face + Device are done, transition lifecycle.
   */
  async completeEnrollment(userId: string) {
    const subject = await this.findSubjectByUserId(userId);

    const status = await this.biometricService.getEnrollmentStatus(subject.id);

    if (!status.nfcEnrolled) {
      throw new BadRequestException({
        code: ErrorCodes.ENROLLMENT_INCOMPLETE,
        message: 'Chưa hoàn thành đăng ký NFC CCCD',
      });
    }

    if (!status.faceEnrolled) {
      throw new BadRequestException({
        code: ErrorCodes.ENROLLMENT_INCOMPLETE,
        message: 'Chưa hoàn thành đăng ký khuôn mặt',
      });
    }

    const device = await this.devicesService.getActiveDevice(subject.id);
    if (!device) {
      throw new BadRequestException({
        code: ErrorCodes.ENROLLMENT_INCOMPLETE,
        message: 'Chưa đăng ký thiết bị. Vui lòng hoàn thành bước đăng ký thiết bị.',
      });
    }

    // Transition lifecycle: ENROLLMENT → DANG_QUAN_LY
    await this.subjectRepository.update(subject.id, {
      lifecycle: SubjectLifecycle.DANG_QUAN_LY,
    });

    this.logger.log(
      `Enrollment complete for subject ${subject.id}. Lifecycle → DANG_QUAN_LY`,
    );

    return {
      lifecycle: SubjectLifecycle.DANG_QUAN_LY,
      message: 'Hoàn tất đăng ký sinh trắc học. Tài khoản đã được kích hoạt đầy đủ.',
    };
  }

  // ── Private helpers ────────────────────────────────────────

  private async findSubjectByUserId(userId: string): Promise<Subject> {
    const subject = await this.subjectRepository.findOne({
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

  private validateEnrollmentState(subject: Subject): void {
    if (subject.lifecycle !== SubjectLifecycle.ENROLLMENT) {
      throw new BadRequestException({
        code: ErrorCodes.INVALID_LIFECYCLE_STATE,
        message:
          subject.lifecycle === SubjectLifecycle.KHOI_TAO
            ? 'Tài khoản chưa được kích hoạt. Vui lòng kích hoạt trước.'
            : 'Đối tượng đã hoàn tất đăng ký sinh trắc học.',
      });
    }
  }
}
