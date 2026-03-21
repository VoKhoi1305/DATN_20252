import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ManagementScenario } from '../../scenarios/entities/management-scenario.entity';
import { AlertLevel, AlertRuleSource } from './alert.entity';

@Entity('escalation_rules')
export class EscalationRule {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'scenario_id', type: 'uuid' })
  scenarioId!: string;

  @ManyToOne(() => ManagementScenario)
  @JoinColumn({ name: 'scenario_id' })
  scenario!: ManagementScenario;

  @Column({ type: 'varchar', length: 50 })
  code!: string;

  @Column({ type: 'varchar', length: 200 })
  name!: string;

  @Column({
    type: 'enum',
    enum: AlertRuleSource,
    enumName: 'alert_rule_source',
  })
  source!: AlertRuleSource;

  @Column({ name: 'alert_type', type: 'varchar', length: 50 })
  alertType!: string;

  @Column({
    name: 'alert_level_filter',
    type: 'enum',
    enum: AlertLevel,
    enumName: 'alert_level',
    nullable: true,
  })
  alertLevelFilter!: AlertLevel | null;

  @Column({
    name: 'condition_operator',
    type: 'varchar',
    length: 10,
    default: '>=',
  })
  conditionOperator!: string;

  @Column({ name: 'condition_value', type: 'integer', default: 1 })
  conditionValue!: number;

  @Column({ name: 'condition_window_days', type: 'integer', nullable: true })
  conditionWindowDays!: number | null;

  @Column({ name: 'condition_consecutive', type: 'boolean', default: false })
  conditionConsecutive!: boolean;

  @Column({ name: 'condition_extra', type: 'jsonb', nullable: true })
  conditionExtra!: Record<string, unknown> | null;

  @Column({
    name: 'case_severity',
    type: 'enum',
    enum: AlertLevel,
    enumName: 'alert_level',
  })
  caseSeverity!: AlertLevel;

  @Column({ name: 'case_description_tpl', type: 'text', nullable: true })
  caseDescriptionTpl!: string | null;

  @Column({
    name: 'notification_channels',
    type: 'jsonb',
    default: '["PUSH"]',
  })
  notificationChannels!: string[];

  @Column({ name: 'auto_assign', type: 'boolean', default: false })
  autoAssign!: boolean;

  @Column({ name: 'is_editable', type: 'boolean', default: true })
  isEditable!: boolean;

  @Column({ name: 'is_deletable', type: 'boolean' })
  isDeletable!: boolean;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
