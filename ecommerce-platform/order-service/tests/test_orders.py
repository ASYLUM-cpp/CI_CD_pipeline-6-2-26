# ============================================================
# Order Service – Unit Tests
# Tests order CRUD endpoints with mocked dependencies.
# ============================================================
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from app.main import app

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
