from pathlib import Path

from pydantic_settings import BaseSettings

_BACKEND_ROOT = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    CORS_ORIGINS: str = "http://localhost:3000"
    SEC_USER_AGENT: str = "StockAnalysisApp contact@example.com"
    CACHE_DB_PATH: str = str(_BACKEND_ROOT / "data" / "app.db")

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "allow"}


settings = Settings()
