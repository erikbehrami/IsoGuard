from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_path: Path = Path("models/isolation_forest.joblib")
    model_version: str = "1.0.0"
    contamination: float = 0.03

    model_config = SettingsConfigDict(
        env_file=".env",
        env_prefix="ML_",
        case_sensitive=False,
    )


settings = Settings()
