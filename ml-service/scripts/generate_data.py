from pathlib import Path

import numpy as np
import pandas as pd

OUTPUT = Path(__file__).resolve().parents[1] / "data" / "synthetic_transactions.csv"


def build_dataset(
    normal_count: int = 6000,
    anomaly_count: int = 240,
    seed: int = 42,
) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    normal_type = rng.integers(0, 3, normal_count)
    normal_amount = np.clip(rng.lognormal(3.8, 0.8, normal_count), 2, 1200)
    # Salary payments are routine deposits even when the receiving account has
    # little money. Include them explicitly so that a €500 credit is not
    # treated as suspicious merely because a prior €10 deposit was small.
    salary_deposit = (normal_type == 0) & (rng.random(normal_count) < 0.20)
    normal_amount[salary_deposit] = np.clip(
        rng.lognormal(np.log(900), 0.40, salary_deposit.sum()), 250, 5000
    )
    # Legitimate accounts span several balance tiers. The model must not treat a
    # high account balance as suspicious on its own.
    normal_balance = np.exp(rng.uniform(np.log(500), np.log(100_000_000), normal_count))
    # New accounts commonly begin with a deposit into a zero balance. Keep these
    # legitimate cold-start transactions in the normal training population.
    cold_start = (normal_type == 0) & (rng.random(normal_count) < 0.35)
    normal_balance[cold_start] = 0
    normal_amount = np.where(
        normal_type == 0,
        normal_amount,
        np.minimum(normal_amount, normal_balance * 0.7),
    )
    normal_after = np.where(
        normal_type == 0,
        normal_balance + normal_amount,
        normal_balance - normal_amount,
    )
    normal_typical_amount = np.clip(
        normal_amount * rng.lognormal(0, 0.35, normal_count), 5, 500
    )
    normal_typical_amount[cold_start] = 0
    normal_confirmed_count = rng.integers(5, 101, normal_count)
    normal_confirmed_count[cold_start] = 0
    normal_recent_count = rng.poisson(2, normal_count)
    normal_recent_count[cold_start] = 0
    normal = pd.DataFrame(
        {
            "amount": normal_amount,
            "transaction_hour": np.clip(rng.normal(14, 4, normal_count), 6, 23).astype(int),
            "day_of_week": rng.integers(0, 7, normal_count),
            "transaction_type": normal_type,
            "balance_before": normal_balance,
            "balance_after": normal_after,
            "typical_account_amount": normal_typical_amount,
            "confirmed_normal_transaction_count": normal_confirmed_count,
            "recent_transaction_count": normal_recent_count,
            "known_anomaly": 0,
        }
    )
    unusual_amount = rng.uniform(700, 8000, anomaly_count)
    unusual_balance = rng.uniform(800, 9000, anomaly_count)
    unusual = pd.DataFrame(
        {
            "amount": unusual_amount,
            "transaction_hour": rng.choice([0, 1, 2, 3, 4, 5], anomaly_count),
            "day_of_week": rng.integers(0, 7, anomaly_count),
            "transaction_type": rng.integers(1, 3, anomaly_count),
            "balance_before": unusual_balance,
            "balance_after": np.maximum(unusual_balance - unusual_amount, 0),
            "typical_account_amount": rng.uniform(15, 80, anomaly_count),
            "confirmed_normal_transaction_count": rng.integers(5, 101, anomaly_count),
            "recent_transaction_count": rng.integers(8, 30, anomaly_count),
            "known_anomaly": 1,
        }
    )
    data = pd.concat([normal, unusual], ignore_index=True)
    # Balance consumption is meaningful for debits only. Deposits add funds,
    # so their balance ratio remains neutral.
    data["debit_balance_ratio"] = np.where(
        data["transaction_type"] == 0,
        0.0,
        data["amount"] / data["balance_before"].clip(lower=0.01),
    )
    return data.sample(frac=1, random_state=seed).reset_index(drop=True)


if __name__ == "__main__":
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    dataset = build_dataset()
    dataset.to_csv(OUTPUT, index=False)
    print(f"Wrote {len(dataset)} synthetic transactions to {OUTPUT}")
