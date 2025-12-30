"""Application settings using Pydantic."""

from zoneinfo import ZoneInfo

from pydantic_settings import BaseSettings, SettingsConfigDict

# Timezone for Korea
KST = ZoneInfo("Asia/Seoul")


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Database
    database_url: str = "sqlite+aiosqlite:///./data/app.db"

    # OpenAI
    openai_api_key: str = ""

    # Target Forum
    target_forum_url: str = "https://example-forum.com"
    target_forum_name: str = "example_forum"

    # Collection Settings
    initial_load_months: int = 3
    scrape_rate_limit_seconds: float = 5.0
    incremental_interval_hours: int = 1

    # ChromaDB
    chroma_persist_directory: str = "./data/chroma"

    # Logging
    log_level: str = "INFO"

    # Embedding
    embedding_model: str = "text-embedding-3-small"
    embedding_dimensions: int = 1536

    # LLM
    llm_model: str = "gpt-4o-mini"

    # Relationship Detection
    similarity_threshold: float = 0.8  # Minimum similarity score for relationship
    max_similar_documents: int = 5  # Maximum similar documents to link

    # JWT Authentication
    jwt_secret_key: str = "change-me-in-production-use-openssl-rand-hex-32"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7
    refresh_token_expire_days_remember: int = 30

    # Google OAuth
    google_client_id: str = ""

    # SMTP Email
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    smtp_from_email: str = ""
    smtp_use_tls: bool = True

    # Frontend
    frontend_url: str = "http://localhost:3000"

    # API
    api_host: str = "0.0.0.0"
    api_port: int = 8000

    # Toss Payments
    toss_payments_secret_key: str = ""
    toss_payments_client_key: str = ""
    toss_api_base_url: str = "https://api.tosspayments.com"

    # Payment URLs
    payment_success_url: str = "http://localhost:3000/payment/success"
    payment_failure_url: str = "http://localhost:3000/payment/failure"

    # Session Configuration
    payment_session_timeout_minutes: int = 30


settings = Settings()


def validate_payment_settings() -> None:
    """Validate payment-related environment variables on startup.

    Raises:
        ValueError: If required payment settings are missing or invalid
    """
    if not settings.toss_payments_secret_key:
        raise ValueError(
            "TOSS_PAYMENTS_SECRET_KEY is required. "
            "Please set it in your .env file."
        )

    # Validate secret key format (should start with test_sk_ or live_sk_)
    if not settings.toss_payments_secret_key.startswith(("test_sk_", "live_sk_")):
        raise ValueError(
            "TOSS_PAYMENTS_SECRET_KEY has invalid format. "
            "It should start with 'test_sk_' or 'live_sk_'"
        )

    if not settings.payment_success_url:
        raise ValueError(
            "PAYMENT_SUCCESS_URL is required. "
            "Please set it in your .env file."
        )

    if not settings.payment_failure_url:
        raise ValueError(
            "PAYMENT_FAILURE_URL is required. "
            "Please set it in your .env file."
        )

    if settings.payment_session_timeout_minutes < 1:
        raise ValueError(
            "PAYMENT_SESSION_TIMEOUT_MINUTES must be at least 1 minute"
        )

    if settings.payment_session_timeout_minutes > 60:
        raise ValueError(
            "PAYMENT_SESSION_TIMEOUT_MINUTES should not exceed 60 minutes "
            "for security reasons"
        )
