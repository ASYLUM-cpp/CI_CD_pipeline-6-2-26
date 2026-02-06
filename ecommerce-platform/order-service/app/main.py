# ============================================================
# Order Service – FastAPI Application Entry Point
# Sets up the app, lifespan events, health checks, and routes.
# ============================================================
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine
from app.models import Base
from app.routes import router as order_router
from app.messaging import connect_rabbitmq, close_rabbitmq


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events for the application."""
    # Startup: create tables and connect to RabbitMQ
    Base.metadata.create_all(bind=engine)
    print("✅ Orders database tables ready")
    await connect_rabbitmq()
    yield
    # Shutdown: close RabbitMQ connection
    await close_rabbitmq()


app = FastAPI(
    title="Order Service",
    description="Manages customer orders for the e-commerce platform",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    """Liveness probe – returns healthy if the server is running."""
    return {"status": "healthy", "service": "order-service"}


@app.get("/ready")
async def readiness_check():
    """Readiness probe – checks DB connectivity."""
    try:
        from app.database import SessionLocal
        db = SessionLocal()
        db.execute("SELECT 1")
        db.close()
        return {"status": "ready"}
    except Exception as e:
        return {"status": "not ready", "error": str(e)}


# Register order routes
app.include_router(order_router)
