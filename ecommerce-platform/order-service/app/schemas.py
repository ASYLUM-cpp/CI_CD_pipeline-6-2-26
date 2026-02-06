# ============================================================
# Order Service – Pydantic Schemas
# Request/response models for API validation and serialization.
# ============================================================
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class OrderItemCreate(BaseModel):
    """Schema for creating an order item."""
    product_id: int
    quantity: int = 1
    price: float


class OrderCreate(BaseModel):
    """Schema for creating a new order."""
    items: List[OrderItemCreate]
    notes: Optional[str] = None


class OrderItemResponse(BaseModel):
    """Schema for order item in response."""
    id: int
    product_id: int
    quantity: int
    price: float

    class Config:
        from_attributes = True


class OrderResponse(BaseModel):
    """Schema for order in response."""
    id: int
    user_id: int
    status: str
    total: float
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime
    items: List[OrderItemResponse]

    class Config:
        from_attributes = True


class OrderUpdate(BaseModel):
    """Schema for updating order status."""
    status: Optional[str] = None
    notes: Optional[str] = None
