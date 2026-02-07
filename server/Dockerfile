# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY server/package.json server/package-lock.json* ./
RUN npm ci

# Copy source
COPY server/tsconfig.json ./
COPY server/src ./src

# Build TypeScript
RUN npm run build

# Production image
FROM node:20-alpine

WORKDIR /app

# Install production dependencies only
COPY server/package.json server/package-lock.json* ./
RUN npm ci --omit=dev

# Copy built code from builder
COPY --from=builder /app/dist ./dist

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => { let d = ''; r.on('data', c => d += c); r.on('end', () => { if (r.statusCode !== 200) throw new Error(String(r.statusCode)); try { const j = JSON.parse(d); if (j.status !== 'ok') throw new Error(j.status); } catch (_) { throw new Error('unhealthy'); } }); }).on('error', e => { process.exit(1); });"

EXPOSE 3000

CMD ["node", "dist/index.js"]
