import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Subject } from '../../subjects/entities/subject.entity';

export enum EventResult {
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  WARNING = 'WARNING',
}

@Entity('events')
export class Event {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 30, unique: true })
  code!: string;

  @Column({ type: 'varchar', length: 50 })
  type!: string;

  @Column({ name: 'subject_id', type: 'uuid' })
  subjectId!: string;

  @ManyToOne(() => Subject)
  @JoinColumn({ name: 'subject_id' })
  subject!: Subject;

  @Column({ name: 'scenario_id', type: 'uuid', nullable: true })
  scenarioId!: string | null;

  @Column({ type: 'enum', enum: EventResult, enumName: 'event_result' })
  result!: EventResult;

  @Column({ name: 'gps_lat', type: 'decimal', precision: 10, scale: 7, nullable: true })
  gpsLat!: number | null;

  @Column({ name: 'gps_lng', type: 'decimal', precision: 10, scale: 7, nullable: true })
  gpsLng!: number | null;

  @Column({ name: 'gps_accuracy', type: 'decimal', precision: 8, scale: 2, nullable: true })
  gpsAccuracy!: number | null;

  @Column({ name: 'in_geofence', type: 'boolean', nullable: true })
  inGeofence!: boolean | null;

  @Column({ name: 'geofence_distance', type: 'integer', nullable: true })
  geofenceDistance!: number | null;

  @Column({ name: 'face_match_score', type: 'decimal', precision: 5, scale: 2, nullable: true })
  faceMatchScore!: number | null;

  @Column({ name: 'nfc_verified', type: 'boolean', nullable: true })
  nfcVerified!: boolean | null;

  @Column({ name: 'nfc_cccd_match', type: 'boolean', nullable: true })
  nfcCccdMatch!: boolean | null;

  @Column({ name: 'liveness_score', type: 'decimal', precision: 5, scale: 2, nullable: true })
  livenessScore!: number | null;

  @Column({ name: 'face_image_url', type: 'varchar', length: 500, nullable: true })
  faceImageUrl!: string | null;

  @Column({ name: 'device_id', type: 'varchar', length: 200, nullable: true })
  deviceId!: string | null;

  @Column({ name: 'device_info', type: 'jsonb', nullable: true })
  deviceInfo!: Record<string, unknown> | null;

  @Column({ name: 'is_voluntary', type: 'boolean', default: false })
  isVoluntary!: boolean;

  @Column({ name: 'extra_data', type: 'jsonb', nullable: true })
  extraData!: Record<string, unknown> | null;

  @Column({ name: 'client_timestamp', type: 'timestamptz', nullable: true })
  clientTimestamp!: Date | null;

  @Column({ name: 'created_by_id', type: 'uuid', nullable: true })
  createdById!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
