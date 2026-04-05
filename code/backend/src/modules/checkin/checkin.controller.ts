import {
  Controller,
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
import { CheckinService } from './checkin.service';
import { CreateCheckinDto } from './dto/create-checkin.dto';

@Controller('checkin')
export class CheckinController {
  constructor(private readonly checkinService: CheckinService) {}

  /**
   * POST /api/v1/checkin
   * Submit a check-in with NFC data + face image + GPS + device info.
   *
   * multipart/form-data fields:
   *   - chipDataHash (string): SHA-256 hash of DG1 raw bytes
   *   - chipSerial (string): NFC UID hex
   *   - passiveAuthVerified (boolean): client-side PA result
   *   - passiveAuthData? (string): Base64-encoded SOD
   *   - gpsLat? (number): GPS latitude
   *   - gpsLng? (number): GPS longitude
   *   - clientTimestamp (string): ISO 8601 timestamp from client
   *   - deviceId? (string): Android device ID
   *   - deviceModel? (string): device model name
   *   - osVersion? (string): Android OS version
   *   - faceImage (file): JPEG face photo
   *
   * Pipeline:
   *   1. Verify NFC hash against enrolled biometric record
   *   2. Verify device matches enrolled device
   *   3. Verify face against stored ArcFace template (InsightFace)
   *   4. Anti-spoofing liveness detection (texture analysis)
   *   5. Create Event + BiometricLog
   *   6. Return result with face match score %
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('faceImage'))
  async checkin(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateCheckinDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB
          new FileTypeValidator({ fileType: /(jpeg|jpg|png)$/i }),
        ],
      }),
    )
    faceImage: Express.Multer.File,
  ) {
    return this.checkinService.processCheckin(
      userId,
      dto,
      faceImage.buffer,
      faceImage.originalname,
    );
  }
}
