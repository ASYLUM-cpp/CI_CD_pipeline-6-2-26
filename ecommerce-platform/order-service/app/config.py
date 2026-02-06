# ============================================================
# Order Service – Configuration
# Loads environment variables with Pydantic Settings.
# ============================================================
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    APP_NAME: str = "order-service"
    PORT: int = 8001
    DEBUG: bool = False

    # PostgreSQL
    DB_HOST: str = "localhost"
    DB_PORT: int = 5432
    DB_NAME: str = "orders_db"
    DB_USER: str = "postgres"
    DB_PASSWORD: str = "postgres"

    # Redis
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379

    # JWT – must match user-service secret
    JWT_SECRET: str = "your-super-secret-jwt-key-change-in-production"

    # RabbitMQ
    RABBITMQ_URL: str = "amqp://guest:guest@localhost:5672"

    # Payment service URL
    PAYMENT_SERVICE_URL: str = "http://localhost:8002"

    @property
    def database_url(self) -> str:
        return f"postgresql://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"

    class Config:
        env_file = ".env"


settings = Settings()
