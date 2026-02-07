# API Documentation

## Base URL

- **Local:** `http://localhost:3001`
- **Production:** Set via `API_URL` / your deployment URL

## Authentication

Most project-scoped endpoints require a valid JWT.

- **Login:** `POST /api/auth/login` with credentials; returns a token.
- **Header:** `Authorization: Bearer <token>`
- **Supabase:** The backend validates Supabase JWTs for authenticated requests.

## Health

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Simple liveness: `{ "status": "ok", "timestamp", "uptime" }` |
| GET | `/health/detailed` | DB, Redis, and external service status |
| GET | `/health/metrics` | Request/error rates, queue and agent metrics |
| GET | `/health/system` | Uptime, memory, CPU, Node version |

## Projects

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/projects` | List projects (authenticated) |
| GET | `/api/projects/:id` | Get project by ID |
| POST | `/api/projects` | Create project |
| PATCH | `/api/projects/:id` | Update project |
| DELETE | `/api/projects/:id` | Delete project |

## Pages

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/projects/:projectId/pages` | List pages (pagination, filter, sort) |
| GET | `/api/projects/:projectId/pages/:pageId` | Get page details |
| POST | `/api/projects/:projectId/pages` | Create page |
| PATCH | `/api/projects/:projectId/pages/:pageId` | Update page |
| DELETE | `/api/projects/:projectId/pages/:pageId` | Soft delete (archived) |
| GET | `/api/projects/:projectId/pages/:pageId/preview` | HTML preview |
| POST | `/api/projects/:projectId/pages/:pageId/publish` | Publish to WordPress |
| PATCH | `/api/projects/:projectId/pages/:pageId/elementor` | Update Elementor data |

## Agent Runs

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/projects/:projectId/agent-runs` | List runs (filter, paginate) |
| GET | `/api/projects/:projectId/agent-runs/:runId` | Get run details |
| POST | `/api/projects/:projectId/agent-runs/:runId/retry` | Retry failed run |
| GET | `/api/projects/:projectId/agent-runs/queue-status` | Pending/running jobs |
| POST | `/api/projects/:projectId/agent-runs/:runId/cancel` | Cancel running job |
| GET | `/api/projects/:projectId/agent-runs/stats` | Agent performance stats |

## Rankings

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/projects/:projectId/rankings` | List keywords (filter, sort) |
| GET | `/api/projects/:projectId/rankings/top` | Top 10 keywords |
| GET | `/api/projects/:projectId/rankings/:keywordId/history` | 90-day history |
| POST | `/api/projects/:projectId/rankings/sync` | Trigger GSC sync |
| GET | `/api/projects/:projectId/rankings/insights` | Gaining/losing/new keywords |

## Leads

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/projects/:projectId/leads` | List leads (filter, date range, paginate) |
| GET | `/api/projects/:projectId/leads/:leadId` | Get lead |
| POST | `/api/projects/:projectId/leads` | Create lead |
| PATCH | `/api/projects/:projectId/leads/:leadId` | Update status/notes |
| DELETE | `/api/projects/:projectId/leads/:leadId` | Delete lead |
| GET | `/api/projects/:projectId/leads/export` | Export CSV/JSON |
| GET | `/api/projects/:projectId/leads/stats` | Lead statistics |

## Webhooks

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/webhooks/leads` | Inbound lead (HMAC validated) |
| POST | `/api/webhooks/page-publish` | Page publish notification |
| GET | `/api/projects/:projectId/webhooks` | List webhooks |
| POST | `/api/projects/:projectId/webhooks` | Register webhook |
| PATCH | `/api/projects/:projectId/webhooks/:webhookId` | Update webhook |
| DELETE | `/api/projects/:projectId/webhooks/:webhookId` | Delete webhook |
| GET | `/api/projects/:projectId/webhooks/:webhookId/logs` | Delivery logs |

## Analytics

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/projects/:projectId/analytics/overview` | Dashboard overview |
| GET | `/api/projects/:projectId/analytics/traffic` | Traffic (impressions, clicks, CTR) |
| GET | `/api/projects/:projectId/analytics/keywords` | Keyword performance |
| GET | `/api/projects/:projectId/analytics/pages` | Page performance |

## Request/Response

- **Content-Type:** `application/json` for request bodies and JSON responses.
- **Errors:** JSON body with `statusCode`, `error`, and optional `message` and `details`.
- **Pagination:** List endpoints use `limit` and `offset` (or equivalent); responses include counts where applicable.

## Rate Limits

- Default: 100 requests per 15 minutes per IP (configurable in production).
- Exceeded: `429 Too Many Requests`.

## Error Codes

- `400` – Bad request (validation, invalid input).
- `401` – Unauthorized (missing or invalid token).
- `403` – Forbidden (no access to resource).
- `404` – Not found.
- `429` – Rate limit exceeded.
- `500` – Server error (check logs and health endpoints).
