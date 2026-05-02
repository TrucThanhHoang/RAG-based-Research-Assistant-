import re
from functools import lru_cache
from pathlib import Path

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_WEAK_JWT_DEFAULTS = {"change-me", "secret", "changeme", "your-secret-key", ""}
_WEAK_ADMIN_PASSWORDS = {"Admin123!", "admin", "password", "admin123", "123456", ""}
_PASSWORD_COMPLEXITY = re.compile(
    r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,}$"
)


class Settings(BaseSettings):
    app_name: str = "Research Paper Assistant API"
    environment: str = "development"
    debug: bool = False
    api_prefix: str = "/api"
    frontend_url: str = "http://localhost:3000"

    database_url: str = "postgresql+psycopg2://postgres:postgres@localhost:5432/rag_db"

    @field_validator("database_url", mode="before")
    @classmethod
    def fix_database_url(cls, v: str) -> str:
        if v.startswith("postgres://"):
            return v.replace("postgres://", "postgresql+psycopg2://", 1)
        if v.startswith("postgresql://"):
            return v.replace("postgresql://", "postgresql+psycopg2://", 1)
        return v
    chroma_persist_directory: str = str(Path(__file__).resolve().parents[1] / "vector_store")
    storage_directory: str = str(Path(__file__).resolve().parents[1] / "storage")

    jwt_secret_key: str = Field(..., alias="JWT_SECRET_KEY")
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7

    openai_api_key: str | None = Field(default=None, alias="OPENAI_API_KEY")
    anthropic_api_key: str | None = Field(default=None, alias="ANTHROPIC_API_KEY")
    anthropic_base_url: str | None = Field(default=None, alias="ANTHROPIC_BASE_URL")
    google_api_key: str | None = Field(default=None, alias="GOOGLE_API_KEY")
    embedding_model_name: str = Field("sentence-transformers/all-MiniLM-L6-v2", alias="EMBEDDING_MODEL_NAME")
    llm_provider: str = Field("openai", alias="LLM_PROVIDER")
    llm_model_name: str = Field("gpt-4o-mini", alias="LLM_MODEL_NAME")
    retrieval_top_k: int = Field(5, alias="RETRIEVAL_TOP_K")
    max_upload_size_mb: int = 50

    initial_admin_email: str = "admin@example.com"
    initial_admin_password: str = Field(..., alias="INITIAL_ADMIN_PASSWORD")
    initial_admin_name: str = "Administrator"

    @field_validator("jwt_secret_key")
    @classmethod
    def validate_jwt_secret(cls, v: str) -> str:
        if v in _WEAK_JWT_DEFAULTS:
            raise ValueError(
                "JWT_SECRET_KEY must be set to a strong random secret. "
                "Generate one with: python -c \"import secrets; print(secrets.token_urlsafe(64))\""
            )
        if len(v) < 32:
            raise ValueError("JWT_SECRET_KEY must be at least 32 characters")
        return v

    @field_validator("initial_admin_password")
    @classmethod
    def validate_admin_password(cls, v: str) -> str:
        if v in _WEAK_ADMIN_PASSWORDS:
            raise ValueError("INITIAL_ADMIN_PASSWORD is too common; choose a strong password")
        if not _PASSWORD_COMPLEXITY.match(v):
            raise ValueError(
                "INITIAL_ADMIN_PASSWORD must be at least 12 characters and contain "
                "uppercase, lowercase, digit, and special character"
            )
        return v

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
        populate_by_name=True,
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
