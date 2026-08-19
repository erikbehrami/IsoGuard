from datetime import UTC, datetime
from pathlib import Path
import sys

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import RobustScaler

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.config import settings
from app.feature_processor import FEATURE_NAMES, to_feature_frame

DATA = ROOT / "data" / "synthetic_transactions.csv"
MODEL = ROOT / "models" / "isolation_forest.joblib"


def train() -> None:
    data = pd.read_csv(DATA)
    normal_training_data = to_feature_frame(data.loc[data["known_anomaly"] == 0])
    pipeline = Pipeline(
        [
            ("scaler", RobustScaler()),
            (
                "model",
                IsolationForest(
                    n_estimators=300,
                    contamination=settings.contamination,
                    random_state=42,
                    n_jobs=-1,
                ),
            ),
        ]
    )
    pipeline.fit(normal_training_data)
    scores = pipeline.decision_function(normal_training_data)
    threshold = float(np.quantile(scores, settings.contamination))
    artifact = {
        "pipeline": pipeline,
        "threshold": threshold,
        "score_low": float(np.quantile(scores, 0.01)),
        "score_high": float(np.quantile(scores, 0.99)),
        "trained_at": datetime.now(UTC).isoformat(),
        "model_version": settings.model_version,
        "contamination": settings.contamination,
        "feature_names": FEATURE_NAMES,
    }
    MODEL.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(artifact, MODEL)
    print(f"Saved Isolation Forest {settings.model_version} to {MODEL}")


if __name__ == "__main__":
    train()
