import logging
import warnings
from pathlib import Path
from typing import List, Optional, Union
from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

INSECURE_DEV_SECRET_FALLBACK = "insecure-dev-placeholder-secret-change-in-env-file-32chars"


class Settings(BaseSettings):
    """TriNetra application configuration settings."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # API Metadata
    PROJECT_NAME: str = "TriNetra - Legal Metrology Compliance Inspection"
    VERSION: str = "0.1.0"
    DESCRIPTION: str = (
        "AI-assisted inspection system to check compliance of Packaged Commodities "
        "under Legal Metrology (Packaged Commodities) Rules."
    )
    API_V1_STR: str = "/api"

    # Environment
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # Database
    # Default to SQLite file under data/, PostgreSQL compatible
    DATABASE_URL: str = "sqlite:///./data/trinetra.db"

    # Security
    # In production, SECRET_KEY must be set in the environment and >= 32 chars.
    SECRET_KEY: str = INSECURE_DEV_SECRET_FALLBACK
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    SESSION_COOKIE_NAME: str = "trinetra_session"
    COOKIE_SECURE: bool = False  # Set to True in production with HTTPS
    COOKIE_SAMESITE: str = "lax"
    COOKIE_HTTPONLY: bool = True

    # Optional local development seed credentials (configured via .env, never hardcoded)
    DEFAULT_ADMIN_EMAIL: str = "admin@trinetra.gov.in"
    DEFAULT_ADMIN_PASSWORD: Optional[str] = None
    DEFAULT_OFFICER_EMAIL: str = "officer@trinetra.gov.in"
    DEFAULT_OFFICER_PASSWORD: Optional[str] = None

    # File Uploads (Strictly stored outside source tree)
    UPLOAD_DIR: Path = Path("./data/uploads")
    MAX_UPLOAD_SIZE_MB: int = 15
    ALLOWED_EXTENSIONS: List[str] = [".jpg", ".jpeg", ".png", ".webp"]
    ALLOWED_MIME_TYPES: List[str] = [
        "image/jpeg",
        "image/png",
        "image/webp",
    ]

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ]

    @field_validator("UPLOAD_DIR", mode="after")
    @classmethod
    def ensure_upload_dir(cls, v: Path) -> Path:
        v.mkdir(parents=True, exist_ok=True)
        return v

    @model_validator(mode="after")
    def validate_security(self) -> "Settings":
        is_prod = self.ENVIRONMENT.lower() in ("production", "prod")
        if is_prod:
            if (
                not self.SECRET_KEY
                or self.SECRET_KEY == INSECURE_DEV_SECRET_FALLBACK
                or self.SECRET_KEY.startswith("insecure-")
                or len(self.SECRET_KEY) < 32
            ):
                raise ValueError(
                    "Production security violation: SECRET_KEY must be explicitly set via environment, "
                    "cannot use development fallback placeholders, and must be at least 32 characters long."
                )
            if not self.COOKIE_SECURE:
                raise ValueError(
                    "Production security violation: COOKIE_SECURE must be True when ENVIRONMENT is production."
                )
        else:
            if self.SECRET_KEY == INSECURE_DEV_SECRET_FALLBACK or self.SECRET_KEY.startswith("insecure-"):
                warnings.warn(
                    "SECURITY NOTICE: Using non-secret development placeholder for SECRET_KEY. "
                    "Ensure a real secret is set in .env before deploying.",
                    UserWarning,
                    stacklevel=2,
                )
        return self

    @property
    def max_upload_size_bytes(self) -> int:
        return self.MAX_UPLOAD_SIZE_MB * 1024 * 1024


settings = Settings()

