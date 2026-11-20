# درمانگر - Dockerfile (Multi-stage build)
# Next.js + WebSocket در یک container

# ============ Stage 1: Dependencies ============
FROM node:20-slim AS deps
WORKDIR /app

# نصب bun
RUN npm install -g bun

# کپی فایل‌های package و نصب وابستگی‌ها
COPY package.json bun.lock* ./
COPY mini-services/darmanegar-ws/package.json ./mini-services/darmanegar-ws/

RUN bun install --frozen-lockfile || bun install
RUN cd mini-services/darmanegar-ws && (bun install --frozen-lockfile || bun install)

# ============ Stage 2: Build ============
FROM node:20-slim AS builder
WORKDIR /app

RUN npm install -g bun

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/mini-services/darmanegar-ws/node_modules ./mini-services/darmanegar-ws/node_modules
COPY . .

# Build Next.js
ENV NEXT_TELEMETRY_DISABLED=1
RUN bun run build

# ============ Stage 3: Production ============
FROM node:20-slim AS runner
WORKDIR /app

RUN npm install -g bun
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV WS_PORT=3003

# ایجاد user غیر root
RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid nodejs nextjs

# کپی فایل‌های build شده
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# کپی WebSocket service
COPY --from=builder --chown=nextjs:nodejs /app/mini-services ./mini-services

# کپی Prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma

# کپی script runner
COPY --chown=nextjs:nodejs scripts ./scripts
COPY --chown=nextjs:nodejs package.json ./

# ایجاد پوشه‌های لازم
RUN mkdir -p db public/uploads && chown -R nextjs:nodejs db public/uploads

USER nextjs

# Expose ports
EXPOSE 3000 3003

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/ || exit 1

# Start script — هم Next.js و هم WebSocket
COPY --chown=nextjs:nodejs docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

CMD ["./docker-entrypoint.sh"]
