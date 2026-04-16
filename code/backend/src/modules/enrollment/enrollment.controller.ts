import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';
import { EnrollmentService } from './enrollment.service';
import { EnrollNfcDto } from './dto/enroll-nfc.dto';
import { ResetEnrollmentDto } from './dto/reset-enrollment.dto';
import { EnrollDeviceDto } from '../devices/dto/enroll-device.dto';

@Controller('enrollment')
export class EnrollmentController {
  constructor(private readonly enrollmentService: EnrollmentService) {}

  /**
   * GET /api/v1/enrollment/status
   * Check enrollment progress for the current subject.
   */
  @Get('status')
  async getStatus(@CurrentUser('userId') userId: string) {
    return this.enrollmentService.getStatus(userId);
  }

  /**
   * POST /api/v1/enrollment/nfc
   * Submit NFC chip data read from CCCD via JMRTD.
   *
   * NFC reading process on mobile:
   * 1. User taps CCCD on phone's NFC reader
   * 2. App reads chip via JMRTD (ICAO 9303):
   *    - BAC authentication with MRZ-derived key
   *    - Read DG1 (personal data) + DG2 (face photo)
   *    - Read SOD (Document Security Object) for Passive Auth
   * 3. App sends chip data + serial + SOD to this endpoint
   * 4. Server hashes and stores in biometric DB
   */
  @Post('nfc')
  @HttpCode(HttpStatus.CREATED)
  async enrollNfc(
    @CurrentUser('userId') userId: string,
    @Body() dto: EnrollNfcDto,
  ) {
    return this.enrollmentService.enrollNfc(userId, {
      chipData: dto.chipData,
      chipSerial: dto.chipSerial,
      passiveAuthData: dto.passiveAuthData,
      chipFullName: dto.chipFullName,
      chipCccdNumber: dto.chipCccdNumber,
      dg2FaceImage: dto.dg2FaceImage,
    });
  }

  /**
   * POST /api/v1/enrollment/face
   * Upload face image for enrollment.
   *
   * Face processing pipeline:
   * 1. Mobile captures face photo (CameraX)
   * 2. Upload to this endpoint as multipart/form-data
   * 3. NestJS forwards image to Face Recognition service (Python/FastAPI)
   * 4. InsightFace/ArcFace processes:
   *    - RetinaFace detection → bounding box + landmarks
   *    - Quality assessment → sharpness + size + lighting
   *    - Liveness detection → anti-spoofing check
   *    - ArcFace-R100 → 512-dim embedding extraction
   * 5. NestJS stores embedding in biometric DB as BYTEA
   */
  @Post('face')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file'))
  async enrollFace(
    @CurrentUser('userId') userId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB
          new FileTypeValidator({ fileType: /(jpeg|jpg|png)$/i }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.enrollmentService.enrollFace(
      userId,
      file.buffer,
      file.originalname,
    );
  }

  /**
   * POST /api/v1/enrollment/device
   * Register the subject's device during enrollment.
   * Reads basic device info (Android ID, model, OS version) and stores it.
   * Each subject can only have 1 active device.
   */
  @Post('device')
  @HttpCode(HttpStatus.CREATED)
  async enrollDevice(
    @CurrentUser('userId') userId: string,
    @Body() dto: EnrollDeviceDto,
  ) {
    return this.enrollmentService.enrollDevice(userId, dto);
  }

  /**
   * POST /api/v1/enrollment/complete
   * Subject submits enrollment for officer review.
   * Transitions: ENROLLMENT → DANG_CHO_PHE_DUYET
   * Notifies officers in the subject's area.
   */
  @Post('complete')
  @HttpCode(HttpStatus.OK)
  async completeEnrollment(@CurrentUser('userId') userId: string) {
    return this.enrollmentService.completeEnrollment(userId);
  }

  // ── Officer Approval Endpoints ─────────────────────────────
  // Access: CAN_BO_QUAN_LY, LANH_DAO, IT_ADMIN only.
  // Area scope enforced inside service (DISTRICT / PROVINCE / SYSTEM).

  /**
   * GET /api/v1/enrollment/pending
   * List subjects waiting for enrollment approval, filtered to the officer's area.
   *
   *   DISTRICT scope → only subjects in officer's district
   *   PROVINCE scope → subjects in province + all child districts
   *   SYSTEM scope   → all pending subjects (IT_ADMIN)
   */
  @Get('pending')
  @UseGuards(RolesGuard)
  @Roles(UserRole.IT_ADMIN, UserRole.LANH_DAO, UserRole.CAN_BO_QUAN_LY)
  async getPendingApprovals(@CurrentUser('userId') officerUserId: string) {
    return this.enrollmentService.getPendingApprovals(officerUserId);
  }

  /**
   * POST /api/v1/enrollment/:subjectId/approve
   * Approve a subject's enrollment.
   * Transitions: DANG_CHO_PHE_DUYET → DANG_QUAN_LY
   * Subject receives a notification.
   */
  @Post(':subjectId/approve')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles(UserRole.IT_ADMIN, UserRole.LANH_DAO, UserRole.CAN_BO_QUAN_LY)
  async approveEnrollment(
    @Param('subjectId') subjectId: string,
    @Body('note') note: string | undefined,
    @CurrentUser('userId') officerUserId: string,
  ) {
    return this.enrollmentService.approveEnrollment(subjectId, officerUserId, note);
  }

  /**
   * POST /api/v1/enrollment/:subjectId/reject
   * Reject a subject's enrollment (sends back to ENROLLMENT state).
   * A rejection note is required so the subject knows what to fix.
   */
  @Post(':subjectId/reject')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles(UserRole.IT_ADMIN, UserRole.LANH_DAO, UserRole.CAN_BO_QUAN_LY)
  async rejectEnrollment(
    @Param('subjectId') subjectId: string,
    @Body('note') note: string,
    @CurrentUser('userId') officerUserId: string,
  ) {
    return this.enrollmentService.rejectEnrollment(subjectId, officerUserId, note);
  }

  /**
   * POST /api/v1/enrollment/:subjectId/reset
   * Re-enrollment: officer resets a subject's biometrics so they must redo enrollment.
   * Deactivates face templates + NFC records (history preserved); optionally resets device.
   * Transitions: DANG_QUAN_LY | DANG_CHO_PHE_DUYET | TAI_HOA_NHAP → ENROLLMENT
   */
  @Post(':subjectId/reset')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles(UserRole.IT_ADMIN, UserRole.LANH_DAO, UserRole.CAN_BO_QUAN_LY)
  async resetEnrollment(
    @Param('subjectId') subjectId: string,
    @Body() dto: ResetEnrollmentDto,
    @CurrentUser('userId') officerUserId: string,
  ) {
    return this.enrollmentService.resetEnrollment(
      subjectId,
      officerUserId,
      dto.reason,
      dto.resetDevice ?? false,
    );
  }
}
