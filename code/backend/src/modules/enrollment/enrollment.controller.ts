import {
  Controller,
  Get,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { EnrollmentService } from './enrollment.service';
import { EnrollNfcDto } from './dto/enroll-nfc.dto';
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
   * Finalize enrollment after NFC + Face + Device are done.
   * Transitions subject lifecycle: ENROLLMENT → DANG_QUAN_LY
   */
  @Post('complete')
  @HttpCode(HttpStatus.OK)
  async completeEnrollment(@CurrentUser('userId') userId: string) {
    return this.enrollmentService.completeEnrollment(userId);
  }
}
