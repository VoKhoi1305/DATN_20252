"""Pydantic models for API request/response."""

from pydantic import BaseModel, Field


# ── Responses ──────────────────────────────────────────────────────

class BBox(BaseModel):
    x1: float
    y1: float
    x2: float
    y2: float


class FaceDetection(BaseModel):
    bbox: BBox
    det_score: float = Field(..., description="Detection confidence 0-1")
    quality_score: float = Field(..., description="Estimated quality 0-1")
    face_size: int = Field(..., description="Face width in pixels")


class DetectResponse(BaseModel):
    faces_found: int
    faces: list[FaceDetection]


class EmbeddingResponse(BaseModel):
    embedding: list[float] = Field(..., description="512-dim ArcFace embedding")
    embedding_version: str = Field(default="arcface_r100", description="Model version")
    quality_score: float
    face_size: int
    det_score: float


class VerifyResponse(BaseModel):
    match: bool
    similarity: float = Field(..., description="Cosine similarity score")
    threshold: float
    embedding_version: str = "arcface_r100"


class LivenessResponse(BaseModel):
    is_real: bool
    liveness_score: float = Field(..., description="Liveness confidence 0-1")
    detail: str = ""


class EnrollVerifyResponse(BaseModel):
    """Combined response for enrollment verification."""
    embedding: list[float]
    embedding_version: str = "arcface_r100"
    quality_score: float
    face_size: int
    det_score: float
    liveness: LivenessResponse


class HealthResponse(BaseModel):
    status: str = "ok"
    model_loaded: bool
    det_model: str
    embedding_dim: int = 512


class ErrorResponse(BaseModel):
    error: str
    detail: str = ""
