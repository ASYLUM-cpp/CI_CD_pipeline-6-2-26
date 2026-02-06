# Payment Service – Tests (uses SQLite in-memory, no Postgres needed)
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
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["service"] == "payment-service"


def test_create_payment_no_auth():
    """Payment creation should succeed with in-memory DB."""
    response = client.post("/api/payments", json={
        "order_id": 1, "amount": 99.99, "user_id": 1
    })
    assert response.status_code == 201
    data = response.json()
    assert data["amount"] == 99.99
    assert data["status"] == "completed"
    assert data["transaction_id"].startswith("txn_")
