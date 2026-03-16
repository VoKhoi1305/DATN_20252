import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Subject } from './subject.entity';

@Entity('subject_legals')
export class SubjectLegal {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'subject_id', type: 'uuid' })
  subjectId!: string;

  @OneToOne(() => Subject)
  @JoinColumn({ name: 'subject_id' })
  subject!: Subject;

  @Column({ name: 'decision_number', type: 'varchar', length: 100, nullable: true })
  decisionNumber!: string | null;

  @Column({ name: 'decision_date', type: 'date', nullable: true })
  decisionDate!: Date | null;

  @Column({ name: 'management_type', type: 'varchar', length: 50 })
  managementType!: string;

  @Column({ name: 'start_date', type: 'date' })
  startDate!: Date;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate!: Date | null;

  @Column({ name: 'issuing_authority', type: 'varchar', length: 300, nullable: true })
  issuingAuthority!: string | null;

  @Column({ name: 'legal_notes', type: 'text', nullable: true })
  legalNotes!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
