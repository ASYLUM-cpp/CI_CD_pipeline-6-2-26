# ============================================================
# Payment Service – Payment Routes
# Processes payments for orders.
# Simulates payment processing (no real payment gateway).
# ============================================================
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Payment
from app.schemas import PaymentCreate, PaymentResponse, PaymentUpdate
from app.auth import get_current_user
from app.messaging import publish_message

router = APIRouter(prefix="/api/payments", tags=["payments"])


@router.post("/", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED)
async def create_payment(
    payment_data: PaymentCreate,
    db: Session = Depends(get_db),
):
    """
    Create a payment for an order.
    Simulates payment processing with a generated transaction ID.
    In production, this would integrate with Stripe/PayPal/etc.
    """
    # Generate a mock transaction ID
    transaction_id = f"txn_{uuid.uuid4().hex[:16]}"

    payment = Payment(
        order_id=payment_data.order_id,
        user_id=payment_data.user_id,
        amount=payment_data.amount,
        payment_method=payment_data.payment_method,
        transaction_id=transaction_id,
        status="completed",  # Simulate successful payment
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)

    # Publish payment.completed event
    await publish_message("payment.completed", {
        "payment_id": payment.id,
        "order_id": payment.order_id,
        "amount": payment.amount,
        "transaction_id": transaction_id,
    })

    return payment


@router.get("/", response_model=list[PaymentResponse])
async def list_payments(
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """List all payments for the authenticated user."""
    payments = db.query(Payment).filter(Payment.user_id == user["id"]).all()
    return payments


@router.get("/{payment_id}", response_model=PaymentResponse)
async def get_payment(
    payment_id: int,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """Get a specific payment by ID."""
    payment = db.query(Payment).filter(
        Payment.id == payment_id,
        Payment.user_id == user["id"],
    ).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    return payment


@router.put("/{payment_id}", response_model=PaymentResponse)
async def update_payment(
    payment_id: int,
    update: PaymentUpdate,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """Update payment status (e.g., refund)."""
    payment = db.query(Payment).filter(
        Payment.id == payment_id,
        Payment.user_id == user["id"],
    ).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    if update.status:
        payment.status = update.status

    db.commit()
    db.refresh(payment)

    await publish_message("payment.updated", {
        "payment_id": payment.id,
        "order_id": payment.order_id,
        "status": payment.status,
    })

    return payment


@router.get("/order/{order_id}", response_model=list[PaymentResponse])
async def get_payments_by_order(
    order_id: int,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """Get all payments for a specific order."""
    payments = db.query(Payment).filter(
        Payment.order_id == order_id,
        Payment.user_id == user["id"],
    ).all()
    return payments
