FROM node:22-alpine AS build

WORKDIR /app

# Copy root package.json + workspaces
COPY package.json package-lock.json* ./
COPY shared/package.json shared/
COPY frontend/package.json frontend/

# Install dependencies
RUN npm install --workspace=shared --workspace=frontend

# Copy source
COPY shared/ shared/
COPY frontend/ frontend/

# Build shared package first
RUN npm run --workspace=shared build

# Build frontend (VITE_API_URL can be set at build time if needed)
ARG VITE_API_URL=""
ENV VITE_API_URL=$VITE_API_URL
RUN npm run --workspace=frontend build

# ── Serve with nginx ──
FROM nginx:alpine

COPY --from=build /app/frontend/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
