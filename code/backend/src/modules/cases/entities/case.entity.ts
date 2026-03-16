import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { AlertLevel } from '../../alerts/entities/alert.entity';
import { Subject } from '../../subjects/entities/subject.entity';

export enum CaseStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
}

export enum CaseSource {
  AUTO = 'AUTO',
  MANUAL_ESCALATE = 'MANUAL_ESCALATE',
  MANUAL_NEW = 'MANUAL_NEW',
}

export enum EscalationType {
  AUTO = 'AUTO',
  MANUAL = 'MANUAL',
}

@Entity('cases')
export class Case {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 30, unique: true })
  code!: string;

  @Column({ name: 'subject_id', type: 'uuid' })
  subjectId!: string;

  @ManyToOne(() => Subject)
  @JoinColumn({ name: 'subject_id' })
  subject!: Subject;

  @Column({
    type: 'enum',
    enum: CaseStatus,
    enumName: 'case_status',
    default: CaseStatus.OPEN,
  })
  status!: CaseStatus;

  @Column({ type: 'enum', enum: AlertLevel, enumName: 'alert_level' })
  severity!: AlertLevel;

  @Column({ type: 'enum', enum: CaseSource, enumName: 'case_source' })
  source!: CaseSource;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ name: 'escalated_from_alert_id', type: 'uuid', nullable: true })
  escalatedFromAlertId!: string | null;

  @Column({
    name: 'escalation_type',
    type: 'enum',
    enum: EscalationType,
    enumName: 'escalation_type',
    nullable: true,
  })
  escalationType!: EscalationType | null;

  @Column({ name: 'escalation_reason', type: 'text', nullable: true })
  escalationReason!: string | null;

  @Column({ name: 'escalation_rule_name', type: 'varchar', length: 200, nullable: true })
  escalationRuleName!: string | null;

  @Column({ name: 'linked_event_ids', type: 'jsonb', default: '[]' })
  linkedEventIds!: string[];

  @Column({ name: 'assignee_id', type: 'uuid', nullable: true })
  assigneeId!: string | null;

  @Column({ name: 'created_by_id', type: 'uuid', nullable: true })
  createdById!: string | null;

  @Column({ name: 'created_by_name', type: 'varchar', length: 100 })
  createdByName!: string;

  @Column({ name: 'closing_note', type: 'text', nullable: true })
  closingNote!: string | null;

  @Column({ name: 'closed_by_id', type: 'uuid', nullable: true })
  closedById!: string | null;

  @Column({ name: 'closed_at', type: 'timestamptz', nullable: true })
  closedAt!: Date | null;

  @Column({ name: 'related_case_id', type: 'uuid', nullable: true })
  relatedCaseId!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
