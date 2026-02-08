# ============================================================
# Product Service Dockerfile – Multi-stage Build
# ============================================================

FROM node:20-alpine AS builder
RUN apk upgrade --no-cache
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

FROM node:20-alpine
RUN apk upgrade --no-cache
WORKDIR /app

RUN addgroup -g 1001 appgroup && \
    adduser -u 1001 -G appgroup -s /bin/sh -D appuser

COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force
COPY --from=builder /app/src ./src

USER appuser
EXPOSE 3002

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3002/health || exit 1

CMD ["node", "src/index.js"]
