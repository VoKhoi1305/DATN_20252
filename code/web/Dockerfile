# ============================================================
# Stage 1 — Builder: install deps & build the SPA
# ============================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy manifests first for better layer caching
COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund

# Build args allow overriding API base at build time if needed
# (default uses same-origin /api/v1 served via Nginx reverse proxy)
ARG VITE_API_BASE_URL=/api/v1
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

COPY tsconfig*.json vite.config.ts index.html ./
COPY src ./src

RUN npm run build


# ============================================================
# Stage 2 — Runtime: Nginx serves static + reverse proxies /api
# ============================================================
FROM nginx:1.27-alpine AS runtime

# Drop the default config and replace with ours
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built static assets
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q --spider http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
