import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Subject } from './subject.entity';
import { ManagementScenario } from '../../scenarios/entities/management-scenario.entity';

export enum AssignmentStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  EXPIRED = 'EXPIRED',
}

@Entity('scenario_assignments')
export class ScenarioAssignment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'subject_id', type: 'uuid' })
  subjectId!: string;

  @ManyToOne(() => Subject)
  @JoinColumn({ name: 'subject_id' })
  subject!: Subject;

  @Column({ name: 'scenario_id', type: 'uuid' })
  scenarioId!: string;

  @ManyToOne(() => ManagementScenario)
  @JoinColumn({ name: 'scenario_id' })
  scenario!: ManagementScenario;

  @Column({ name: 'alert_rule_overrides', type: 'jsonb', nullable: true })
  alertRuleOverrides!: Record<string, unknown> | null;

  @Column({
    type: 'enum',
    enum: AssignmentStatus,
    enumName: 'assignment_status',
    default: AssignmentStatus.ACTIVE,
  })
  status!: AssignmentStatus;

  @Column({ name: 'assigned_by_id', type: 'uuid' })
  assignedById!: string;

  @Column({ name: 'assigned_at', type: 'timestamptz', default: () => 'NOW()' })
  assignedAt!: Date;

  @Column({ name: 'unassigned_at', type: 'timestamptz', nullable: true })
  unassignedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
