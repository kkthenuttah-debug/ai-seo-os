# Deployment Guide

## Prerequisites

- Node.js 20+
- npm or bun
- Redis (for queues)
- Supabase project (database and auth)
- Google Cloud project (Gemini API, optional GSC OAuth)

## Environment Variables

Copy `.env.example` to `.env` and set:

| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | Yes | `development` or `production` |
| `PORT` | Backend | Server port (default 3001) |
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_ANON_KEY` | Yes | Supabase anon key |
| `SUPABASE_SERVICE_KEY` | Yes | Supabase service role key |
| `REDIS_URL` | Yes (queues) | e.g. `redis://localhost:6379` |
| `GEMINI_API_KEY` | Yes | Google AI Studio / Gemini API key |
| `GOOGLE_CLIENT_ID` | GSC | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | GSC | Google OAuth client secret |
| `JWT_SECRET` | Yes | Secret for JWT signing |
| `FRONTEND_URL` | Yes | Frontend origin (CORS) |
| `API_URL` | Yes | Public backend URL (for redirects, webhooks) |
| `VITE_API_URL` | Frontend | Backend URL (baked at build time) |

See `.env.example` for the full list.

## Local Setup

### Without Docker

1. **Clone and install**
   ```bash
   git clone <repo>
   cd ai-seo-os
   npm install
   cd server && npm install && cd ..
   ```

2. **Environment**
   - Copy `.env.example` to `.env` (root and/or `server/.env`).
   - Fill Supabase, Redis, Gemini, and OAuth values.

3. **Redis**
   ```bash
   # macOS
   brew install redis && redis-server
   # Windows: use Redis from WSL or a Windows build
   ```

4. **Run**
   - Backend: `cd server && npm run dev`
   - Frontend: `npm run dev`
   - Workers (optional): `cd server && npm run worker`

5. **Migrations**
   - Supabase migrations are in `supabase/migrations/`. Apply via Supabase dashboard or CLI.

### With Docker

1. **Environment**
   - Create `.env` from `.env.example` with real values for Supabase, Gemini, Google, JWT.

2. **Build and run**
   ```bash
   docker-compose up -d
   ```
   - Frontend: http://localhost:3000
   - Backend: http://localhost:3001
   - Redis: internal only (port 6379 exposed for local debugging if needed)

3. **Health**
   - Backend: `GET http://localhost:3001/health`
   - Use `/health/detailed` to verify DB and Redis.

## Cloud Deployment

### Frontend (Vercel)

1. Connect the repo to Vercel.
2. **Build settings**
   - Build command: `npm run build`
   - Output directory: `dist`
   - Install command: `npm install`
3. **Environment**
   - `VITE_API_URL`: your backend API URL (e.g. `https://api.yourdomain.com`).
4. Deploy; Vercel will use `vercel.json` for rewrites and cache headers.

### Backend (Railway or Render)

1. **Build**
   - Use `server/Dockerfile` or build with `npm run build` in `server/`.
   - Start: `node dist/index.js` (or `npm start`).

2. **Environment**
   - Set all variables from “Environment Variables” above.
   - `REDIS_URL`: use a managed Redis (Railway, Render, Upstash, etc.).
   - `FRONTEND_URL`: your Vercel (or frontend) URL.
   - `API_URL`: public URL of this backend.

3. **Health check**
   - Path: `/health`
   - Interval: 30s; timeout: 10s.

4. **Scaling**
   - Run one or more API instances behind a load balancer.
   - Run workers on a separate process or service (same codebase, `npm run worker`).

### Database and Redis

- **Database:** Supabase (hosted). Run migrations before first deploy.
- **Redis:** Use a managed service; enable persistence if you need queue durability.
- **Backups:** Rely on Supabase backups; optionally export Redis if you store critical state there.

## GitHub Actions CI/CD

- **Tests:** `.github/workflows/test.yml` runs on push/PR (lint, typecheck, test).
- **Deploy:** `.github/workflows/deploy.yml` runs on push to `main`:
  - Backend: Railway (set `RAILWAY_TOKEN`, `RAILWAY_PROJECT_ID`).
  - Frontend: Vercel (set `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`).

Remove `continue-on-error` in the deploy workflow once secrets are set.

## Monitoring

- **Health:** Use `/health` and `/health/detailed` for uptime checks and status.
- **Logs:** Backend uses Winston; in production use JSON logging and ship to your log aggregator.
- **Errors:** Use `/health/metrics` and your error-tracking service (e.g. Sentry) for alerts.

## Graceful Shutdown

The server handles `SIGTERM` and `SIGINT`: it stops accepting new requests and exits. Ensure your process manager (Docker, systemd, Railway, Render) sends SIGTERM and allows a short drain period (e.g. 10–30s) before SIGKILL.
