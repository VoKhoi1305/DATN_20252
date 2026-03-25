import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('nfc_records')
export class NfcRecord {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'subject_id', type: 'uuid' })
  subjectId!: string;

  @Column({ name: 'cccd_chip_hash', type: 'varchar', length: 128 })
  cccdChipHash!: string;

  @Column({ name: 'chip_serial', type: 'varchar', length: 100, nullable: true })
  chipSerial!: string | null;

  @Column({ name: 'passive_auth_data', type: 'bytea', nullable: true })
  passiveAuthData!: Buffer | null;

  @Column({ name: 'enrolled_at', type: 'timestamptz' })
  enrolledAt!: Date;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
