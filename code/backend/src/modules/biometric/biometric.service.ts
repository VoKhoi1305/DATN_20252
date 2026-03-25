import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { FaceTemplate } from './entities/face-template.entity';
import { NfcRecord } from './entities/nfc-record.entity';
import { BiometricLog } from './entities/biometric-log.entity';
import { FaceResult, LivenessResult, NfcResult } from './entities/biometric-log.entity';
import { BIOMETRIC_DB_CONNECTION } from '../../config/biometric-database.config';

@Injectable()
export class BiometricService {
  private readonly logger = new Logger(BiometricService.name);

  constructor(
    @InjectRepository(FaceTemplate, BIOMETRIC_DB_CONNECTION)
    private readonly faceTemplateRepo: Repository<FaceTemplate>,
    @InjectRepository(NfcRecord, BIOMETRIC_DB_CONNECTION)
    private readonly nfcRecordRepo: Repository<NfcRecord>,
    @InjectRepository(BiometricLog, BIOMETRIC_DB_CONNECTION)
    private readonly biometricLogRepo: Repository<BiometricLog>,
  ) {}

  // ── Face Template ──────────────────────────────────────────

  async enrollFaceTemplate(data: {
    subjectId: string;
    embedding: number[];
    embeddingVersion: string;
    sourceImageHash: string;
    qualityScore: number;
  }): Promise<FaceTemplate> {
    // Deactivate any existing active template
    await this.faceTemplateRepo.update(
      { subjectId: data.subjectId, isActive: true },
      { isActive: false },
    );

    // Store embedding as binary buffer (Float32Array → Buffer)
    const float32 = new Float32Array(data.embedding);
    const embeddingBuffer = Buffer.from(float32.buffer);

    const template = this.faceTemplateRepo.create({
      subjectId: data.subjectId,
      embedding: embeddingBuffer,
      embeddingVersion: data.embeddingVersion,
      sourceImageHash: data.sourceImageHash,
      qualityScore: data.qualityScore,
      enrolledAt: new Date(),
      isActive: true,
    });

    return this.faceTemplateRepo.save(template);
  }

  async getActiveFaceTemplate(subjectId: string): Promise<FaceTemplate | null> {
    return this.faceTemplateRepo.findOne({
      where: { subjectId, isActive: true },
    });
  }

  /**
   * Decode stored embedding from BYTEA back to number array.
   */
  decodeEmbedding(buffer: Buffer): number[] {
    const float32 = new Float32Array(
      buffer.buffer,
      buffer.byteOffset,
      buffer.byteLength / 4,
    );
    return Array.from(float32);
  }

  // ── NFC Record ─────────────────────────────────────────────

  async enrollNfcRecord(data: {
    subjectId: string;
    cccdChipHash: string;
    chipSerial?: string;
    passiveAuthData?: Buffer;
  }): Promise<NfcRecord> {
    // Deactivate existing
    await this.nfcRecordRepo.update(
      { subjectId: data.subjectId, isActive: true },
      { isActive: false },
    );

    const record = this.nfcRecordRepo.create({
      subjectId: data.subjectId,
      cccdChipHash: data.cccdChipHash,
      chipSerial: data.chipSerial ?? null,
      passiveAuthData: data.passiveAuthData ?? null,
      enrolledAt: new Date(),
      isActive: true,
    });

    return this.nfcRecordRepo.save(record);
  }

  async getActiveNfcRecord(subjectId: string): Promise<NfcRecord | null> {
    return this.nfcRecordRepo.findOne({
      where: { subjectId, isActive: true },
    });
  }

  /**
   * Verify NFC chip hash matches enrolled record.
   */
  async verifyNfc(subjectId: string, chipHash: string): Promise<boolean> {
    const record = await this.getActiveNfcRecord(subjectId);
    if (!record) return false;
    return record.cccdChipHash === chipHash;
  }

  // ── Biometric Log ──────────────────────────────────────────

  async createBiometricLog(data: {
    subjectId: string;
    eventId: string;
    faceMatchScore: number;
    faceThreshold: number;
    faceResult: FaceResult;
    livenessResult?: LivenessResult;
    nfcResult: NfcResult;
    matchDurationMs?: number;
  }): Promise<BiometricLog> {
    const log = this.biometricLogRepo.create({
      subjectId: data.subjectId,
      eventId: data.eventId,
      faceMatchScore: data.faceMatchScore,
      faceThreshold: data.faceThreshold,
      faceResult: data.faceResult,
      livenessResult: data.livenessResult ?? null,
      nfcResult: data.nfcResult,
      matchDurationMs: data.matchDurationMs ?? null,
    });

    return this.biometricLogRepo.save(log);
  }

  // ── Enrollment Status Check ────────────────────────────────

  async getEnrollmentStatus(subjectId: string): Promise<{
    faceEnrolled: boolean;
    nfcEnrolled: boolean;
    complete: boolean;
  }> {
    const [face, nfc] = await Promise.all([
      this.getActiveFaceTemplate(subjectId),
      this.getActiveNfcRecord(subjectId),
    ]);

    const faceEnrolled = face !== null;
    const nfcEnrolled = nfc !== null;

    return {
      faceEnrolled,
      nfcEnrolled,
      complete: faceEnrolled && nfcEnrolled,
    };
  }

  /**
   * Hash chip data for storage/comparison.
   */
  hashChipData(chipData: string): string {
    return crypto.createHash('sha256').update(chipData).digest('hex');
  }
}
