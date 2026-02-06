# ============================================================
# Frontend Dockerfile – Multi-stage Build
# Stage 1: Build the React app with Node.js
# Stage 2: Serve static files with NGINX
# ============================================================

# ---- Build Stage ----
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first for layer caching
COPY package*.json ./
RUN npm install

# Copy source and build
COPY . .
RUN npm run build

# ---- Production Stage ----
FROM nginx:1.25-alpine

# Copy custom NGINX config
COPY --from=builder /app/build /usr/share/nginx/html

# NGINX config for SPA routing (redirect all routes to index.html)
RUN echo 'server { \
    listen 80; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
    location /health { \
        access_log off; \
        return 200 "healthy"; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
