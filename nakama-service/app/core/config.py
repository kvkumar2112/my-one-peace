from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env")

    APP_NAME: str = "nakama-service"
    DEBUG: bool = False

    MONGODB_URL: str = "mongodb://localhost:27017/my_one_peace"

    SECRET_KEY: str = "change-me-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    ALLOWED_ORIGINS: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    UPLOAD_DIR: str = "uploads"
    ANTHROPIC_API_KEY: str = ""


settings = Settings()
