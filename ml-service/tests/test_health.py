import asyncio

from app.main import app, health, lifespan
from app.model_service import ModelService
from app.schemas import PredictionRequest
from app.config import settings


def test_health_exposes_model_state() -> None:
    async def check_health() -> dict:
        async with lifespan(app):
            return health()

    response = asyncio.run(check_health())
    assert "modelLoaded" in response


def test_first_deposit_into_new_account_is_not_automatically_suspicious() -> None:
    service = ModelService(settings.model_path)
    service.load()
    result = service.predict(
        PredictionRequest(
            transactionId="00000000-0000-0000-0000-000000000001",
            amount=200,
            transactionType=0,
            transactionHour=12,
            dayOfWeek=1,
            typicalAccountAmount=0,
            confirmedNormalTransactionCount=0,
            recentTransactionCount=0,
            debitBalanceRatio=0,
        )
    )
    assert result.is_suspicious is False
    assert result.normalized_anomaly_score < 1


def test_routine_established_account_activity_is_not_suspicious() -> None:
    service = ModelService(settings.model_path)
    service.load()
    result = service.predict(
        PredictionRequest(
            transactionId="00000000-0000-0000-0000-000000000002",
            amount=75,
            transactionType=1,
            transactionHour=14,
            dayOfWeek=3,
            typicalAccountAmount=70,
            confirmedNormalTransactionCount=12,
            recentTransactionCount=2,
            debitBalanceRatio=0.03,
        )
    )
    assert result.is_suspicious is False
    assert 0 <= result.normalized_anomaly_score <= 1


def test_large_rapid_overnight_withdrawal_is_suspicious() -> None:
    service = ModelService(settings.model_path)
    service.load()
    result = service.predict(
        PredictionRequest(
            transactionId="00000000-0000-0000-0000-000000000003",
            amount=7500,
            transactionType=1,
            transactionHour=2,
            dayOfWeek=6,
            typicalAccountAmount=45,
            confirmedNormalTransactionCount=14,
            recentTransactionCount=18,
            debitBalanceRatio=0.9375,
        )
    )
    assert result.is_suspicious is True
    assert 0 <= result.normalized_anomaly_score <= 1


def test_small_deposit_after_a_large_pending_deposit_is_not_suspicious() -> None:
    service = ModelService(settings.model_path)
    service.load()
    result = service.predict(
        PredictionRequest(
            transactionId="00000000-0000-0000-0000-000000000004",
            amount=10,
            transactionType=0,
            transactionHour=14,
            dayOfWeek=3,
            # No confirmed-normal history: the pending 100M deposit must not
            # create a personal baseline for this account.
            typicalAccountAmount=0,
            confirmedNormalTransactionCount=0,
            recentTransactionCount=1,
            debitBalanceRatio=0,
        )
    )
    assert result.is_suspicious is False


def test_salary_deposit_after_a_small_deposit_is_not_suspicious() -> None:
    service = ModelService(settings.model_path)
    service.load()
    result = service.predict(
        PredictionRequest(
            transactionId="00000000-0000-0000-0000-000000000005",
            amount=500,
            transactionType=0,
            transactionHour=15,
            dayOfWeek=2,
            typicalAccountAmount=0,
            confirmedNormalTransactionCount=0,
            recentTransactionCount=1,
            debitBalanceRatio=0,
        )
    )
    assert result.is_suspicious is False
    assert result.normalized_anomaly_score < 0.6
