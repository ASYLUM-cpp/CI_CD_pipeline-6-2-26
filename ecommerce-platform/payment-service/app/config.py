# ============================================================
# Payment Service – Configuration
# ============================================================
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_NAME: str = "payment-service"
    PORT: int = 8002
    DEBUG: bool = False

    DB_HOST: str = "localhost"
    DB_PORT: int = 5432
    DB_NAME: str = "payments_db"
    DB_USER: str = "postgres"
    DB_PASSWORD: str = "postgres"

    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379

    JWT_SECRET: str = "your-super-secret-jwt-key-change-in-production"
    RABBITMQ_URL: str = "amqp://guest:guest@localhost:5672"

    @property
    def database_url(self) -> str:
        return f"postgresql://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"

    class Config:
        env_file = ".env"


settings = Settings()
