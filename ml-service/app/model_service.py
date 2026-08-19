from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path

import joblib
import numpy as np

from .config import settings
from .feature_processor import FEATURE_NAMES, request_to_frame
from .schemas import PredictionRequest, PredictionResponse


@dataclass
class ModelArtifact:
    pipeline: object
    threshold: float
    score_low: float
    score_high: float
    trained_at: str | None
    model_version: str
    contamination: float


class ModelService:
    def __init__(self, model_path: Path):
        self.model_path = model_path
        self.artifact: ModelArtifact | None = None

    def load(self) -> None:
        payload = joblib.load(self.model_path)
        self.artifact = ModelArtifact(
            pipeline=payload["pipeline"],
            threshold=float(payload["threshold"]),
            score_low=float(payload["score_low"]),
            score_high=float(payload["score_high"]),
            trained_at=payload.get("trained_at"),
            model_version=payload.get("model_version", settings.model_version),
            contamination=float(payload.get("contamination", settings.contamination)),
        )

    @property
    def ready(self) -> bool:
        return self.artifact is not None

    def predict(self, request: PredictionRequest) -> PredictionResponse:
        if self.artifact is None:
            raise RuntimeError("Model has not been loaded.")
        frame = request_to_frame(request)
        raw_score = float(self.artifact.pipeline.decision_function(frame)[0])
        span = max(self.artifact.score_high - self.artifact.score_low, 1e-9)
        normality = np.clip(
            (raw_score - self.artifact.score_low) / span, 0.0, 1.0
        )
        anomaly_score = float(1.0 - normality)
        return PredictionResponse(
            transactionId=request.transaction_id,
            isSuspicious=raw_score < self.artifact.threshold,
            rawModelScore=round(raw_score, 6),
            normalizedAnomalyScore=round(anomaly_score, 6),
            modelName="Isolation Forest",
            modelVersion=self.artifact.model_version,
        )

    def info(self) -> dict:
        artifact = self.artifact
        return {
            "modelName": "Isolation Forest",
            "modelVersion": artifact.model_version if artifact else settings.model_version,
            "contamination": (
                artifact.contamination if artifact else settings.contamination
            ),
            "featureNames": FEATURE_NAMES,
            "trainedAt": artifact.trained_at if artifact else None,
        }
