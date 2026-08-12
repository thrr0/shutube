# ── Build stage ───────────────────────────────────────────────────────────────
FROM node:20-bookworm-slim AS builder

WORKDIR /app

# Install deps first (cache layer)
COPY backend/package*.json ./backend/
RUN cd backend && npm ci

COPY frontend/package*.json ./frontend/
RUN cd frontend && npm ci

# Copy source and build
COPY backend/ ./backend/
COPY frontend/ ./frontend/

RUN cd frontend && npm run build
RUN cd backend && npm run build && npm prune --omit=dev

# ── Runtime stage ──────────────────────────────────────────────────────────────
FROM node:20-bookworm-slim

# Install ffmpeg and download yt-dlp binary
RUN apt-get update && apt-get install -y --no-install-recommends \
      ffmpeg \
      curl \
    && rm -rf /var/lib/apt/lists/* \
    && curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp \
         -o /usr/local/bin/yt-dlp \
    && chmod +x /usr/local/bin/yt-dlp

WORKDIR /app

COPY --from=builder /app/backend/dist       ./backend/dist
COPY --from=builder /app/backend/node_modules ./backend/node_modules
COPY --from=builder /app/frontend/dist      ./frontend/dist

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

CMD ["node", "backend/dist/index.js"]
