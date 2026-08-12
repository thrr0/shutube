# ── Build ─────────────────────────────────────────────────────────────────────
FROM node:20-bookworm-slim AS builder

WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci
COPY backend/ ./
RUN npm run build && npm prune --omit=dev

# ── Runtime ───────────────────────────────────────────────────────────────────
FROM node:20-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
      ffmpeg \
      curl \
    && rm -rf /var/lib/apt/lists/* \
    && curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp \
         -o /usr/local/bin/yt-dlp \
    && chmod +x /usr/local/bin/yt-dlp

WORKDIR /app/backend
COPY --from=builder /app/backend/dist        ./dist
COPY --from=builder /app/backend/node_modules ./node_modules

ENV NODE_ENV=production

EXPOSE 3001

CMD ["node", "dist/index.js"]
