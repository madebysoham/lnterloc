import os
from pathlib import Path
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


BASE_DIR = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    APP_NAME: str = "Interloc Core In-Flight Interceptor"
    API_PREFIX: str = "/api/v1"
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = False

    # Latency and SLA Targets
    SLA_BUDGET_MS: float = 45.0

    # DPDP Act 2023 Salted PII Hashing
    SALT_KEY: str = "interloc-ephemeral-salt-key-default"

    # In-memory vs Redis toggle
    REDIS_ENABLED: bool = False
    REDIS_URL: str = "redis://localhost:6379/0"

    # RBI Jan 2027 Compensation Parameters
    MAX_COMPENSATION_INR: float = 25000.0
    COMPENSATION_PERCENTAGE: float = 0.85
    COMPENSATION_LOSS_CAP_INR: float = 50000.0
    BANK_LIABILITY_SHARE: float = 0.35

    # Time-Decay Recoverability Parameters
    RECOVERABILITY_R0: float = 0.95
    RECOVERABILITY_LAMBDA: float = 0.015
    RECOVERABILITY_DELTA_HOP: float = 0.15

    # Friction & Churn Cost Coefficients
    FRICTION_COST_INR: float = 250.0
    CHURN_COST_INR: float = 3500.0
    HOLD_LEAKAGE_INR: float = 120.0

    # Pareto Default Balancing Slider (0 = Pure Loss Minimization, 1 = Pure Friction Minimization)
    DEFAULT_PARETO_ALPHA: float = 0.45

    # External Mock Endpoints
    I4C_MOCK_URL: str = "http://localhost:8000/api/v1/mock/i4c/lien-dispatch"
    ML_MODEL_PATH: str = str(
        (BASE_DIR / "ml" / "saved_models" / "fraud_model.joblib")
        if (BASE_DIR / "ml" / "saved_models" / "fraud_model.joblib").exists()
        else (BASE_DIR / "ml" / "saved_models" / "model.pkl")
    )

    # CORS
    CORS_ORIGINS: List[str] = [
        "*",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ]


settings = Settings()
