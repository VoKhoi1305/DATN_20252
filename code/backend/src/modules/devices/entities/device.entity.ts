import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Subject } from '../../subjects/entities/subject.entity';

export enum DeviceStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  REPLACED = 'REPLACED',
}

@Entity('devices')
export class Device {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'subject_id', type: 'uuid' })
  subjectId!: string;

  @ManyToOne(() => Subject)
  @JoinColumn({ name: 'subject_id' })
  subject!: Subject;

  @Column({ name: 'device_id', type: 'varchar', length: 200 })
  deviceId!: string;

  @Column({ name: 'device_model', type: 'varchar', length: 200, nullable: true })
  deviceModel!: string | null;

  @Column({ name: 'os_version', type: 'varchar', length: 50, nullable: true })
  osVersion!: string | null;

  @Column({
    type: 'enum',
    enum: DeviceStatus,
    enumName: 'device_status',
    default: DeviceStatus.ACTIVE,
  })
  status!: DeviceStatus;

  @Column({ name: 'enrolled_at', type: 'timestamptz' })
  enrolledAt!: Date;

  @Column({ name: 'replaced_at', type: 'timestamptz', nullable: true })
  replacedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
