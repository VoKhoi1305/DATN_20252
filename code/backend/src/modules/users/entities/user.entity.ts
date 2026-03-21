import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';

export enum UserRole {
  IT_ADMIN = 'IT_ADMIN',
  LANH_DAO = 'LANH_DAO',
  CAN_BO_QUAN_LY = 'CAN_BO_QUAN_LY',
  CAN_BO_CO_SO = 'CAN_BO_CO_SO',
  SUBJECT = 'SUBJECT',
}

export enum DataScopeLevel {
  DISTRICT = 'DISTRICT',
  PROVINCE = 'PROVINCE',
  SYSTEM = 'SYSTEM',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  LOCKED = 'LOCKED',
  DEACTIVATED = 'DEACTIVATED',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  username!: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 255 })
  passwordHash!: string;

  @Column({ name: 'full_name', type: 'varchar', length: 200 })
  fullName!: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  email!: string | null;

  @Column({ type: 'varchar', length: 15, nullable: true })
  phone!: string | null;

  @Column({
    type: 'enum',
    enum: UserRole,
    enumName: 'user_role',
  })
  role!: UserRole;

  @Column({ name: 'area_id', type: 'uuid', nullable: true })
  areaId!: string | null;

  @Column({
    name: 'data_scope_level',
    type: 'enum',
    enum: DataScopeLevel,
    enumName: 'data_scope_level',
  })
  dataScopeLevel!: DataScopeLevel;

  @Column({ name: 'otp_secret', type: 'varchar', length: 255, nullable: true })
  otpSecret!: string | null;

  @Column({ name: 'otp_enabled', type: 'boolean', default: false })
  otpEnabled!: boolean;

  @Column({ name: 'backup_codes', type: 'jsonb', nullable: true })
  backupCodes!: string[] | null;

  @Column({
    type: 'enum',
    enum: UserStatus,
    enumName: 'user_status',
    default: UserStatus.ACTIVE,
  })
  status!: UserStatus;

  @Column({ name: 'last_login_at', type: 'timestamptz', nullable: true })
  lastLoginAt!: Date | null;

  @Column({ name: 'failed_login_count', type: 'smallint', default: 0 })
  failedLoginCount!: number;

  @Column({ name: 'locked_until', type: 'timestamptz', nullable: true })
  lockedUntil!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;
}
