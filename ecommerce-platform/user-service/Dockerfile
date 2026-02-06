# ============================================================
# User Service Dockerfile – Multi-stage Build
# Stage 1: Install dependencies
# Stage 2: Production image with minimal footprint
# ============================================================

# ---- Build Stage ----
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# ---- Production Stage ----
FROM node:20-alpine

WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 appgroup && \
    adduser -u 1001 -G appgroup -s /bin/sh -D appuser

# Copy only production dependencies
COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force

# Copy application source
COPY --from=builder /app/src ./src

# Switch to non-root user
USER appuser

EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1

CMD ["node", "src/index.js"]
