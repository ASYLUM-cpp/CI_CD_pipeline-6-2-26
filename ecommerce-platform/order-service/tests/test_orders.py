# ============================================================
# Order Service – Unit Tests
# Uses SQLite in-memory DB to test without Postgres.
# ============================================================
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.models import Base
from app.database import get_db
from app.main import app

# --- In-memory SQLite for CI ---
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base.metadata.create_all(bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


def test_health_check():
    """Health endpoint should return healthy status."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["service"] == "order-service"


def test_create_order_requires_auth():
    """Creating an order without a token should return 403."""
    response = client.post("/api/orders", json={"items": []})
    assert response.status_code == 403


def test_list_orders_requires_auth():
    """Listing orders without a token should return 403."""
    response = client.get("/api/orders")
    assert response.status_code == 403
