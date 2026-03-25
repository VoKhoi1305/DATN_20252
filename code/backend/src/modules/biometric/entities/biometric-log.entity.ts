import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

export enum FaceResult {
  MATCH = 'MATCH',
  MISMATCH = 'MISMATCH',
  ERROR = 'ERROR',
}

export enum LivenessResult {
  PASS = 'PASS',
  FAIL = 'FAIL',
  SKIPPED = 'SKIPPED',
}

export enum NfcResult {
  VERIFIED = 'VERIFIED',
  FAILED = 'FAILED',
  MISMATCH = 'MISMATCH',
}

@Entity('biometric_logs')
export class BiometricLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'subject_id', type: 'uuid' })
  subjectId!: string;

  @Column({ name: 'event_id', type: 'uuid' })
  eventId!: string;

  @Column({ name: 'face_match_score', type: 'decimal', precision: 5, scale: 2 })
  faceMatchScore!: number;

  @Column({ name: 'face_threshold', type: 'smallint' })
  faceThreshold!: number;

  @Column({ name: 'face_result', type: 'varchar', length: 20 })
  faceResult!: FaceResult;

  @Column({ name: 'liveness_result', type: 'varchar', length: 20, nullable: true })
  livenessResult!: LivenessResult | null;

  @Column({ name: 'nfc_result', type: 'varchar', length: 20 })
  nfcResult!: NfcResult;

  @Column({ name: 'match_duration_ms', type: 'integer', nullable: true })
  matchDurationMs!: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
