# ============================================================
# Order Service Dockerfile – Multi-stage Build (Python)
# Stage 1: Install dependencies in a builder image
# Stage 2: Slim production image
# ============================================================

# ---- Build Stage ----
FROM python:3.11-slim AS builder

WORKDIR /app

# Install system deps for psycopg2
RUN apt-get update && apt-get upgrade -y && \
    apt-get install -y --no-install-recommends gcc libpq-dev && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt

# ---- Production Stage ----
FROM python:3.11-slim

WORKDIR /app

# Install runtime dependency for PostgreSQL
RUN apt-get update && apt-get upgrade -y && \
    apt-get install -y --no-install-recommends libpq5 curl && \
    rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd -g 1001 appgroup && \
    useradd -u 1001 -g appgroup -m appuser

# Copy installed packages from builder
COPY --from=builder /root/.local /home/appuser/.local
ENV PATH=/home/appuser/.local/bin:$PATH

# Copy application source
COPY app/ ./app/

USER appuser

EXPOSE 8001

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:8001/health || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
