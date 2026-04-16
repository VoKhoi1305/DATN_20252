import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';
import * as crypto from 'crypto';
import { UsersService } from '../users/users.service';
import { User, UserRole, UserStatus, DataScopeLevel } from '../users/entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { Subject, SubjectLifecycle } from '../subjects/entities/subject.entity';
import { Area } from '../areas/entities/area.entity';
import { ErrorCodes } from '../../common/constants/error-codes';

const SALT_ROUNDS = 10;
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 5;

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    @InjectRepository(Subject)
    private readonly subjectRepository: Repository<Subject>,
    @InjectRepository(Area)
    private readonly areaRepository: Repository<Area>,
  ) {}

  async login(
    username: string,
    password: string,
  ): Promise<{
    requireOtp?: boolean;
    requireOtpSetup?: boolean;
    tempToken?: string;
    accessToken?: string;
    refreshToken?: string;
    user?: Partial<User>;
  }> {
    const user = await this.usersService.findByUsername(username);
    if (!user) {
      throw new UnauthorizedException({
        code: ErrorCodes.INVALID_CREDENTIALS,
        message: 'Invalid username or password',
      });
    }

    if (user.status === UserStatus.DEACTIVATED) {
      throw new ForbiddenException({
        code: ErrorCodes.ACCOUNT_DEACTIVATED,
        message: 'Account has been deactivated. Please contact an administrator.',
      });
    }

    if (user.status === UserStatus.LOCKED) {
      throw new ForbiddenException({
        code: ErrorCodes.ACCOUNT_LOCKED,
        message: 'Account is locked. Please contact an administrator.',
      });
    }

    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      throw new ForbiddenException({
        code: ErrorCodes.ACCOUNT_LOCKED,
        message: `Account is temporarily locked. Try again after ${user.lockedUntil.toISOString()}.`,
      });
    }

    if (user.lockedUntil && new Date(user.lockedUntil) <= new Date()) {
      await this.usersService.resetFailedLogin(user.id);
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      const failedCount = await this.usersService.incrementFailedLogin(user.id);
      if (failedCount >= MAX_FAILED_ATTEMPTS) {
        const lockUntil = new Date(
          Date.now() + LOCK_DURATION_MINUTES * 60 * 1000,
        );
        await this.usersService.lockUser(user.id, lockUntil);
        throw new ForbiddenException({
          code: ErrorCodes.ACCOUNT_LOCKED,
          message: `Account locked due to too many failed attempts. Try again after ${lockUntil.toISOString()}.`,
        });
      }
      throw new UnauthorizedException({
        code: ErrorCodes.INVALID_CREDENTIALS,
        message: 'Invalid username or password',
      });
    }

    await this.usersService.resetFailedLogin(user.id);
    await this.usersService.updateUser(user.id, { lastLoginAt: new Date() });

    if (user.otpEnabled) {
      const tempToken = this.jwtService.sign(
        {
          sub: user.id,
          username: user.username,
          role: user.role,
          dataScope: user.dataScopeLevel,
          otpVerified: false,
        },
        {
          expiresIn: this.configService.get('JWT_TEMP_EXPIRY', '5m') as any,
        },
      );
      return { requireOtp: true, tempToken };
    }

    const tokens = await this.generateTokens(user);

    // Officers without OTP must set it up first
    if (!user.otpEnabled && user.role !== UserRole.SUBJECT) {
      return {
        requireOtpSetup: true,
        ...tokens,
        user: await this.sanitizeUser(user),
      };
    }

    return {
      ...tokens,
      user: await this.sanitizeUser(user),
    };
  }

  async verifyOtp(
    userId: string,
    otpCode: string,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    user: Partial<User>;
  }> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException({
        code: ErrorCodes.USER_NOT_FOUND,
        message: 'User not found',
      });
    }

    if (!user.otpSecret) {
      throw new BadRequestException({
        code: ErrorCodes.OTP_NOT_SETUP,
        message: 'OTP is not set up for this user',
      });
    }

    const isValid = authenticator.verify({
      token: otpCode,
      secret: user.otpSecret,
    });

    if (!isValid) {
      const backupValid = await this.verifyBackupCode(userId, otpCode);
      if (!backupValid) {
        throw new UnauthorizedException({
          code: ErrorCodes.INVALID_OTP,
          message: 'Invalid OTP code',
        });
      }
    }

    const tokens = await this.generateTokens(user);
    return {
      ...tokens,
      user: await this.sanitizeUser(user),
    };
  }

  async setupOtp(
    userId: string,
  ): Promise<{
    secret: string;
    qrCodeDataUrl: string;
  }> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException({
        code: ErrorCodes.USER_NOT_FOUND,
        message: 'User not found',
      });
    }

    if (user.otpEnabled) {
      throw new BadRequestException({
        code: ErrorCodes.OTP_ALREADY_ENABLED,
        message: 'OTP is already enabled for this user',
      });
    }

    const secret = authenticator.generateSecret();
    const issuer = this.configService.get<string>('OTP_ISSUER', 'SMTTS');
    const otpauthUrl = authenticator.keyuri(user.username, issuer, secret);
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

    await this.usersService.updateUser(userId, {
      otpSecret: secret,
    });

    return {
      secret,
      qrCodeDataUrl,
    };
  }

  async confirmOtpSetup(
    userId: string,
    otpCode: string,
  ): Promise<{
    backupCodes: string[];
    accessToken: string;
    refreshToken: string;
    user: Partial<User>;
  }> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException({
        code: ErrorCodes.USER_NOT_FOUND,
        message: 'User not found',
      });
    }

    if (!user.otpSecret) {
      throw new BadRequestException({
        code: ErrorCodes.OTP_NOT_SETUP,
        message: 'OTP setup has not been initiated',
      });
    }

    const isValid = authenticator.verify({
      token: otpCode,
      secret: user.otpSecret,
    });

    if (!isValid) {
      throw new UnauthorizedException({
        code: ErrorCodes.INVALID_OTP,
        message: 'Invalid OTP code. Please try again.',
      });
    }

    // Generate backup codes
    const backupCodes = this.generateBackupCodes(10);
    const hashedBackupCodes = backupCodes.map((code) =>
      crypto.createHash('sha256').update(code).digest('hex'),
    );

    // Enable OTP and save backup codes
    await this.usersService.updateUser(userId, {
      otpEnabled: true,
      backupCodes: hashedBackupCodes,
    });

    // Generate full tokens (OTP is now verified)
    const tokens = await this.generateTokens(user);

    return {
      backupCodes,
      ...tokens,
      user: await this.sanitizeUser(user),
    };
  }

  async verifyBackupCode(userId: string, code: string): Promise<boolean> {
    const user = await this.usersService.findById(userId);
    if (!user || !user.backupCodes || user.backupCodes.length === 0) {
      return false;
    }

    const hashedCode = crypto.createHash('sha256').update(code).digest('hex');
    const codeIndex = user.backupCodes.indexOf(hashedCode);

    if (codeIndex === -1) {
      return false;
    }

    const updatedCodes = [...user.backupCodes];
    updatedCodes.splice(codeIndex, 1);
    await this.usersService.updateUser(userId, { backupCodes: updatedCodes });

    return true;
  }

  /**
   * Login flow: exchange a single-use backup code for full access tokens.
   * Only callable with a valid temp token (post-password, pre-OTP).
   * Each code is consumed on success.
   */
  async verifyBackupCodeLogin(
    userId: string,
    code: string,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    user: Partial<User>;
    remainingBackupCodes: number;
  }> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException({
        code: ErrorCodes.USER_NOT_FOUND,
        message: 'User not found',
      });
    }

    if (!user.otpEnabled) {
      throw new BadRequestException({
        code: ErrorCodes.OTP_NOT_SETUP,
        message: 'OTP is not enabled for this user',
      });
    }

    if (!user.backupCodes || user.backupCodes.length === 0) {
      throw new BadRequestException({
        code: ErrorCodes.NO_BACKUP_CODES,
        message:
          'Không còn mã dự phòng khả dụng. Vui lòng liên hệ quản trị viên để cấp lại.',
      });
    }

    const normalized = code.trim().toUpperCase();
    const consumed = await this.verifyBackupCode(userId, normalized);
    if (!consumed) {
      throw new UnauthorizedException({
        code: ErrorCodes.INVALID_BACKUP_CODE,
        message: 'Mã dự phòng không hợp lệ hoặc đã được sử dụng.',
      });
    }

    const tokens = await this.generateTokens(user);
    const refreshed = await this.usersService.findById(userId);
    const remainingBackupCodes = refreshed?.backupCodes?.length ?? 0;

    return {
      ...tokens,
      user: await this.sanitizeUser(user),
      remainingBackupCodes,
    };
  }

  async refreshTokens(
    refreshToken: string,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const tokenHash = this.hashToken(refreshToken);

    const storedToken = await this.refreshTokenRepository.findOne({
      where: { tokenHash },
      relations: ['user'],
    });

    if (!storedToken) {
      throw new UnauthorizedException({
        code: ErrorCodes.REFRESH_TOKEN_INVALID,
        message: 'Invalid refresh token',
      });
    }

    if (storedToken.revoked) {
      throw new UnauthorizedException({
        code: ErrorCodes.TOKEN_REVOKED,
        message: 'Refresh token has been revoked',
      });
    }

    if (new Date(storedToken.expiresAt) < new Date()) {
      throw new UnauthorizedException({
        code: ErrorCodes.TOKEN_EXPIRED,
        message: 'Refresh token has expired',
      });
    }

    await this.refreshTokenRepository.update(storedToken.id, { revoked: true });

    const user = await this.usersService.findById(storedToken.userId);
    if (!user) {
      throw new NotFoundException({
        code: ErrorCodes.USER_NOT_FOUND,
        message: 'User not found',
      });
    }

    return this.generateTokens(user);
  }

  async logout(userId: string, refreshToken: string): Promise<void> {
    const tokenHash = this.hashToken(refreshToken);

    const storedToken = await this.refreshTokenRepository.findOne({
      where: { tokenHash, userId },
    });

    if (storedToken) {
      await this.refreshTokenRepository.update(storedToken.id, {
        revoked: true,
      });
    }
  }

  /**
   * Activate a subject's account for first-time mobile login.
   * Creates a User record, links it to the Subject, and transitions lifecycle.
   */
  async activate(
    subjectCode: string,
    cccd: string,
    password: string,
    confirmPassword: string,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    user: Partial<User>;
  }> {
    if (password !== confirmPassword) {
      throw new BadRequestException({
        code: ErrorCodes.PASSWORD_CONFIRM_MISMATCH,
        message: 'Mật khẩu xác nhận không khớp',
      });
    }

    // Find subject by code
    const subject = await this.subjectRepository.findOne({
      where: { code: subjectCode },
    });
    if (!subject) {
      throw new NotFoundException({
        code: ErrorCodes.SUBJECT_NOT_FOUND,
        message: 'Không tìm thấy hồ sơ với mã này',
      });
    }

    // Verify CCCD matches
    const cccdHash = crypto.createHash('sha256').update(cccd).digest('hex');
    if (cccdHash !== subject.cccdHash) {
      throw new BadRequestException({
        code: ErrorCodes.CCCD_MISMATCH,
        message: 'Số CCCD không khớp với hồ sơ',
      });
    }

    // Check if already activated
    if (subject.userAccountId) {
      throw new BadRequestException({
        code: ErrorCodes.SUBJECT_ALREADY_ACTIVATED,
        message: 'Tài khoản đã được kích hoạt trước đó. Vui lòng đăng nhập.',
      });
    }

    // Create User account for the subject
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await this.usersService.createSubjectAccount({
      username: cccd,
      passwordHash,
      fullName: subject.fullName,
      phone: subject.phone,
      role: UserRole.SUBJECT,
      areaId: subject.areaId,
      dataScopeLevel: DataScopeLevel.DISTRICT,
    });

    // Link user account to subject and transition lifecycle
    await this.subjectRepository.update(subject.id, {
      userAccountId: user.id,
      lifecycle: SubjectLifecycle.ENROLLMENT,
      enrollmentDate: new Date(),
    });

    // Update last login
    await this.usersService.updateUser(user.id, { lastLoginAt: new Date() });

    // Generate tokens
    const tokens = await this.generateTokens(user);

    return {
      ...tokens,
      user: await this.sanitizeUser(user),
    };
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    confirmPassword: string,
  ): Promise<void> {
    if (newPassword !== confirmPassword) {
      throw new BadRequestException({
        code: ErrorCodes.PASSWORD_CONFIRM_MISMATCH,
        message: 'New password and confirmation do not match',
      });
    }

    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException({
        code: ErrorCodes.USER_NOT_FOUND,
        message: 'User not found',
      });
    }

    const isCurrentValid = await bcrypt.compare(
      currentPassword,
      user.passwordHash,
    );
    if (!isCurrentValid) {
      throw new BadRequestException({
        code: ErrorCodes.PASSWORD_MISMATCH,
        message: 'Current password is incorrect',
      });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await this.usersService.updateUser(userId, {
      passwordHash: hashedNewPassword,
    });
  }

  private async generateTokens(
    user: User,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = {
      sub: user.id,
      username: user.username,
      role: user.role,
      dataScope: user.dataScopeLevel,
      otpVerified: true,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get('JWT_ACCESS_EXPIRY', '15m') as any,
    });

    const refreshToken = crypto.randomBytes(64).toString('hex');
    const tokenHash = this.hashToken(refreshToken);

    const refreshExpiry = this.configService.get<string>(
      'JWT_REFRESH_EXPIRY',
      '7d',
    );
    const expiresAt = new Date();
    const daysMatch = refreshExpiry.match(/^(\d+)d$/);
    if (daysMatch) {
      expiresAt.setDate(expiresAt.getDate() + parseInt(daysMatch[1], 10));
    } else {
      expiresAt.setDate(expiresAt.getDate() + 7);
    }

    const refreshTokenEntity = this.refreshTokenRepository.create({
      userId: user.id,
      tokenHash,
      expiresAt,
      revoked: false,
    });

    await this.refreshTokenRepository.save(refreshTokenEntity);

    return { accessToken, refreshToken };
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private async sanitizeUser(user: User): Promise<{
    id: string;
    username: string;
    fullName: string;
    role: UserRole;
    dataScope: {
      level: DataScopeLevel;
      areaId: string | null;
      areaName: string;
    };
    otpEnabled: boolean;
  }> {
    let areaName = '';
    if (user.areaId) {
      const area = await this.areaRepository.findOneBy({ id: user.areaId });
      areaName = area?.name ?? '';
    }

    // For SUBJECT role, return the Subject ID so the mobile app can use it
    // for all subject-related API calls (profile, events, devices, documents)
    let effectiveId = user.id;
    if (user.role === UserRole.SUBJECT) {
      const subject = await this.subjectRepository.findOne({
        where: { userAccountId: user.id },
      });
      if (subject) {
        effectiveId = subject.id;
      }
    }

    return {
      id: effectiveId,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      dataScope: {
        level: user.dataScopeLevel,
        areaId: user.areaId,
        areaName,
      },
      otpEnabled: user.otpEnabled,
    };
  }

  private generateBackupCodes(count: number): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      const part1 = crypto.randomBytes(2).toString('hex').toUpperCase();
      const part2 = crypto.randomBytes(2).toString('hex').toUpperCase();
      codes.push(`${part1}-${part2}`);
    }
    return codes;
  }
}
