# ============================================================
# Order Service – Order Routes
# Full CRUD for orders with JWT-protected endpoints.
# Creates orders, initiates payment via payment-service.
# ============================================================
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import httpx

from app.database import get_db
from app.models import Order, OrderItem
from app.schemas import OrderCreate, OrderResponse, OrderUpdate
from app.auth import get_current_user
from app.messaging import publish_message
from app.config import settings

router = APIRouter(prefix="/api/orders", tags=["orders"])


@router.post("/", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
async def create_order(
    order_data: OrderCreate,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """
    Create a new order for the authenticated user.
    Calculates total from items, persists to DB, and publishes event.
    """
    # Calculate total from items
    total = sum(item.price * item.quantity for item in order_data.items)

    # Create order record
    order = Order(user_id=user["id"], total=total, notes=order_data.notes)
    db.add(order)
    db.flush()  # Get the order ID before adding items

    # Add order items
    for item in order_data.items:
        db_item = OrderItem(
            order_id=order.id,
            product_id=item.product_id,
            quantity=item.quantity,
            price=item.price,
        )
        db.add(db_item)

    db.commit()
    db.refresh(order)

    # Publish order.created event
    await publish_message("order.created", {
        "order_id": order.id,
        "user_id": user["id"],
        "total": total,
    })

    # Initiate payment asynchronously (fire-and-forget)
    try:
        async with httpx.AsyncClient() as client:
            await client.post(
                f"{settings.PAYMENT_SERVICE_URL}/api/payments",
                json={"order_id": order.id, "amount": total, "user_id": user["id"]},
                headers={"Authorization": f"Bearer {user.get('token', '')}"},
                timeout=5.0,
            )
    except Exception as e:
        print(f"⚠️  Payment initiation failed: {e}")

    return order


@router.get("/", response_model=list[OrderResponse])
async def list_orders(
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """List all orders for the authenticated user."""
    orders = db.query(Order).filter(Order.user_id == user["id"]).order_by(Order.created_at.desc()).all()
    return orders


@router.get("/{order_id}", response_model=OrderResponse)
async def get_order(
    order_id: int,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """Get a specific order by ID (owner only)."""
    order = db.query(Order).filter(Order.id == order_id, Order.user_id == user["id"]).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


@router.put("/{order_id}", response_model=OrderResponse)
async def update_order(
    order_id: int,
    update: OrderUpdate,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """Update order status or notes."""
    order = db.query(Order).filter(Order.id == order_id, Order.user_id == user["id"]).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if update.status:
        order.status = update.status
    if update.notes is not None:
        order.notes = update.notes

    db.commit()
    db.refresh(order)

    await publish_message("order.updated", {"order_id": order.id, "status": order.status})
    return order


@router.delete("/{order_id}", status_code=status.HTTP_204_NO_CONTENT)
async def cancel_order(
    order_id: int,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """Cancel an order (set status to cancelled)."""
    order = db.query(Order).filter(Order.id == order_id, Order.user_id == user["id"]).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    order.status = "cancelled"
    db.commit()

    await publish_message("order.cancelled", {"order_id": order.id, "user_id": user["id"]})
