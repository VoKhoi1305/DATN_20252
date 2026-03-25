"""
SMTTS Face Recognition Service
================================
FastAPI microservice for server-side face recognition.

Technology Stack:
- InsightFace (buffalo_l model pack):
  - RetinaFace: Face detection — handles various poses, occlusions, small faces
  - ArcFace-R100: Face recognition — 512-dim embeddings, 99.83% LFW accuracy
    Uses Additive Angular Margin Loss for highly discriminative embeddings.
- Anti-Spoofing: Texture-based frequency analysis (Laplacian + DCT + color stats)
- ONNX Runtime: Optimized inference on CPU (GPU optional)

Architecture:
  Mobile App  →  NestJS Backend  →  [This Service]
  (capture)      (orchestrator)      (AI inference)

Endpoints:
  POST /detect     — Detect faces in image
  POST /embed      — Extract 512-dim embedding from single face
  POST /verify     — Compare two embeddings (1:1 verification)
  POST /liveness   — Anti-spoofing check on face image
  POST /enroll     — Combined: detect + quality + liveness + embed (for enrollment)
  GET  /health     — Service health and model status
"""

import logging
from contextlib import asynccontextmanager

import numpy as np
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .face_engine import engine
from .models import (
    DetectResponse,
    EmbeddingResponse,
    EnrollVerifyResponse,
    ErrorResponse,
    HealthResponse,
    LivenessResponse,
    VerifyResponse,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load AI models at startup."""
    engine.load()
    yield


app = FastAPI(
    title="SMTTS Face Recognition Service",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Helper ──────────────────────────────────────────────────────

async def read_image_bytes(file: UploadFile) -> bytes:
    """Read and validate uploaded image."""
    content = await file.read()
    if len(content) > settings.max_image_size_mb * 1024 * 1024:
        raise HTTPException(
            status_code=413,
            detail=f"Image too large. Max {settings.max_image_size_mb}MB.",
        )
    return content


# ── Endpoints ───────────────────────────────────────────────────

@app.get("/health", response_model=HealthResponse)
async def health():
    """Check service health and model status."""
    return HealthResponse(
        status="ok",
        model_loaded=engine._app is not None,
        det_model=settings.det_model,
        embedding_dim=512,
    )


@app.post(
    "/detect",
    response_model=DetectResponse,
    responses={400: {"model": ErrorResponse}},
)
async def detect_faces(file: UploadFile = File(...)):
    """Detect all faces in an image. Returns bounding boxes and scores."""
    image_bytes = await read_image_bytes(file)
    try:
        image = engine.decode_image(image_bytes)
        faces = engine.detect_faces(image)
        return DetectResponse(
            faces_found=len(faces),
            faces=[
                {
                    "bbox": f["bbox"],
                    "det_score": f["det_score"],
                    "quality_score": f["quality_score"],
                    "face_size": f["face_size"],
                }
                for f in faces
            ],
        )
    except Exception as e:
        logger.exception("Face detection failed")
        raise HTTPException(status_code=400, detail=str(e))


@app.post(
    "/embed",
    response_model=EmbeddingResponse,
    responses={400: {"model": ErrorResponse}},
)
async def extract_embedding(file: UploadFile = File(...)):
    """
    Extract 512-dimensional ArcFace embedding from a single face.
    Validates: exactly 1 face, sufficient size, acceptable quality.
    """
    image_bytes = await read_image_bytes(file)
    try:
        image = engine.decode_image(image_bytes)
        result = engine.extract_embedding(image)
        return EmbeddingResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception("Embedding extraction failed")
        raise HTTPException(status_code=500, detail=str(e))


@app.post(
    "/verify",
    response_model=VerifyResponse,
    responses={400: {"model": ErrorResponse}},
)
async def verify_faces(
    embedding1: str = Form(..., description="JSON array of 512 floats"),
    embedding2: str = Form(..., description="JSON array of 512 floats"),
    threshold: float = Form(default=None, description="Custom threshold (default 0.45)"),
):
    """
    Compare two face embeddings using cosine similarity.
    Embeddings should be 512-dim float arrays from /embed endpoint.
    """
    import json

    try:
        emb1 = json.loads(embedding1)
        emb2 = json.loads(embedding2)
    except (json.JSONDecodeError, TypeError):
        raise HTTPException(status_code=400, detail="Invalid embedding format. Expected JSON arrays.")

    if len(emb1) != 512 or len(emb2) != 512:
        raise HTTPException(status_code=400, detail="Embeddings must be 512-dimensional.")

    result = engine.verify(emb1, emb2, threshold)
    return VerifyResponse(**result)


@app.post(
    "/liveness",
    response_model=LivenessResponse,
    responses={400: {"model": ErrorResponse}},
)
async def check_liveness(file: UploadFile = File(...)):
    """
    Anti-spoofing check using texture-based frequency analysis.
    Analyzes Laplacian variance, DCT high-frequency energy, and color saturation
    to distinguish real faces from printed photos or screen displays.
    """
    image_bytes = await read_image_bytes(file)
    try:
        image = engine.decode_image(image_bytes)
        result = engine.check_liveness(image)
        return LivenessResponse(**result)
    except Exception as e:
        logger.exception("Liveness check failed")
        raise HTTPException(status_code=400, detail=str(e))


@app.post(
    "/enroll",
    response_model=EnrollVerifyResponse,
    responses={400: {"model": ErrorResponse}},
)
async def enroll_face(file: UploadFile = File(...)):
    """
    Combined enrollment endpoint: detect + quality check + liveness + embed.
    Used during subject enrollment to capture and validate face data.

    Returns embedding for storage + liveness verification result.
    """
    image_bytes = await read_image_bytes(file)
    try:
        image = engine.decode_image(image_bytes)

        # Step 1: Extract embedding (includes detection + quality validation)
        embed_result = engine.extract_embedding(image)

        # Step 2: Liveness check
        liveness_result = engine.check_liveness(image)

        return EnrollVerifyResponse(
            embedding=embed_result["embedding"],
            embedding_version=embed_result["embedding_version"],
            quality_score=embed_result["quality_score"],
            face_size=embed_result["face_size"],
            det_score=embed_result["det_score"],
            liveness=LivenessResponse(**liveness_result),
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception("Enrollment face processing failed")
        raise HTTPException(status_code=500, detail=str(e))


@app.post(
    "/verify-image",
    response_model=VerifyResponse,
    responses={400: {"model": ErrorResponse}},
)
async def verify_face_image(
    file: UploadFile = File(..., description="New face image to verify"),
    stored_embedding: str = Form(..., description="JSON array of stored 512-dim embedding"),
    threshold: float = Form(default=None, description="Custom match threshold"),
):
    """
    Verify a face image against a stored embedding.
    Used during check-in to match face against enrolled template.
    """
    import json

    image_bytes = await read_image_bytes(file)
    try:
        stored_emb = json.loads(stored_embedding)
    except (json.JSONDecodeError, TypeError):
        raise HTTPException(status_code=400, detail="Invalid stored_embedding format.")

    if len(stored_emb) != 512:
        raise HTTPException(status_code=400, detail="Stored embedding must be 512-dimensional.")

    try:
        image = engine.decode_image(image_bytes)
        embed_result = engine.extract_embedding(image)
        verify_result = engine.verify(embed_result["embedding"], stored_emb, threshold)
        return VerifyResponse(**verify_result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception("Face verification failed")
        raise HTTPException(status_code=500, detail=str(e))
