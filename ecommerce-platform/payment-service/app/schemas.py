# ============================================================
# Payment Service – Schemas
# ============================================================
from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class PaymentCreate(BaseModel):
    order_id: int
    amount: float
    user_id: int
    payment_method: str = "credit_card"


class PaymentResponse(BaseModel):
    id: int
    order_id: int
    user_id: int
    amount: float
    status: str
    payment_method: str
    transaction_id: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PaymentUpdate(BaseModel):
    status: Optional[str] = None
