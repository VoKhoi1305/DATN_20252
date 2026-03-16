import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ErrorCodes } from '../../common/constants/error-codes';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from './strategies/jwt.strategy';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
  ) {}

  @Public()
  @UseGuards(ThrottlerGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    const result = await this.authService.login(
      loginDto.username,
      loginDto.password,
    );

    if (result.requireOtp) {
      return {
        requireOtp: true,
        requireOtpSetup: false,
        tempToken: result.tempToken,
      };
    }

    if (result.requireOtpSetup) {
      return {
        requireOtp: false,
        requireOtpSetup: true,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        user: result.user,
      };
    }

    return {
      requireOtp: false,
      requireOtpSetup: false,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      user: result.user,
    };
  }

  @Public()
  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  async verifyOtp(@Req() req: Request, @Body() verifyOtpDto: VerifyOtpDto) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException({
        code: ErrorCodes.TOKEN_INVALID,
        message: 'Temp token is required',
      });
    }

    const tempToken = authHeader.substring(7);
    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify<JwtPayload>(tempToken);
    } catch {
      throw new UnauthorizedException({
        code: ErrorCodes.TOKEN_EXPIRED,
        message: 'Temp token is invalid or expired',
      });
    }

    if (payload.otpVerified) {
      throw new UnauthorizedException({
        code: ErrorCodes.TOKEN_INVALID,
        message: 'Invalid token type for OTP verification',
      });
    }

    const result = await this.authService.verifyOtp(
      payload.sub,
      verifyOtpDto.otpCode,
    );

    return {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      user: result.user,
    };
  }

  @Post('setup-otp')
  @HttpCode(HttpStatus.OK)
  async setupOtp(
    @CurrentUser('userId') userId: string,
  ) {
    return this.authService.setupOtp(userId);
  }

  @Post('confirm-otp-setup')
  @HttpCode(HttpStatus.OK)
  async confirmOtpSetup(
    @CurrentUser('userId') userId: string,
    @Body() verifyOtpDto: VerifyOtpDto,
  ) {
    const result = await this.authService.confirmOtpSetup(
      userId,
      verifyOtpDto.otpCode,
    );
    return result;
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    const tokens = await this.authService.refreshTokens(
      refreshTokenDto.refreshToken,
    );
    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @CurrentUser('userId') userId: string,
    @Body() refreshTokenDto: RefreshTokenDto,
  ) {
    await this.authService.logout(userId, refreshTokenDto.refreshToken);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @CurrentUser('userId') userId: string,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    await this.authService.changePassword(
      userId,
      changePasswordDto.currentPassword,
      changePasswordDto.newPassword,
      changePasswordDto.confirmPassword,
    );
    return { message: 'Password changed successfully' };
  }
}
