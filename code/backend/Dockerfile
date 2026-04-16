# ============================================================
# Stage 1 — Builder: install all deps & compile TypeScript
# ============================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Install build deps (needed by some native modules: bcrypt, sharp, etc.)
RUN apk add --no-cache python3 make g++

# Copy manifests first for better layer caching
COPY package.json package-lock.json* ./
# Use install (not ci) so a slightly stale lockfile won't break the build.
RUN npm install --no-audit --no-fund

# Copy source and build
COPY tsconfig*.json nest-cli.json ./
COPY src ./src
RUN npm run build

# Strip dev dependencies for the runtime stage
RUN npm prune --omit=dev


# ============================================================
# Stage 2 — Runtime: minimal image, prod deps only
# ============================================================
FROM node:20-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production \
    APP_PORT=3000

# Non-root user for safety
RUN addgroup -S smtts && adduser -S smtts -G smtts

# Copy compiled output and pruned node_modules from builder
COPY --from=builder --chown=smtts:smtts /app/dist ./dist
COPY --from=builder --chown=smtts:smtts /app/node_modules ./node_modules
COPY --from=builder --chown=smtts:smtts /app/package.json ./package.json

# Uploads directory will be mounted as a volume; create with right ownership
RUN mkdir -p /app/uploads && chown -R smtts:smtts /app/uploads

USER smtts

EXPOSE 3000

# Simple TCP healthcheck — backend listens on APP_PORT
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:'+process.env.APP_PORT+'/api/v1', r => process.exit(r.statusCode < 500 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "dist/main.js"]
