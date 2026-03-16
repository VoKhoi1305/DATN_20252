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

export enum AlertLevel {
  THAP = 'THAP',
  TRUNG_BINH = 'TRUNG_BINH',
  CAO = 'CAO',
  KHAN_CAP = 'KHAN_CAP',
}

export enum AlertStatus {
  OPEN = 'OPEN',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  RESOLVED = 'RESOLVED',
  ESCALATED = 'ESCALATED',
}

export enum AlertRuleSource {
  DEFAULT = 'DEFAULT',
  CUSTOM = 'CUSTOM',
}

@Entity('alerts')
export class Alert {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 30, unique: true })
  code!: string;

  @Column({ type: 'varchar', length: 50 })
  type!: string;

  @Column({ type: 'enum', enum: AlertLevel, enumName: 'alert_level' })
  level!: AlertLevel;

  @Column({
    type: 'enum',
    enum: AlertStatus,
    enumName: 'alert_status',
    default: AlertStatus.OPEN,
  })
  status!: AlertStatus;

  @Column({ type: 'enum', enum: AlertRuleSource, enumName: 'alert_rule_source' })
  source!: AlertRuleSource;

  @Column({ name: 'subject_id', type: 'uuid' })
  subjectId!: string;

  @ManyToOne(() => Subject)
  @JoinColumn({ name: 'subject_id' })
  subject!: Subject;

  @Column({ name: 'trigger_event_id', type: 'uuid' })
  triggerEventId!: string;

  @Column({ name: 'alert_rule_id', type: 'uuid' })
  alertRuleId!: string;

  @Column({ name: 'scenario_id', type: 'uuid' })
  scenarioId!: string;

  @Column({ name: 'case_id', type: 'uuid', nullable: true })
  caseId!: string | null;

  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
  resolvedAt!: Date | null;

  @Column({ name: 'escalated_at', type: 'timestamptz', nullable: true })
  escalatedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
