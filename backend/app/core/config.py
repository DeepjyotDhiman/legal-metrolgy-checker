from pathlib import Path
from typing import List, Optional, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


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
    SECRET_KEY: str = "insecure-dev-secret-key-change-in-env-file-min-32-chars-xyz"
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

    @property
    def max_upload_size_bytes(self) -> int:
        return self.MAX_UPLOAD_SIZE_MB * 1024 * 1024


settings = Settings()
