# ============================================================
# Payment Service – FastAPI Application Entry Point
# ============================================================
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import engine
from app.models import Base
from app.routes import router as payment_router
from app.messaging import connect_rabbitmq, close_rabbitmq


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    print("✅ Payments database tables ready")
    await connect_rabbitmq()
    yield
    await close_rabbitmq()


app = FastAPI(
    title="Payment Service",
    description="Processes payments for the e-commerce platform",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "payment-service"}


@app.get("/ready")
async def readiness_check():
    try:
        from app.database import SessionLocal
        db = SessionLocal()
        db.execute("SELECT 1")
        db.close()
        return {"status": "ready"}
    except Exception as e:
        return {"status": "not ready", "error": str(e)}


app.include_router(payment_router)
