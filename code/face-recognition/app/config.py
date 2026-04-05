from __future__ import annotations

from typing import Tuple

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Configuration for the Face Recognition service."""

    # Server
    host: str = "0.0.0.0"
    port: int = 8000

    # Face detection & recognition
    det_model: str = "buffalo_l"  # InsightFace detection model pack
    det_size_w: int = 640
    det_size_h: int = 640
    face_score_threshold: float = 0.5  # Min confidence for face detection

    # Face quality
    min_face_size: int = 80  # Min face width/height in pixels
    min_quality_score: float = 0.4  # Min quality (blur, lighting, angle)

    # Face matching
    default_match_threshold: float = 0.45  # Cosine similarity threshold
    # ArcFace cosine similarity: >0.45 is typically a match

    # Anti-spoofing / Liveness
    liveness_threshold: float = 0.38  # Score above this = real face (calibrated for mobile JPEG)
    enable_liveness: bool = True

    # Limits
    max_image_size_mb: int = 10
    max_faces_per_image: int = 1  # For enrollment, expect exactly 1 face

    @property
    def det_size(self) -> Tuple[int, int]:
        return (self.det_size_w, self.det_size_h)

    model_config = {"env_prefix": "FACE_"}


settings = Settings()
