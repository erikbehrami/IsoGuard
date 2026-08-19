from uuid import UUID

from pydantic import BaseModel, Field


class PredictionRequest(BaseModel):
    transaction_id: UUID = Field(alias="transactionId")
    amount: float = Field(gt=0)
    transaction_type: int = Field(alias="transactionType", ge=0, le=2)
    transaction_hour: int = Field(alias="transactionHour", ge=0, le=23)
    day_of_week: int = Field(alias="dayOfWeek", ge=0, le=6)
    typical_account_amount: float = Field(alias="typicalAccountAmount", ge=0)
    confirmed_normal_transaction_count: int = Field(
        alias="confirmedNormalTransactionCount", ge=0
    )
    recent_transaction_count: int = Field(alias="recentTransactionCount", ge=0)
    debit_balance_ratio: float = Field(alias="debitBalanceRatio", ge=0)


class PredictionResponse(BaseModel):
    transaction_id: UUID = Field(alias="transactionId")
    is_suspicious: bool = Field(alias="isSuspicious")
    raw_model_score: float = Field(alias="rawModelScore")
    normalized_anomaly_score: float = Field(alias="normalizedAnomalyScore")
    model_name: str = Field(alias="modelName")
    model_version: str = Field(alias="modelVersion")

    model_config = {"populate_by_name": True}


class ModelInfo(BaseModel):
    model_name: str = Field(alias="modelName")
    model_version: str = Field(alias="modelVersion")
    contamination: float
    feature_names: list[str] = Field(alias="featureNames")
    trained_at: str | None = Field(alias="trainedAt")

    model_config = {"populate_by_name": True}
