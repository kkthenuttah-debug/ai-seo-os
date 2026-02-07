# Architecture Overview

## System Design

AI SEO OS is a full-stack application for SEO automation: content generation, rankings tracking, lead capture, and WordPress publishing. The system uses an agent-based architecture for AI tasks and queues for background jobs.

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Frontend      │     │   Backend API    │     │   Workers       │
│   (Vite/React)  │────▶│   (Fastify)      │────▶│   (BullMQ)      │
│   Port 5173     │     │   Port 3001      │     │   Agent tasks   │
└─────────────────┘     └────────┬────────┘     └────────┬────────┘
                                 │                       │
                    ┌────────────┼────────────┐          │
                    ▼            ▼            ▼          ▼
             ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
             │ Supabase │ │  Redis   │ │ Gemini   │ │ WordPress│
             │ (DB/Auth)│ │ (Queues) │ │   API    │ │   API    │
             └──────────┘ └──────────┘ └──────────┘ └──────────┘
```

## Service Descriptions

### Frontend
- **Stack:** React 18, Vite 6, Tailwind CSS, React Router, TanStack Query
- **Role:** Dashboard, project management, pages, rankings, leads, integrations, agent runs
- **API:** Proxies `/api` to backend in development; uses `VITE_API_URL` in production

### Backend API
- **Stack:** Fastify, TypeScript, Zod
- **Role:** REST API, auth (JWT + Supabase), projects, pages, agents, rankings, leads, webhooks, analytics, health
- **Key routes:** `/api/*` for app; `/health` for liveness/readiness

### Workers
- **Stack:** BullMQ, Redis, tsx
- **Role:** Agent task execution (build, optimize, publish, monitor), webhook delivery, GSC sync
- **Process:** `npm run worker` in `server/`

### Data Flow
1. User actions in the UI call the backend API.
2. Mutations that trigger long work (e.g. “run agent”, “publish”) enqueue jobs to Redis.
3. Workers pick up jobs, call Gemini and other services, update Supabase via the API or direct client.
4. Frontend polls or refetches to show updated state.

## Agent System

- **Registry:** All agents are registered in `server/src/agents/registry.ts`.
- **Base:** `BaseAgent` provides run tracking, Zod validation, and error handling.
- **Orchestrator:** Runs multiple agents in sequence or parallel for workflows.
- **Router:** `geminiRouter` selects strategy vs execution model and handles retries.
- **Execution:** Agents are invoked by workers; results are stored and exposed via `/api/projects/:id/agent-runs`.

See [AGENT_DEVELOPMENT.md](./AGENT_DEVELOPMENT.md) for adding new agents.

## Queue Architecture

- **Queues:** Agent tasks, webhooks, and (optionally) GSC sync.
- **Redis:** Required for BullMQ; single instance in Docker, scalable in production.
- **Workers:** Long-running Node processes that run job handlers; scale by adding more worker processes.

## Integration Patterns

- **Supabase:** Auth (JWT), Postgres (projects, pages, rankings, leads, etc.).
- **Google:** Search Console (rankings, analytics), OAuth for GSC.
- **WordPress:** REST API for publishing pages and syncing content.
- **Webhooks:** Outbound HTTP calls with HMAC signing; configurable per project.

## Configuration

- **Development:** `server/src/lib/config.development.ts` (verbose logging, relaxed limits).
- **Production:** `server/src/lib/config.production.ts` (stricter limits, reduced logging).
- **Environment:** All secrets and URLs via env vars; see `.env.example` and [DEPLOYMENT.md](./DEPLOYMENT.md).
