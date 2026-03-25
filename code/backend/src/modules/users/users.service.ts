import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User, UserRole, DataScopeLevel, UserStatus } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ListUsersDto } from './dto/list-users.dto';
import { AreasService } from '../areas/areas.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly areasService: AreasService,
  ) {}

  async findByUsername(username: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { username } });
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  async updateUser(id: string, partial: Partial<User>): Promise<void> {
    await this.userRepository.update(id, partial);
  }

  async incrementFailedLogin(id: string): Promise<number> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      return 0;
    }
    const newCount = user.failedLoginCount + 1;
    await this.userRepository.update(id, { failedLoginCount: newCount });
    return newCount;
  }

  async resetFailedLogin(id: string): Promise<void> {
    await this.userRepository.update(id, {
      failedLoginCount: 0,
      lockedUntil: null,
    });
  }

  async lockUser(id: string, until: Date): Promise<void> {
    await this.userRepository.update(id, {
      lockedUntil: until,
    });
  }

  /**
   * Create a User account for a Subject during first-time activation.
   * Password is already hashed by the caller.
   */
  async createSubjectAccount(data: {
    username: string;
    passwordHash: string;
    fullName: string;
    phone: string | null;
    role: UserRole;
    areaId: string;
    dataScopeLevel: DataScopeLevel;
  }): Promise<User> {
    // Check duplicate username (CCCD)
    const existing = await this.userRepository.findOneBy({
      username: data.username,
    });
    if (existing) {
      throw new ConflictException('Tài khoản với số CCCD này đã tồn tại.');
    }

    const user = this.userRepository.create({
      username: data.username,
      passwordHash: data.passwordHash,
      fullName: data.fullName,
      phone: data.phone,
      role: data.role,
      areaId: data.areaId,
      dataScopeLevel: data.dataScopeLevel,
      status: UserStatus.ACTIVE,
      otpEnabled: false,
    });

    return this.userRepository.save(user);
  }

  // ====================== CRUD ======================

  async list(query: ListUsersDto, currentUser: User) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.userRepository
      .createQueryBuilder('u')
      .where('u.deleted_at IS NULL');

    // Data scope: non-SYSTEM users can only see users in their area scope
    const scopeAreaIds = await this.areasService.resolveAreaIds(
      currentUser.dataScopeLevel,
      currentUser.areaId,
    );
    if (scopeAreaIds !== null) {
      qb.andWhere('u.area_id IN (:...areaIds)', { areaIds: scopeAreaIds });
    }

    // Search
    if (query.q) {
      const search = query.q.replace(/^~/, '');
      qb.andWhere(
        '(u.username ILIKE :q OR u.full_name ILIKE :q OR u.email ILIKE :q)',
        { q: `%${search}%` },
      );
    }

    // Filters
    if (query.role) {
      qb.andWhere('u.role = :role', { role: query.role });
    }
    if (query.status) {
      qb.andWhere('u.status = :status', { status: query.status });
    }

    // Sorting
    const sortField = query.sort || 'created_at';
    const sortOrder = (query.order?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC') as 'ASC' | 'DESC';
    const allowedSorts: Record<string, string> = {
      username: 'u.username',
      full_name: 'u.full_name',
      role: 'u.role',
      status: 'u.status',
      created_at: 'u.created_at',
      last_login_at: 'u.last_login_at',
    };
    const orderCol = allowedSorts[sortField] || 'u.created_at';
    qb.orderBy(orderCol, sortOrder);

    qb.skip((page - 1) * limit).take(limit);

    const [items, total] = await qb.getManyAndCount();

    const data = items.map((u) => ({
      id: u.id,
      username: u.username,
      full_name: u.fullName,
      email: u.email,
      phone: u.phone,
      role: u.role,
      area_id: u.areaId,
      data_scope_level: u.dataScopeLevel,
      status: u.status,
      otp_enabled: u.otpEnabled,
      last_login_at: u.lastLoginAt,
      created_at: u.createdAt,
    }));

    return { data, total, page, limit };
  }

  async findOne(id: string) {
    const user = await this.userRepository.findOneBy({ id });
    if (!user) {
      throw new NotFoundException(`User with id "${id}" not found`);
    }

    return {
      id: user.id,
      username: user.username,
      full_name: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      area_id: user.areaId,
      data_scope_level: user.dataScopeLevel,
      status: user.status,
      otp_enabled: user.otpEnabled,
      last_login_at: user.lastLoginAt,
      failed_login_count: user.failedLoginCount,
      locked_until: user.lockedUntil,
      created_at: user.createdAt,
      updated_at: user.updatedAt,
    };
  }

  async create(dto: CreateUserDto) {
    // Check duplicate username
    const existing = await this.userRepository.findOneBy({
      username: dto.username,
    });
    if (existing) {
      throw new ConflictException('Tên đăng nhập đã tồn tại.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = this.userRepository.create({
      username: dto.username,
      passwordHash,
      fullName: dto.full_name,
      email: dto.email ?? null,
      phone: dto.phone ?? null,
      role: dto.role,
      areaId: dto.area_id ?? null,
      dataScopeLevel: dto.data_scope_level,
      status: UserStatus.ACTIVE,
    });

    const saved = await this.userRepository.save(user);

    return {
      id: saved.id,
      username: saved.username,
      full_name: saved.fullName,
      email: saved.email,
      phone: saved.phone,
      role: saved.role,
      area_id: saved.areaId,
      data_scope_level: saved.dataScopeLevel,
      status: saved.status,
      created_at: saved.createdAt,
    };
  }

  async update(id: string, dto: UpdateUserDto) {
    const user = await this.userRepository.findOneBy({ id });
    if (!user) {
      throw new NotFoundException(`User with id "${id}" not found`);
    }

    if (dto.full_name !== undefined) user.fullName = dto.full_name;
    if (dto.email !== undefined) user.email = dto.email || null;
    if (dto.phone !== undefined) user.phone = dto.phone || null;
    if (dto.role !== undefined) user.role = dto.role;
    if (dto.area_id !== undefined) user.areaId = dto.area_id || null;
    if (dto.data_scope_level !== undefined)
      user.dataScopeLevel = dto.data_scope_level;
    if (dto.status !== undefined) user.status = dto.status;

    const saved = await this.userRepository.save(user);

    return {
      id: saved.id,
      username: saved.username,
      full_name: saved.fullName,
      email: saved.email,
      phone: saved.phone,
      role: saved.role,
      area_id: saved.areaId,
      data_scope_level: saved.dataScopeLevel,
      status: saved.status,
      updated_at: saved.updatedAt,
    };
  }

  async resetPassword(id: string, newPassword: string) {
    const user = await this.userRepository.findOneBy({ id });
    if (!user) {
      throw new NotFoundException(`User with id "${id}" not found`);
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.failedLoginCount = 0;
    user.lockedUntil = null;
    await this.userRepository.save(user);

    return { message: 'Đặt lại mật khẩu thành công.' };
  }

  async toggleStatus(id: string) {
    const user = await this.userRepository.findOneBy({ id });
    if (!user) {
      throw new NotFoundException(`User with id "${id}" not found`);
    }

    if (user.status === UserStatus.ACTIVE) {
      user.status = UserStatus.DEACTIVATED;
    } else {
      user.status = UserStatus.ACTIVE;
      user.failedLoginCount = 0;
      user.lockedUntil = null;
    }

    const saved = await this.userRepository.save(user);

    return {
      id: saved.id,
      username: saved.username,
      status: saved.status,
      updated_at: saved.updatedAt,
    };
  }

  async remove(id: string) {
    const user = await this.userRepository.findOneBy({ id });
    if (!user) {
      throw new NotFoundException(`User with id "${id}" not found`);
    }

    // Soft delete
    await this.userRepository.softRemove(user);

    return { message: 'Xóa tài khoản thành công.' };
  }

  async unlock(id: string) {
    const user = await this.userRepository.findOneBy({ id });
    if (!user) {
      throw new NotFoundException(`User with id "${id}" not found`);
    }

    user.status = UserStatus.ACTIVE;
    user.failedLoginCount = 0;
    user.lockedUntil = null;
    const saved = await this.userRepository.save(user);

    return {
      id: saved.id,
      username: saved.username,
      status: saved.status,
      updated_at: saved.updatedAt,
    };
  }
}
