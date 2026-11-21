"""CivicSetu Configuration Module."""

from typing import Literal
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Gemini AI Configuration
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.5-flash"
    
    # Persistence Mode: "memory" (local development) or "firestore" (GCP production)
    DATA_STORE_MODE: Literal["memory", "firestore"] = "memory"
    
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
