# ─────────────────────────────────────────────────────────────────────────────
# CuraBook Frontend — Dockerfile
# F-14 FIX: Migrated from CRA (react-scripts) to Vite.
# Build output is still /app/build (outDir: 'build' in vite.config.js)
# so nginx COPY path and docker-compose volumes are unchanged.
# ─────────────────────────────────────────────────────────────────────────────

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Cache dependencies layer
COPY package.json package-lock.json ./
RUN npm ci --silent

# Copy source and build
COPY . .

# F-14: Vite uses VITE_* env vars at build time.
# REACT_APP_* aliases are also accepted (see vite.config.js envPrefix).
ARG VITE_API_URL
ARG VITE_WS_URL
ARG REACT_APP_API_URL
ARG REACT_APP_WS_URL
ENV VITE_API_URL=${VITE_API_URL:-$REACT_APP_API_URL}
ENV VITE_WS_URL=${VITE_WS_URL:-$REACT_APP_WS_URL}

# F-14: `npm run build` now calls `vite build` (outputs to build/)
RUN npm run build

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2: Serve (nginx) — unchanged from before
# ─────────────────────────────────────────────────────────────────────────────
FROM nginx:alpine AS production

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy built assets (vite.config.js outDir is 'build' — matches CRA output path)
COPY --from=builder /app/build /usr/share/nginx/html

# Copy nginx config for React Router (HTML5 history API)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
