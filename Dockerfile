# ── Stage 1: build shared + frontend ─────────────────────────────────────────
FROM node:24-alpine AS builder

WORKDIR /app

# Install all deps (including devDeps needed for build)
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/frontend/package.json ./packages/frontend/
COPY packages/backend/package.json ./packages/backend/
RUN npm ci

# Copy source
COPY tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY packages/frontend ./packages/frontend
COPY packages/backend ./packages/backend

# Build shared first (frontend and backend depend on it)
RUN npm run build -w packages/shared

# Build frontend (produces packages/frontend/dist)
RUN npm run build -w packages/frontend

# Build backend (produces packages/backend/dist)
RUN npm run build -w packages/backend

# ── Stage 2: production image ─────────────────────────────────────────────────
FROM node:24-alpine

ENV NODE_ENV=production \
    PORT=80

WORKDIR /app

# Install only production deps
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/frontend/package.json ./packages/frontend/
COPY packages/backend/package.json ./packages/backend/
RUN npm ci --omit=dev

# Copy compiled backend
COPY --from=builder /app/packages/backend/dist ./packages/backend/dist

# Copy compiled shared (required by backend at runtime via require)
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist

# Frontend static files served from backend's working-directory ./public
COPY --from=builder /app/packages/frontend/dist ./public

EXPOSE 80

CMD ["node", "packages/backend/dist/index.js"]
