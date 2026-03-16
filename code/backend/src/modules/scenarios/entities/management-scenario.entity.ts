import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';

export enum ScenarioStatus {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  EXPIRED = 'EXPIRED',
}

@Entity('management_scenarios')
export class ManagementScenario {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 30, unique: true })
  code!: string;

  @Column({ type: 'varchar', length: 200 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({
    type: 'enum',
    enum: ScenarioStatus,
    enumName: 'scenario_status',
    default: ScenarioStatus.DRAFT,
  })
  status!: ScenarioStatus;

  @Column({ type: 'integer', default: 1 })
  version!: number;

  @Column({ name: 'parent_version_id', type: 'uuid', nullable: true })
  parentVersionId!: string | null;

  @Column({ type: 'enum', enum: ['WARD', 'DISTRICT', 'PROVINCE', 'SYSTEM'] as const })
  scope!: string;

  @Column({ name: 'checkin_frequency', type: 'varchar', length: 30 })
  checkinFrequency!: string;

  @Column({ name: 'checkin_window_start', type: 'time' })
  checkinWindowStart!: string;

  @Column({ name: 'checkin_window_end', type: 'time' })
  checkinWindowEnd!: string;

  @Column({ name: 'grace_period_days', type: 'smallint', default: 2 })
  gracePeriodDays!: number;

  @Column({ name: 'face_threshold', type: 'smallint', default: 85 })
  faceThreshold!: number;

  @Column({ name: 'nfc_required', type: 'boolean', default: true })
  nfcRequired!: boolean;

  @Column({ name: 'fallback_allowed', type: 'boolean', default: true })
  fallbackAllowed!: boolean;

  @Column({ name: 'geofence_id', type: 'uuid', nullable: true })
  geofenceId!: string | null;

  @Column({ name: 'curfew_start', type: 'time', nullable: true })
  curfewStart!: string | null;

  @Column({ name: 'curfew_end', type: 'time', nullable: true })
  curfewEnd!: string | null;

  @Column({ name: 'travel_approval_required', type: 'boolean', default: true })
  travelApprovalRequired!: boolean;

  @Column({ name: 'travel_threshold_days', type: 'smallint', nullable: true, default: 3 })
  travelThresholdDays!: number | null;

  @Column({ name: 'auto_transitions', type: 'jsonb', default: '[]' })
  autoTransitions!: unknown[];

  @Column({ name: 'custom_field_definitions', type: 'jsonb', default: '[]' })
  customFieldDefinitions!: unknown[];

  @Column({ name: 'notification_config', type: 'jsonb', default: '{}' })
  notificationConfig!: Record<string, unknown>;

  @Column({ name: 'auto_escalation_config', type: 'jsonb', default: '{}' })
  autoEscalationConfig!: Record<string, unknown>;

  @Column({ name: 'effective_from', type: 'date', nullable: true })
  effectiveFrom!: Date | null;

  @Column({ name: 'effective_to', type: 'date', nullable: true })
  effectiveTo!: Date | null;

  @Column({ name: 'created_by_id', type: 'uuid' })
  createdById!: string;

  @Column({ name: 'approved_by_id', type: 'uuid', nullable: true })
  approvedById!: string | null;

  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;
}
