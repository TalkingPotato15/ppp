"""Application settings using Pydantic."""

from pydantic_settings import BaseSettings, SettingsConfigDict


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


settings = Settings()
