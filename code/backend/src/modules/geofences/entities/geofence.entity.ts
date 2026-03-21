import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';

export enum GeofenceType {
  CIRCLE = 'CIRCLE',
  POLYGON = 'POLYGON',
}

@Entity('geofences')
export class Geofence {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 30, unique: true })
  code!: string;

  @Column({ type: 'varchar', length: 200 })
  name!: string;

  @Column({
    type: 'enum',
    enum: GeofenceType,
    enumName: 'geofence_type',
    default: GeofenceType.CIRCLE,
  })
  type!: GeofenceType;

  @Column({ type: 'text', nullable: true })
  address!: string | null;

  @Column({ name: 'center_lat', type: 'decimal', precision: 10, scale: 7, nullable: true })
  centerLat!: number | null;

  @Column({ name: 'center_lng', type: 'decimal', precision: 10, scale: 7, nullable: true })
  centerLng!: number | null;

  @Column({ type: 'integer', nullable: true })
  radius!: number | null;

  @Column({ type: 'jsonb', nullable: true })
  coordinates!: unknown | null;

  @Column({ name: 'area_id', type: 'uuid', nullable: true })
  areaId!: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'created_by_id', type: 'uuid' })
  createdById!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;
}
