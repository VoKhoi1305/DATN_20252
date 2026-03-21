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

@Entity('alert_rules')
export class AlertRule {
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

  @Column({ name: 'event_type', type: 'varchar', length: 50 })
  eventType!: string;

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

  @Column({ name: 'condition_extra', type: 'jsonb', nullable: true })
  conditionExtra!: Record<string, unknown> | null;

  @Column({
    name: 'alert_level',
    type: 'enum',
    enum: AlertLevel,
    enumName: 'alert_level',
  })
  alertLevel!: AlertLevel;

  @Column({
    name: 'notification_channels',
    type: 'jsonb',
    default: '["PUSH"]',
  })
  notificationChannels!: string[];

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
