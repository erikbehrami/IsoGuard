from pathlib import Path
import sys

import joblib
import pandas as pd
from sklearn.metrics import classification_report, confusion_matrix, precision_score, recall_score

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.feature_processor import to_feature_frame
from scripts.generate_data import build_dataset

MODEL = ROOT / "models" / "isolation_forest.joblib"


def evaluate() -> None:
    # Use a different random seed from training so reported metrics measure
    # generalization instead of memorization of the training dataset.
    data = build_dataset(normal_count=3000, anomaly_count=400, seed=2027)
    artifact = joblib.load(MODEL)
    scores = artifact["pipeline"].decision_function(to_feature_frame(data))
    predicted = (scores < artifact["threshold"]).astype(int)
    actual = data["known_anomaly"].astype(int)
    false_positive_rate = float(((predicted == 1) & (actual == 0)).sum() / (actual == 0).sum())
    anomaly_recall = float(recall_score(actual, predicted))
    anomaly_precision = float(precision_score(actual, predicted))
    print(classification_report(actual, predicted, digits=4))
    print("Confusion matrix:")
    print(confusion_matrix(actual, predicted))
    print(f"False-positive rate: {false_positive_rate:.4f}")
    print(f"Anomaly precision: {anomaly_precision:.4f}")
    print(f"Anomaly recall: {anomaly_recall:.4f}")
    print(pd.Series(scores).describe(percentiles=[0.01, 0.05, 0.5, 0.95, 0.99]))

    if false_positive_rate > 0.06:
        raise SystemExit("Validation failed: false-positive rate exceeds 6%.")
    if anomaly_recall < 0.90:
        raise SystemExit("Validation failed: anomaly recall is below 90%.")


if __name__ == "__main__":
    evaluate()
