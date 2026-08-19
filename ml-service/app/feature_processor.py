import numpy as np
import pandas as pd

from .schemas import PredictionRequest

FEATURE_NAMES = [
    "log_amount",
    "transaction_hour",
    "day_of_week",
    "transaction_type",
    "debit_balance_ratio",
    "log_typical_account_amount",
    "relative_amount_to_baseline",
    "recent_transaction_count",
]


def to_feature_frame(values: pd.DataFrame) -> pd.DataFrame:
    """Create stable, account-relative features for Isolation Forest.

    Absolute account balances are deliberately excluded. A high-balance account
    is not suspicious by itself, and otherwise a prior large deposit makes a
    later small transaction look anomalous solely because of its balance.
    """
    amount = values["amount"].astype(float)
    baseline = values["typical_account_amount"].astype(float)
    enough_history = values["confirmed_normal_transaction_count"].astype(int) >= 5
    safe_baseline = baseline.where(enough_history, amount).clip(lower=1.0)
    relative_amount = (amount / safe_baseline).clip(lower=0.01, upper=100.0)

    return pd.DataFrame(
        {
            "log_amount": np.log1p(amount),
            "transaction_hour": values["transaction_hour"],
            "day_of_week": values["day_of_week"],
            "transaction_type": values["transaction_type"],
            "debit_balance_ratio": values["debit_balance_ratio"].clip(0.0, 1.0),
            "log_typical_account_amount": np.log1p(safe_baseline),
            "relative_amount_to_baseline": np.log(relative_amount),
            "recent_transaction_count": values["recent_transaction_count"],
        },
        columns=FEATURE_NAMES,
    )


def request_to_frame(value: PredictionRequest) -> pd.DataFrame:
    values = pd.DataFrame(
        [
            {
                "amount": value.amount,
                "transaction_hour": value.transaction_hour,
                "day_of_week": value.day_of_week,
                "transaction_type": value.transaction_type,
                "typical_account_amount": value.typical_account_amount,
                "confirmed_normal_transaction_count": value.confirmed_normal_transaction_count,
                "recent_transaction_count": value.recent_transaction_count,
                "debit_balance_ratio": value.debit_balance_ratio,
            }
        ]
    )
    return to_feature_frame(values)
