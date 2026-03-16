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

@Entity('subject_families')
export class SubjectFamily {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'subject_id', type: 'uuid' })
  subjectId!: string;

  @OneToOne(() => Subject)
  @JoinColumn({ name: 'subject_id' })
  subject!: Subject;

  @Column({ name: 'father_name', type: 'varchar', length: 200, nullable: true })
  fatherName!: string | null;

  @Column({ name: 'mother_name', type: 'varchar', length: 200, nullable: true })
  motherName!: string | null;

  @Column({ name: 'spouse_name', type: 'varchar', length: 200, nullable: true })
  spouseName!: string | null;

  @Column({ type: 'smallint', default: 0 })
  dependents!: number;

  @Column({ name: 'family_notes', type: 'text', nullable: true })
  familyNotes!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
