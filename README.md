# AI SEO OS

Automated SEO platform: AI-powered content generation, rankings tracking, lead capture, and WordPress publishing.

## Features Overview

- **Projects & pages** – Manage sites, create and edit pages with rich content and Elementor-style layout
- **AI agents** – Market research, site architecture, content building, technical SEO, optimization, publishing (Gemini)
- **Rankings** – Sync with Google Search Console, track keywords, history and insights
- **Leads** – Capture, filter, export; optional webhooks for form submissions
- **Analytics** – Traffic, keywords, and page performance from GSC
- **Integrations** – WordPress REST API, GSC OAuth, configurable webhooks
- **Queue workers** – Background jobs for agent runs, publish, and sync

## Tech Stack

| Layer      | Stack |
|-----------|--------|
| Frontend  | React 18, Vite 6, Tailwind CSS, React Router, TanStack Query |
| Backend   | Fastify, TypeScript, Zod |
| Database  | Supabase (Postgres + Auth) |
| Queues    | BullMQ, Redis |
| AI        | Google Gemini API |

## Quick Start (Local Development)

1. **Clone and install**
   ```bash
   git clone <repo-url>
   cd ai-seo-os
   npm install
   cd server && npm install && cd ..
   ```

2. **Environment**
   ```bash
   cp .env.example .env
   # Edit .env: SUPABASE_*, GEMINI_API_KEY, REDIS_URL, JWT_SECRET, etc.
   ```

3. **Redis** (required for queues)
   ```bash
   # macOS: brew install redis && redis-server
   # Windows: use WSL or a Redis build
   ```

4. **Run**
   - Backend: `cd server && npm run dev` (API on http://localhost:3001)
   - Frontend: `npm run dev` (app on http://localhost:5173)
   - Workers: `cd server && npm run worker` (optional)

## Docker

```bash
cp .env.example .env
# Fill in Supabase, Gemini, Google, JWT in .env

docker-compose up -d
# Frontend: http://localhost:3000
# Backend:  http://localhost:3001
```

## Deployment

- **Frontend:** Vercel – connect repo, set `VITE_API_URL`, build command `npm run build`, output `dist`. See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).
- **Backend:** Railway or Render – use `server/Dockerfile` or `npm run build` + `node dist/index.js`; set env vars and health check `/health`. Run workers separately.
- **CI/CD:** GitHub Actions in `.github/workflows/` (lint/test on push and PR; deploy on push to `main` when secrets are set).

## Documentation

| Doc | Description |
|-----|-------------|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design, services, data flow, agents, queues |
| [docs/API_DOCUMENTATION.md](docs/API_DOCUMENTATION.md) | Auth, endpoints, request/response, errors, rate limits |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Env vars, local/Docker/cloud, health, monitoring |
| [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) | Dev setup, code style, testing, PR process |
| [docs/AGENT_DEVELOPMENT.md](docs/AGENT_DEVELOPMENT.md) | How to add and test new AI agents |
| [API_ROUTES_SUMMARY.md](API_ROUTES_SUMMARY.md) | Route list and service summary |

## Project Structure

```
.
├── src/                 # Frontend (React, Vite)
├── server/              # Backend API and workers
│   ├── src/
│   │   ├── agents/      # AI agents (Gemini)
│   │   ├── routes/     # API routes
│   │   ├── services/   # Business logic
│   │   ├── queues/     # BullMQ queues
│   │   └── workers/    # Job handlers
│   └── Dockerfile
├── docs/                # Architecture, API, deployment, contributing
├── scripts/             # setup, migrate, seed
├── docker-compose.yml
├── Dockerfile           # Frontend
└── .env.example
```

## Contributing

See [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) for setup, code style, testing, and pull request process.

## Support

Open an issue for bugs or feature requests. For deployment and configuration, refer to [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).
