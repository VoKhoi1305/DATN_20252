import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as crypto from 'crypto';
import { Subject, SubjectLifecycle } from '../subjects/entities/subject.entity';
import { BiometricService } from '../biometric/biometric.service';
import { FaceRecognitionClient } from './face-recognition.client';
import { DevicesService } from '../devices/devices.service';
import { AreasService } from '../areas/areas.service';
import { DataScopeLevel } from '../users/entities/user.entity';
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
    private readonly areasService: AreasService,
    private readonly dataSource: DataSource,
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

    // Auto-recover from inconsistent state:
    // If lifecycle is KHOI_TAO (account created but not activated) OR
    // lifecycle is DANG_QUAN_LY but biometrics are missing (incomplete previous enrollment),
    // reset to ENROLLMENT so the subject can complete the process.
    if (
      subject.lifecycle === SubjectLifecycle.KHOI_TAO ||
      subject.lifecycle === SubjectLifecycle.DANG_QUAN_LY
    ) {
      const biometric = await this.biometricService.getEnrollmentStatus(subject.id);
      if (!biometric.nfcEnrolled || !biometric.faceEnrolled) {
        const prevLifecycle = subject.lifecycle;
        await this.subjectRepository.update(subject.id, {
          lifecycle: SubjectLifecycle.ENROLLMENT,
        });
        subject.lifecycle = SubjectLifecycle.ENROLLMENT;
        this.logger.log(
          `Subject ${subject.id} lifecycle auto-reset to ENROLLMENT (was ${prevLifecycle}, biometrics incomplete)`,
        );
      }
    }

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

    // If DG2 face image from CCCD chip is provided, store it and try to extract face template
    let dg2FaceEnrolled = false;
    if (data.dg2FaceImage) {
      try {
        const faceImageBuffer = Buffer.from(data.dg2FaceImage, 'base64');

        // Save DG2 face photo to disk and files table for future display
        await this.saveDg2FacePhoto(subject.id, faceImageBuffer, userId);

        // Try to extract face embedding via Python service
        try {
          const faceResult = await this.faceRecognitionClient.enrollFace(
            faceImageBuffer,
            'cccd_dg2_face.jpg',
          );

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
        } catch (faceErr: any) {
          // Face service might not be running — photo is saved, template will be created from selfie
          this.logger.warn(
            `DG2 face embedding extraction failed for subject ${subject.id}: ${faceErr.message}. Photo saved, will use selfie instead.`,
          );
        }
      } catch (e: any) {
        this.logger.warn(
          `DG2 face image processing failed for subject ${subject.id}: ${e.message}`,
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
      // Distinguish between service-down and processing errors
      const isConnectionError =
        error.message?.includes('ECONNREFUSED') ||
        error.message?.includes('fetch failed') ||
        error.cause?.code === 'ECONNREFUSED';
      throw new BadRequestException({
        code: ErrorCodes.FACE_ENROLLMENT_FAILED,
        message: isConnectionError
          ? 'Dịch vụ nhận diện khuôn mặt chưa sẵn sàng. Vui lòng liên hệ quản trị viên.'
          : (error.message || 'Không thể xử lý ảnh khuôn mặt. Vui lòng thử lại.'),
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
   * Step 4 (Subject): Submit enrollment for officer review.
   * Verifies NFC + Face + Device are done, then transitions:
   *   ENROLLMENT → DANG_CHO_PHE_DUYET
   * Notifies all officers in the subject's area.
   */
  async completeEnrollment(userId: string) {
    const subject = await this.findSubjectByUserId(userId);

    // Guard: only ENROLLMENT lifecycle can submit for approval.
    // DANG_CHO_PHE_DUYET = already submitted, DANG_QUAN_LY = already approved.
    if (subject.lifecycle === SubjectLifecycle.DANG_CHO_PHE_DUYET) {
      throw new BadRequestException({
        code: ErrorCodes.INVALID_LIFECYCLE_STATE,
        message: 'Hồ sơ đã được gửi đi và đang chờ cán bộ phê duyệt.',
      });
    }
    if (subject.lifecycle !== SubjectLifecycle.ENROLLMENT) {
      throw new BadRequestException({
        code: ErrorCodes.INVALID_LIFECYCLE_STATE,
        message: 'Không thể gửi đăng ký ở trạng thái hiện tại.',
      });
    }

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

    const now = new Date();

    // ENROLLMENT → DANG_CHO_PHE_DUYET (pending officer approval)
    await this.subjectRepository.update(subject.id, {
      lifecycle: SubjectLifecycle.DANG_CHO_PHE_DUYET,
      submittedAt: now,
      approvedById: null,
      approvedAt: null,
      approvalNote: null,
      rejectionNote: null,
    });

    this.logger.log(
      `Enrollment submitted for subject ${subject.id}. Lifecycle → DANG_CHO_PHE_DUYET`,
    );

    // Notify officers in the subject's area
    await this.notifyOfficersForApproval(subject);

    return {
      lifecycle: SubjectLifecycle.DANG_CHO_PHE_DUYET,
      message: 'Hồ sơ sinh trắc học đã được gửi để cán bộ xét duyệt. Vui lòng chờ thông báo.',
    };
  }

  // ── Officer Approval API ───────────────────────────────────

  /**
   * List subjects pending enrollment approval, scoped to the officer's area.
   *
   * Access rules:
   *   DISTRICT scope  → only subjects whose area_id = officer.area_id
   *   PROVINCE scope  → subjects in province + all child districts
   *   SYSTEM scope    → all pending subjects (IT_ADMIN)
   */
  async getPendingApprovals(officerUserId: string) {
    const officer = await this.findUserById(officerUserId);
    const areaIds = await this.areasService.resolveAreaIds(
      officer.data_scope_level as DataScopeLevel,
      officer.area_id,
    );

    const qb = this.subjectRepository
      .createQueryBuilder('s')
      .select([
        's.id', 's.code', 's.fullName', 's.areaId',
        's.lifecycle', 's.submittedAt', 's.enrollmentDate',
      ])
      .where('s.lifecycle = :lc', { lc: SubjectLifecycle.DANG_CHO_PHE_DUYET })
      .andWhere('s.deleted_at IS NULL')
      .orderBy('s.submitted_at', 'ASC');

    if (areaIds !== null) {
      qb.andWhere('s.area_id IN (:...areaIds)', { areaIds });
    }

    const subjects = await qb.getMany();
    return {
      total: subjects.length,
      items: subjects,
    };
  }

  /**
   * Approve a subject's enrollment.
   * Transitions: DANG_CHO_PHE_DUYET → DANG_QUAN_LY
   *
   * Only officers whose area scope covers the subject's area can approve.
   * IT_ADMIN (SYSTEM scope) can approve any subject.
   */
  async approveEnrollment(
    subjectId: string,
    officerUserId: string,
    note?: string,
  ) {
    const [subject, officer] = await Promise.all([
      this.findSubjectById(subjectId),
      this.findUserById(officerUserId),
    ]);

    if (subject.lifecycle !== SubjectLifecycle.DANG_CHO_PHE_DUYET) {
      throw new BadRequestException({
        code: ErrorCodes.INVALID_LIFECYCLE_STATE,
        message: 'Hồ sơ này không ở trạng thái chờ phê duyệt.',
      });
    }

    await this.checkOfficerAreaScope(officer, subject.areaId);

    const now = new Date();
    await this.subjectRepository.update(subjectId, {
      lifecycle: SubjectLifecycle.DANG_QUAN_LY,
      approvedById: officerUserId,
      approvedAt: now,
      approvalNote: note ?? null,
      rejectionNote: null,
    });

    this.logger.log(
      `Enrollment APPROVED for subject ${subjectId} by officer ${officerUserId}`,
    );

    // Notify subject
    await this.notifySubject(
      subject,
      'ENROLLMENT_APPROVED',
      'Đăng ký sinh trắc học được duyệt',
      'Hồ sơ của bạn đã được cán bộ phê duyệt. Tài khoản đã được kích hoạt.',
    );

    return {
      lifecycle: SubjectLifecycle.DANG_QUAN_LY,
      approvedAt: now,
      message: `Đã phê duyệt đăng ký sinh trắc học cho ${subject.fullName}.`,
    };
  }

  /**
   * Reject a subject's enrollment.
   * Transitions: DANG_CHO_PHE_DUYET → ENROLLMENT
   * The subject must redo enrollment (typically re-capture face/NFC).
   */
  async rejectEnrollment(
    subjectId: string,
    officerUserId: string,
    note: string,
  ) {
    const [subject, officer] = await Promise.all([
      this.findSubjectById(subjectId),
      this.findUserById(officerUserId),
    ]);

    if (subject.lifecycle !== SubjectLifecycle.DANG_CHO_PHE_DUYET) {
      throw new BadRequestException({
        code: ErrorCodes.INVALID_LIFECYCLE_STATE,
        message: 'Hồ sơ này không ở trạng thái chờ phê duyệt.',
      });
    }

    await this.checkOfficerAreaScope(officer, subject.areaId);

    const now = new Date();
    await this.subjectRepository.update(subjectId, {
      lifecycle: SubjectLifecycle.ENROLLMENT,
      approvedById: officerUserId,
      approvedAt: now,
      rejectionNote: note,
      approvalNote: null,
    });

    this.logger.log(
      `Enrollment REJECTED for subject ${subjectId} by officer ${officerUserId}. Note: ${note}`,
    );

    // Notify subject
    await this.notifySubject(
      subject,
      'ENROLLMENT_REJECTED',
      'Đăng ký sinh trắc học bị từ chối',
      `Hồ sơ của bạn bị từ chối. Lý do: ${note}. Vui lòng thực hiện lại đăng ký.`,
    );

    return {
      lifecycle: SubjectLifecycle.ENROLLMENT,
      rejectedAt: now,
      message: `Đã từ chối đăng ký của ${subject.fullName}. Đối tượng cần thực hiện lại.`,
    };
  }

  // ── Private helpers ────────────────────────────────────────

  /**
   * Save the DG2 face photo from CCCD chip as a file for later display.
   */
  private async saveDg2FacePhoto(
    subjectId: string,
    imageBuffer: Buffer,
    userId: string,
  ): Promise<void> {
    const fs = await import('fs/promises');
    const path = await import('path');

    const uploadDir = path.join(process.cwd(), 'uploads', 'subjects', subjectId);
    await fs.mkdir(uploadDir, { recursive: true });

    const storedName = `cccd_dg2_face_${Date.now()}.jpg`;
    const storedPath = path.join(uploadDir, storedName);
    await fs.writeFile(storedPath, imageBuffer);

    const relativePath = `/uploads/subjects/${subjectId}/${storedName}`;

    // Store in files table as FACE_PHOTO, public for subject to view
    await this.dataSource.query(
      `INSERT INTO files (original_name, stored_path, mime_type, size, file_type, entity_type, entity_id, uploaded_by_id, is_public)
       VALUES ($1, $2, $3, $4, 'FACE_PHOTO', 'SUBJECT', $5, $6, true)`,
      [
        'Ảnh chân dung CCCD',
        relativePath,
        'image/jpeg',
        imageBuffer.length,
        subjectId,
        userId,
      ],
    );

    this.logger.log(`DG2 face photo saved for subject ${subjectId}: ${relativePath}`);
  }

  /**
   * Find a subject by its primary UUID (used by officer approval endpoints).
   */
  private async findSubjectById(subjectId: string): Promise<Subject> {
    const subject = await this.subjectRepository.findOne({
      where: { id: subjectId },
    });
    if (!subject) {
      throw new NotFoundException({
        code: ErrorCodes.SUBJECT_NOT_FOUND,
        message: 'Không tìm thấy hồ sơ đối tượng',
      });
    }
    return subject;
  }

  /**
   * Fetch a user row (officers) by their user account ID.
   */
  private async findUserById(userId: string) {
    const rows = await this.dataSource.query(
      `SELECT id, area_id, data_scope_level, role FROM users WHERE id = $1 AND deleted_at IS NULL LIMIT 1`,
      [userId],
    );
    if (!rows.length) {
      throw new NotFoundException({ message: 'Không tìm thấy tài khoản cán bộ' });
    }
    return rows[0] as { id: string; area_id: string | null; data_scope_level: string; role: string };
  }

  /**
   * Verify the officer's area scope covers the given subjectAreaId.
   * Throws ForbiddenException if outside scope.
   */
  private async checkOfficerAreaScope(
    officer: { area_id: string | null; data_scope_level: string; role: string },
    subjectAreaId: string,
  ): Promise<void> {
    const areaIds = await this.areasService.resolveAreaIds(
      officer.data_scope_level as DataScopeLevel,
      officer.area_id,
    );

    // null means SYSTEM scope → access to all areas
    if (areaIds === null) return;

    if (!areaIds.includes(subjectAreaId)) {
      throw new ForbiddenException({
        code: ErrorCodes.FORBIDDEN,
        message: 'Bạn không có quyền phê duyệt hồ sơ thuộc khu vực này.',
      });
    }
  }

  /**
   * Notify all eligible officers in the subject's area when enrollment is submitted.
   * Officers who can approve:
   *   - IT_ADMIN (SYSTEM scope): always notified
   *   - CAN_BO_QUAN_LY / LANH_DAO with DISTRICT scope: area_id = subject.area_id
   *   - CAN_BO_QUAN_LY / LANH_DAO with PROVINCE scope: province covers subject's district
   */
  private async notifyOfficersForApproval(subject: Subject): Promise<void> {
    try {
      const officerIds: { id: string }[] = await this.dataSource.query(
        `SELECT u.id
         FROM users u
         WHERE u.deleted_at IS NULL
           AND u.status = 'ACTIVE'
           AND u.role IN ('IT_ADMIN', 'LANH_DAO', 'CAN_BO_QUAN_LY')
           AND (
             u.data_scope_level = 'SYSTEM'
             OR (u.data_scope_level = 'DISTRICT' AND u.area_id = $1)
             OR (u.data_scope_level = 'PROVINCE' AND u.area_id IN (
                   SELECT id FROM areas WHERE id = $1
                   UNION
                   SELECT parent_id FROM areas WHERE id = $1 AND parent_id IS NOT NULL
                 ))
           )`,
        [subject.areaId],
      );

      if (!officerIds.length) {
        this.logger.warn(
          `No eligible officers found for area ${subject.areaId} to notify about subject ${subject.id}`,
        );
        return;
      }

      // Insert one notification per officer (4 params each: user_id, title, message, entity_id)
      const values = officerIds
        .map(
          (_, i) =>
            `(uuid_generate_v4(), $${i * 4 + 1}, 'ENROLLMENT_PENDING', $${i * 4 + 2}, $${i * 4 + 3}, 'SUBJECT', $${i * 4 + 4}, 'WEB', false, NOW())`,
        )
        .join(', ');

      const params: string[] = [];
      for (const o of officerIds) {
        params.push(
          o.id,
          'Hồ sơ sinh trắc học chờ phê duyệt',
          `${subject.fullName} (${subject.code}) đã hoàn thành đăng ký sinh trắc học và chờ phê duyệt.`,
          subject.id,
        );
      }

      await this.dataSource.query(
        `INSERT INTO notifications (id, user_id, type, title, message, entity_type, entity_id, channel, is_read, created_at)
         VALUES ${values}`,
        params,
      );

      this.logger.log(
        `Notified ${officerIds.length} officer(s) about pending enrollment for subject ${subject.id}`,
      );
    } catch (e: any) {
      // Non-critical — don't fail enrollment submission if notification fails
      this.logger.warn(`Failed to send enrollment notifications: ${e.message}`);
    }
  }

  /**
   * Notify the subject's linked user account about approval/rejection result.
   */
  private async notifySubject(
    subject: Subject,
    type: string,
    title: string,
    message: string,
  ): Promise<void> {
    if (!subject.userAccountId) return;
    try {
      await this.dataSource.query(
        `INSERT INTO notifications (id, user_id, type, title, message, entity_type, entity_id, channel, is_read, created_at)
         VALUES (uuid_generate_v4(), $1, $2, $3, $4, 'SUBJECT', $5, 'WEB', false, NOW())`,
        [subject.userAccountId, type, title, message, subject.id],
      );
    } catch (e: any) {
      this.logger.warn(`Failed to notify subject ${subject.id}: ${e.message}`);
    }
  }

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
