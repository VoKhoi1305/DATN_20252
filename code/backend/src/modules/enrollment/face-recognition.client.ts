import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * HTTP client for the Face Recognition Python microservice.
 *
 * Architecture:
 *   Mobile → NestJS Backend → FaceRecognitionClient → Python FastAPI service
 *                                                      (InsightFace/ArcFace)
 *
 * The AI model runs on the server, not on the device, ensuring:
 * - Consistent accuracy across all devices
 * - Model updates without app releases
 * - Protection of model weights
 *
 * NOTE: Uses native fetch + FormData + Blob (Node 18+).
 * The form-data npm package is intentionally NOT used here because
 * Node's native fetch cannot correctly stream form-data's Readable output —
 * the Python FastAPI server receives a body it cannot parse.
 * Native FormData is handled directly by fetch with the correct boundary.
 */

interface EnrollResult {
  embedding: number[];
  embedding_version: string;
  quality_score: number;
  face_size: number;
  det_score: number;
  liveness: {
    is_real: boolean;
    liveness_score: number;
    detail: string;
  };
}

interface VerifyResult {
  match: boolean;
  similarity: number;
  threshold: number;
  embedding_version: string;
}

interface LivenessResult {
  is_real: boolean;
  liveness_score: number;
  detail: string;
}

interface VerifyWithLivenessResult {
  verify: VerifyResult;
  liveness: LivenessResult;
}

interface HealthResult {
  status: string;
  model_loaded: boolean;
  det_model: string;
  embedding_dim: number;
}

@Injectable()
export class FaceRecognitionClient {
  private readonly logger = new Logger(FaceRecognitionClient.name);
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService.get<string>(
      'FACE_SERVICE_URL',
      'http://localhost:8000',
    );
  }

  /**
   * Enroll face: detect + quality check + liveness + extract embedding.
   * Sends image to Python service, receives embedding for storage.
   */
  async enrollFace(imageBuffer: Buffer, filename: string): Promise<EnrollResult> {
    const formData = new FormData();
    formData.append('file', new Blob([new Uint8Array(imageBuffer)], { type: 'image/jpeg' }), filename);

    const response = await fetch(`${this.baseUrl}/enroll`, {
      method: 'POST',
      body: formData,
      // Do NOT set Content-Type manually — fetch sets it with the correct boundary
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(`Face enrollment failed: ${(error as any).detail || response.statusText}`);
    }

    return response.json() as Promise<EnrollResult>;
  }

  /**
   * Verify a face image against a stored embedding.
   * Used during check-in to match face against enrolled template.
   */
  async verifyFace(
    imageBuffer: Buffer,
    filename: string,
    storedEmbedding: number[],
    threshold?: number,
  ): Promise<VerifyResult> {
    const formData = new FormData();
    formData.append('file', new Blob([new Uint8Array(imageBuffer)], { type: 'image/jpeg' }), filename);
    formData.append('stored_embedding', JSON.stringify(storedEmbedding));
    if (threshold !== undefined) {
      formData.append('threshold', String(threshold));
    }

    const response = await fetch(`${this.baseUrl}/verify-image`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(`Face verification failed: ${(error as any).detail || response.statusText}`);
    }

    return response.json() as Promise<VerifyResult>;
  }

  /**
   * Check liveness of a face image (anti-spoofing).
   * Used during check-in to prevent static photo attacks.
   */
  async checkLiveness(imageBuffer: Buffer, filename: string): Promise<LivenessResult> {
    const formData = new FormData();
    formData.append('file', new Blob([new Uint8Array(imageBuffer)], { type: 'image/jpeg' }), filename);

    const response = await fetch(`${this.baseUrl}/liveness`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(`Liveness check failed: ${(error as any).detail || response.statusText}`);
    }

    return response.json() as Promise<LivenessResult>;
  }

  /**
   * Verify face + liveness in parallel.
   * Used during check-in for combined verification.
   */
  async verifyFaceWithLiveness(
    imageBuffer: Buffer,
    filename: string,
    storedEmbedding: number[],
    threshold?: number,
  ): Promise<VerifyWithLivenessResult> {
    const [verify, liveness] = await Promise.all([
      this.verifyFace(imageBuffer, filename, storedEmbedding, threshold),
      this.checkLiveness(imageBuffer, filename),
    ]);

    return { verify, liveness };
  }

  /**
   * Check Face Recognition service health.
   */
  async healthCheck(): Promise<HealthResult> {
    const response = await fetch(`${this.baseUrl}/health`);
    if (!response.ok) {
      throw new Error('Face Recognition service is unavailable');
    }
    return response.json() as Promise<HealthResult>;
  }
}
