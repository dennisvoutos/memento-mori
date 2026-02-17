FROM node:22-alpine AS base

WORKDIR /app

# Copy root package.json + workspaces
COPY package.json package-lock.json* ./
COPY shared/package.json shared/
COPY backend/package.json backend/

# Install dependencies
RUN npm install --workspace=shared --workspace=backend

# Copy source
COPY shared/ shared/
COPY backend/ backend/

# Generate Prisma client
RUN npx prisma generate --schema=backend/prisma/schema.prisma

# Build backend
RUN npm run --workspace=backend build 2>/dev/null || true

EXPOSE 3001

CMD ["node", "backend/src/index.ts"]
