"""CivicSetu Configuration Module."""

from typing import Literal
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Gemini AI Configuration
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.5-flash"
    
    # OpenRouter API Fallback Configuration
    OPENROUTER_API_KEY: str = ""
    OPENROUTER_MODEL: str = "particle-ai/particle-1:free"
    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"
    
    # Persistence Mode: "sqlite" (default local), "memory" (json), or "firestore" (GCP production)
    DATA_STORE_MODE: Literal["sqlite", "memory", "firestore"] = "sqlite"
    SQLITE_DB_PATH: str = "backend/data/civicsetu.db"
    
    # JWT Authentication
    JWT_SECRET: str = "civicsetu-secret-jwt-key-2025-bbmp"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 10080  # 7 days
    
    # Server configuration
    PORT: int = 8000
    
    # GCP Infrastructure (for firestore/GCS mode)
    GOOGLE_CLOUD_PROJECT: str = "civicsetu-demo"
    GCS_BUCKET: str = "civicsetu-media-us-central1"
    
    # Resilience & Demo Circuit Breaker (Default False for development, True in .env for demos)
    DEMO_FALLBACK_ON_QUOTA: bool = False
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
