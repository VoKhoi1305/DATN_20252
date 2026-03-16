import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Area } from '../../areas/entities/area.entity';

export enum SubjectStatus {
  ENROLLED = 'ENROLLED',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  REINTEGRATING = 'REINTEGRATING',
  COMPLETED = 'COMPLETED',
}

export enum SubjectLifecycle {
  KHOI_TAO = 'KHOI_TAO',
  ENROLLMENT = 'ENROLLMENT',
  DANG_QUAN_LY = 'DANG_QUAN_LY',
  TAI_HOA_NHAP = 'TAI_HOA_NHAP',
  KET_THUC = 'KET_THUC',
}

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
}

@Entity('subjects')
export class Subject {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 30, unique: true })
  code!: string;

  @Column({ name: 'user_account_id', type: 'uuid', nullable: true, unique: true })
  userAccountId!: string | null;

  @Column({ name: 'full_name', type: 'varchar', length: 200 })
  fullName!: string;

  @Column({ name: 'cccd_encrypted', type: 'varchar', length: 500 })
  cccdEncrypted!: string;

  @Column({ name: 'cccd_hash', type: 'varchar', length: 64, unique: true })
  cccdHash!: string;

  @Column({ name: 'date_of_birth', type: 'date' })
  dateOfBirth!: Date;

  @Column({ type: 'enum', enum: Gender, enumName: 'gender_type' })
  gender!: Gender;

  @Column({ type: 'varchar', length: 50, nullable: true })
  ethnicity!: string | null;

  @Column({ type: 'text' })
  address!: string;

  @Column({ name: 'permanent_address', type: 'text', nullable: true })
  permanentAddress!: string | null;

  @Column({ type: 'varchar', length: 15, nullable: true })
  phone!: string | null;

  @Column({ name: 'photo_url', type: 'varchar', length: 500, nullable: true })
  photoUrl!: string | null;

  @Column({ name: 'area_id', type: 'uuid' })
  areaId!: string;

  @ManyToOne(() => Area)
  @JoinColumn({ name: 'area_id' })
  area!: Area;

  @Column({
    type: 'enum',
    enum: SubjectStatus,
    enumName: 'subject_status',
    default: SubjectStatus.ENROLLED,
  })
  status!: SubjectStatus;

  @Column({
    type: 'enum',
    enum: SubjectLifecycle,
    enumName: 'subject_lifecycle',
    default: SubjectLifecycle.KHOI_TAO,
  })
  lifecycle!: SubjectLifecycle;

  @Column({
    name: 'compliance_rate',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  complianceRate!: number | null;

  @Column({ name: 'enrollment_date', type: 'timestamptz', nullable: true })
  enrollmentDate!: Date | null;

  @Column({ name: 'custom_fields', type: 'jsonb', default: '{}' })
  customFields!: Record<string, unknown>;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @Column({ name: 'created_by_id', type: 'uuid' })
  createdById!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;
}
