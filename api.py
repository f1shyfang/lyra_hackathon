"""
FastAPI Server for LinkedIn PR Sentiment Classification

This API provides endpoints for predicting whether a LinkedIn post will
generate positive or negative PR using machine learning.
"""

import logging
import os
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Dict, Optional

import uvicorn
from fastapi import FastAPI, HTTPException, status
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator

from prediction_service import PRClassifierService

logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO").upper(),
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger("pr_api")


# Global service instance (populated during the lifespan startup)
prediction_service: Optional[PRClassifierService] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize the prediction service once, before the app serves traffic."""
    global prediction_service

    model_dir = os.getenv("MODEL_DIR", "output")
    api_key = os.getenv("GEMINI_API_KEY")

    if not api_key:
        # Fail fast: without the key the service can never produce a prediction,
        # so we don't want the platform to report a "healthy" deploy.
        raise RuntimeError(
            "GEMINI_API_KEY environment variable not set. "
            "Set it in the Render dashboard (or your local environment) "
            "before starting the server."
        )

    try:
        prediction_service = PRClassifierService(model_dir=model_dir, api_key=api_key)
        logger.info("Prediction service initialized with model from: %s", model_dir)
    except Exception:
        logger.exception("Failed to initialize prediction service")
        raise

    yield

    prediction_service = None


# Initialize FastAPI app
app = FastAPI(
    title="LinkedIn PR Sentiment Classifier API",
    description="Predict PR sentiment (positive/negative) for LinkedIn posts using AI",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS: configurable via ALLOWED_ORIGINS (comma-separated). Defaults to "*".
# The CORS spec forbids combining a wildcard origin with credentials, so we only
# enable credentials when explicit origins are listed.
_origins_env = os.getenv("ALLOWED_ORIGINS", "*").strip()
if _origins_env == "*":
    _allow_origins = ["*"]
    _allow_credentials = False
else:
    _allow_origins = [o.strip() for o in _origins_env.split(",") if o.strip()]
    _allow_credentials = True

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allow_origins,
    allow_credentials=_allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


# Pydantic models for request/response
class PredictionRequest(BaseModel):
    """Request model for PR prediction"""
    text: str = Field(..., description="LinkedIn post text content", min_length=1, max_length=10000)

    # Optional metadata fields
    post_hour: Optional[int] = Field(12, ge=0, le=23, description="Hour of posting (0-23)")
    post_day_of_week: Optional[int] = Field(2, ge=0, le=6, description="Day of week (0=Monday, 6=Sunday)")
    post_month: Optional[int] = Field(1, ge=1, le=12, description="Month (1-12)")
    has_media: Optional[int] = Field(0, ge=0, le=1, description="Has media (0 or 1)")
    media_count: Optional[int] = Field(0, ge=0, description="Number of media items")
    media_type: Optional[str] = Field("none", description="Media type (none/image/video)")
    post_type: Optional[str] = Field("regular", description="Post type (regular/article)")
    author_follower_count: Optional[int] = Field(1000, ge=0, description="Author follower count")
    avg_sentiment: Optional[float] = Field(0.0, ge=-1.0, le=1.0, description="Average comment sentiment")
    median_sentiment: Optional[float] = Field(0.0, ge=-1.0, le=1.0, description="Median comment sentiment")
    num_comments_analyzed: Optional[int] = Field(0, ge=0, description="Number of comments analyzed")

    @field_validator("text")
    @classmethod
    def text_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Text cannot be empty or whitespace only")
        return v.strip()

    model_config = {
        "json_schema_extra": {
            "example": {
                "text": "Excited to announce our new AI-powered analytics platform! This will transform how businesses understand their customers. #AI #Innovation",
                "post_hour": 14,
                "post_day_of_week": 2,
                "has_media": 1,
                "media_count": 1,
            }
        }
    }


class PredictionResponse(BaseModel):
    """Response model for PR prediction"""
    prediction: str = Field(..., description="Predicted sentiment: 'positive' or 'negative'")
    confidence: float = Field(..., description="Confidence score (0-1)")
    probabilities: Dict[str, float] = Field(..., description="Probability for each class")
    features_extracted: Dict = Field(..., description="Extracted features from input")
    timestamp: str = Field(..., description="Prediction timestamp")

    model_config = {
        "json_schema_extra": {
            "example": {
                "prediction": "positive",
                "confidence": 0.85,
                "probabilities": {"negative": 0.15, "positive": 0.85},
                "features_extracted": {
                    "text_length": 152,
                    "emoji_count": 0,
                    "url_count": 0,
                    "hashtag_count": 2,
                    "mention_count": 0,
                    "embedding_dimension": 768,
                },
                "timestamp": "2025-12-15T10:30:00Z",
            }
        }
    }


class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    message: str
    model_loaded: bool
    timestamp: str


@app.get("/", tags=["General"])
async def root():
    """Root endpoint with API information"""
    return {
        "name": "LinkedIn PR Sentiment Classifier API",
        "version": "1.0.0",
        "description": "Predict PR sentiment for LinkedIn posts",
        "endpoints": {
            "health": "/health",
            "predict": "/predict (POST)",
            "docs": "/docs",
        },
    }


@app.get("/health", response_model=HealthResponse, tags=["General"])
async def health_check():
    """Health check endpoint (used by Render's health checks)"""
    model_loaded = prediction_service is not None

    return HealthResponse(
        status="healthy" if model_loaded else "unhealthy",
        message="Service is running" if model_loaded else "Model not loaded",
        model_loaded=model_loaded,
        timestamp=_utc_now(),
    )


@app.post("/predict", response_model=PredictionResponse, tags=["Prediction"])
async def predict_pr_sentiment(request: PredictionRequest):
    """
    Predict PR sentiment for a LinkedIn post.

    Analyzes the provided post text and returns a prediction of whether it will
    generate positive or negative PR, along with confidence scores and extracted
    features.
    """
    if prediction_service is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Prediction service not initialized",
        )

    try:
        # The prediction makes a synchronous network call to the Gemini
        # embedding API; run it off the event loop so concurrent requests
        # aren't blocked.
        result = await run_in_threadpool(
            prediction_service.predict,
            text=request.text,
            post_hour=request.post_hour,
            post_day_of_week=request.post_day_of_week,
            post_month=request.post_month,
            has_media=request.has_media,
            media_count=request.media_count,
            media_type=request.media_type,
            post_type=request.post_type,
            author_follower_count=request.author_follower_count,
            avg_sentiment=request.avg_sentiment,
            median_sentiment=request.median_sentiment,
            num_comments_analyzed=request.num_comments_analyzed,
        )

        result["timestamp"] = _utc_now()
        return PredictionResponse(**result)

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid input: {str(e)}",
        )
    except RuntimeError as e:
        logger.error("Prediction failed: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Prediction failed: {str(e)}",
        )
    except Exception as e:
        logger.exception("Unexpected error during prediction")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error: {str(e)}",
        )


@app.get("/model-info", tags=["General"])
async def model_info():
    """Get information about the loaded model"""
    if prediction_service is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Prediction service not initialized",
        )

    embedding_dim = 30 if prediction_service.pca else 768
    return {
        "model_directory": prediction_service.model_dir,
        "pca_enabled": prediction_service.pca is not None,
        "embedding_model": "Gemini models/embedding-001",
        "classifier_model": "XGBoost",
        "features": {
            "embedding_dimension": embedding_dim,
            "metadata_features": len(prediction_service.metadata_features),
            "total_features": embedding_dim + len(prediction_service.metadata_features),
        },
        "encoders": {
            "post_types": list(prediction_service.post_type_encoder.classes_),
            "media_types": list(prediction_service.media_type_encoder.classes_),
        },
    }


# Local development entrypoint.
# In production (Render) the app is served by gunicorn/uvicorn via the start
# command, which binds to $PORT — see render.yaml.
if __name__ == "__main__":
    if not os.getenv("GEMINI_API_KEY"):
        print("❌ Error: GEMINI_API_KEY environment variable not set")
        print("   Please set it with: export GEMINI_API_KEY='your-api-key'")
        raise SystemExit(1)

    uvicorn.run(
        "api:app",
        host=os.getenv("HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", "8000")),
        reload=os.getenv("RELOAD", "false").lower() == "true",
        log_level=os.getenv("LOG_LEVEL", "info").lower(),
    )
