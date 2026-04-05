from __future__ import annotations

"""
Core face recognition engine using InsightFace + ArcFace.

Model: buffalo_l (includes ArcFace-R100 for recognition + RetinaFace for detection)
- Detection: RetinaFace — high accuracy even on small/occluded faces
- Recognition: ArcFace-R100 — 512-dim embeddings, 99.83% accuracy on LFW
- Anti-spoofing: Texture-based analysis using 2.5D structure

Why ArcFace?
- Additive Angular Margin Loss produces highly discriminative embeddings
- State-of-the-art on MegaFace, LFW, CFP-FP benchmarks
- Efficient inference via ONNX Runtime (~30ms per face on CPU)
- Well-suited for 1:1 verification in enrollment/check-in scenarios
"""

import logging
from io import BytesIO
from typing import Optional

import cv2
import numpy as np
from insightface.app import FaceAnalysis
from PIL import Image

from .config import settings

logger = logging.getLogger(__name__)


class FaceEngine:
    """Singleton face analysis engine."""

    def __init__(self):
        self._app: Optional[FaceAnalysis] = None

    def load(self):
        """Load InsightFace models. Call once at startup."""
        logger.info("Loading InsightFace models (det_model=%s)...", settings.det_model)
        self._app = FaceAnalysis(
            name=settings.det_model,
            allowed_modules=["detection", "recognition"],
            providers=["CPUExecutionProvider"],
        )
        self._app.prepare(ctx_id=0, det_size=settings.det_size)
        logger.info("InsightFace models loaded successfully.")

    @property
    def app(self) -> FaceAnalysis:
        if self._app is None:
            raise RuntimeError("FaceEngine not initialized. Call load() first.")
        return self._app

    # ── Image Decoding ──────────────────────────────────────────

    def decode_image(self, image_bytes: bytes) -> np.ndarray:
        """Decode image bytes to BGR numpy array (OpenCV format)."""
        pil_image = Image.open(BytesIO(image_bytes))
        # Convert to RGB then to BGR for OpenCV
        rgb = np.array(pil_image.convert("RGB"))
        bgr = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
        return bgr

    # ── Face Detection ──────────────────────────────────────────

    def detect_faces(self, image: np.ndarray) -> list[dict]:
        """
        Detect faces and return metadata.
        Returns list of dicts with: bbox, det_score, face_size, quality_score
        """
        faces = self.app.get(image)
        results = []
        for face in faces:
            bbox = face.bbox.astype(float).tolist()
            face_width = int(bbox[2] - bbox[0])
            face_height = int(bbox[3] - bbox[1])
            face_size = min(face_width, face_height)

            quality = self._estimate_quality(image, bbox, face.det_score)

            results.append({
                "bbox": {
                    "x1": bbox[0], "y1": bbox[1],
                    "x2": bbox[2], "y2": bbox[3],
                },
                "det_score": float(face.det_score),
                "face_size": face_size,
                "quality_score": quality,
                "embedding": face.normed_embedding.tolist() if face.normed_embedding is not None else None,
            })

        # Sort by det_score descending
        results.sort(key=lambda x: x["det_score"], reverse=True)
        return results

    # ── Embedding Extraction ────────────────────────────────────

    def extract_embedding(self, image: np.ndarray) -> dict:
        """
        Extract 512-dim ArcFace embedding from the best face in image.
        Raises ValueError if no face found or quality too low.
        """
        faces = self.app.get(image)
        if not faces:
            raise ValueError("No face detected in image")

        if len(faces) > settings.max_faces_per_image:
            raise ValueError(
                f"Multiple faces detected ({len(faces)}). Expected exactly 1 face for enrollment."
            )

        face = faces[0]
        bbox = face.bbox.astype(float).tolist()
        face_width = int(bbox[2] - bbox[0])
        face_height = int(bbox[3] - bbox[1])
        face_size = min(face_width, face_height)

        if face_size < settings.min_face_size:
            raise ValueError(
                f"Face too small ({face_size}px). Minimum is {settings.min_face_size}px. "
                "Move closer to the camera."
            )

        quality = self._estimate_quality(image, bbox, face.det_score)
        if quality < settings.min_quality_score:
            raise ValueError(
                f"Face quality too low ({quality:.2f}). Minimum is {settings.min_quality_score}. "
                "Ensure good lighting and look directly at the camera."
            )

        if face.normed_embedding is None:
            raise ValueError("Failed to extract face embedding")

        return {
            "embedding": face.normed_embedding.tolist(),
            "embedding_version": "arcface_r100",
            "quality_score": round(quality, 4),
            "face_size": face_size,
            "det_score": round(float(face.det_score), 4),
        }

    # ── Face Verification (1:1) ─────────────────────────────────

    def verify(
        self,
        embedding1: list,
        embedding2: list,
        threshold: Optional[float] = None,
    ) -> dict:
        """
        Compare two face embeddings using cosine similarity.
        ArcFace embeddings are already L2-normalized, so dot product = cosine similarity.
        """
        if threshold is None:
            threshold = settings.default_match_threshold

        vec1 = np.array(embedding1, dtype=np.float32)
        vec2 = np.array(embedding2, dtype=np.float32)

        # Cosine similarity (embeddings are already normalized by InsightFace)
        similarity = float(np.dot(vec1, vec2))

        return {
            "match": similarity >= threshold,
            "similarity": round(similarity, 6),
            "threshold": threshold,
            "embedding_version": "arcface_r100",
        }

    # ── Liveness / Anti-Spoofing ────────────────────────────────

    def check_liveness(self, image: np.ndarray) -> dict:
        """
        Texture-based anti-spoofing analysis.

        Uses frequency-domain analysis (Laplacian variance + high-frequency energy)
        to distinguish real faces from printed photos / screen replays.
        Real faces have richer micro-texture and higher frequency detail.

        For production, consider dedicated models like:
        - Silent-Face-Anti-Spoofing (MinivisionAI)
        - FAS from InsightFace (patch-based CNN)
        """
        faces = self.app.get(image)
        if not faces:
            return {
                "is_real": False,
                "liveness_score": 0.0,
                "detail": "No face detected",
            }

        face = faces[0]
        bbox = face.bbox.astype(int)
        x1, y1, x2, y2 = max(0, bbox[0]), max(0, bbox[1]), bbox[2], bbox[3]
        face_crop = image[y1:y2, x1:x2]

        if face_crop.size == 0:
            return {
                "is_real": False,
                "liveness_score": 0.0,
                "detail": "Face region invalid",
            }

        # Convert to grayscale for texture analysis
        gray = cv2.cvtColor(face_crop, cv2.COLOR_BGR2GRAY)

        # 1) Laplacian variance — measures focus/texture sharpness
        #    Real faces have higher variance due to skin micro-texture
        laplacian = cv2.Laplacian(gray, cv2.CV_64F)
        lap_var = laplacian.var()

        # 2) High-frequency energy via DCT
        #    Real faces have richer high-frequency components
        gray_f = np.float32(gray)
        # Resize to fixed size for consistent analysis
        gray_resized = cv2.resize(gray_f, (128, 128))
        dct = cv2.dct(gray_resized)
        # High-frequency energy ratio (bottom-right quadrant of DCT)
        h, w = dct.shape
        hf_energy = np.sum(np.abs(dct[h // 2 :, w // 2 :])) / (np.sum(np.abs(dct)) + 1e-8)

        # 3) Color variation in face region (screens have limited color gamut)
        hsv = cv2.cvtColor(face_crop, cv2.COLOR_BGR2HSV)
        sat_std = float(np.std(hsv[:, :, 1]))

        # Combine scores (weighted heuristic)
        # Calibrated for mobile JPEG (CameraX front camera, quality=90):
        # - JPEG compression reduces Laplacian variance significantly vs. high-res cameras
        # - DCT high-frequency energy is lower in compressed images
        # - Typical real-face range on mobile: lap_var=50-400, hf=0.04-0.15, sat_std=10-40
        lap_score = min(1.0, lap_var / 150.0)   # was 800 (for professional cameras)
        hf_score = min(1.0, hf_energy / 0.10)   # was 0.25 (JPEG removes HF content)
        sat_score = min(1.0, sat_std / 20.0)     # was 40 (mobile front cam)

        liveness_score = 0.5 * lap_score + 0.3 * hf_score + 0.2 * sat_score
        liveness_score = round(float(liveness_score), 4)

        is_real = liveness_score >= settings.liveness_threshold

        return {
            "is_real": is_real,
            "liveness_score": liveness_score,
            "detail": (
                f"laplacian={lap_var:.1f}, hf_energy={hf_energy:.4f}, sat_std={sat_std:.1f}"
            ),
        }

    # ── Quality Estimation ──────────────────────────────────────

    def _estimate_quality(
        self, image: np.ndarray, bbox: list[float], det_score: float
    ) -> float:
        """
        Estimate face image quality based on:
        - Detection confidence
        - Face sharpness (Laplacian variance)
        - Face size relative to image
        """
        x1, y1, x2, y2 = [int(v) for v in bbox]
        x1, y1 = max(0, x1), max(0, y1)
        face_crop = image[y1:y2, x1:x2]

        if face_crop.size == 0:
            return 0.0

        # Sharpness via Laplacian
        gray = cv2.cvtColor(face_crop, cv2.COLOR_BGR2GRAY)
        lap_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        sharpness = min(1.0, lap_var / 500.0)

        # Size score
        face_size = min(x2 - x1, y2 - y1)
        size_score = min(1.0, face_size / 200.0)

        # Combined quality
        quality = 0.4 * det_score + 0.35 * sharpness + 0.25 * size_score
        return round(float(quality), 4)


# Singleton instance
engine = FaceEngine()
