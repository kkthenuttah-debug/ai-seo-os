# API Routes Implementation Summary

This document summarizes all the API routes and services implemented for the AI SEO automation platform.

## Implemented Routes

### 1. Pages Routes (`/server/src/routes/pages.ts`)
- `GET /api/projects/:projectId/pages` - List pages with pagination, filtering, and sorting
- `GET /api/projects/:projectId/pages/:pageId` - Get page details with full content and metadata
- `POST /api/projects/:projectId/pages` - Create new page with title, slug, and optional content
- `PATCH /api/projects/:projectId/pages/:pageId` - Update page fields (title, slug, content, status, metadata)
- `DELETE /api/projects/:projectId/pages/:pageId` - Soft delete page (set status to archived)
- `GET /api/projects/:projectId/pages/:pageId/preview` - Get HTML preview of page with Elementor data
- `POST /api/projects/:projectId/pages/:pageId/publish` - Publish page to WordPress
- `PATCH /api/projects/:projectId/pages/:pageId/elementor` - Update Elementor layout data with validation

### 2. Agent Runs Routes (`/server/src/routes/agents.ts`)
- `GET /api/projects/:projectId/agent-runs` - List all agent runs with filtering and pagination
- `GET /api/projects/:projectId/agent-runs/:runId` - Get specific agent run details with full input/output
- `POST /api/projects/:projectId/agent-runs/:runId/retry` - Retry failed agent run with new job
- `GET /api/projects/:projectId/agent-runs/queue-status` - Get queue status with pending/running jobs
- `POST /api/projects/:projectId/agent-runs/:runId/cancel` - Cancel running job and mark as cancelled
- `GET /api/projects/:projectId/agent-runs/stats` - Get agent performance statistics by type

### 3. Rankings Routes (`/server/src/routes/rankings.ts`)
- `GET /api/projects/:projectId/rankings` - List tracked keywords with filtering and sorting
- `GET /api/projects/:projectId/rankings/top` - Get top 10 performing keywords by position/volume
- `GET /api/projects/:projectId/rankings/:keywordId/history` - Get 90-day position history for keyword
- `POST /api/projects/:projectId/rankings/sync` - Manual trigger of GSC data sync
- `GET /api/projects/:projectId/rankings/insights` - Get ranking insights (gaining, losing, new, opportunities)

### 4. Leads Routes (`/server/src/routes/leads.ts`)
- `GET /api/projects/:projectId/leads` - List leads with filtering, date range, and pagination
- `GET /api/projects/:projectId/leads/:leadId` - Get lead details with source page info
- `POST /api/projects/:projectId/leads` - Create lead manually with email, name, phone, message
- `PATCH /api/projects/:projectId/leads/:leadId` - Update lead status and notes
- `DELETE /api/projects/:projectId/leads/:leadId` - Delete lead
- `GET /api/projects/:projectId/leads/export` - Export leads as CSV or JSON
- `GET /api/projects/:projectId/leads/stats` - Get lead statistics (totals, conversion metrics)

### 5. Webhooks Routes (`/server/src/routes/webhooks.ts`) - Updated
Public Endpoints:
- `POST /api/webhooks/leads` - Receive lead submission with HMAC validation
- `POST /api/webhooks/page-publish` - Notify when page published with signature validation

Project Endpoints (Authenticated):
- `POST /api/projects/:projectId/webhooks` - Register webhook with URL and events
- `GET /api/projects/:projectId/webhooks` - List webhooks for project
- `PATCH /api/projects/:projectId/webhooks/:webhookId` - Update webhook URL, events, active status
- `DELETE /api/projects/:projectId/webhooks/:webhookId` - Delete webhook
- `GET /api/projects/:projectId/webhooks/:webhookId/logs` - Get webhook delivery logs

### 6. Analytics Routes (`/server/src/routes/analytics.ts`)
- `GET /api/projects/:projectId/analytics/overview` - Dashboard overview with aggregated stats
- `GET /api/projects/:projectId/analytics/traffic` - Traffic analytics (impressions, clicks, CTR, position trends)
- `GET /api/projects/:projectId/analytics/keywords` - Keyword performance analytics
- `GET /api/projects/:projectId/analytics/pages` - Page performance analytics with keyword matrix

### 7. Health Routes (`/server/src/routes/health.ts`)
- `GET /health` - Simple health check
- `GET /health/detailed` - Detailed health check (database, Redis, Supabase auth, external APIs)
- `GET /health/metrics` - Current metrics (request rates, error rates, queue status, agent success)
- `GET /health/metrics/agents` - Agent performance metrics
- `GET /health/metrics/apis` - API endpoint metrics
- `GET /health/metrics/queues` - Queue job metrics
- `GET /health/system` - System health (uptime, memory, CPU, Node version)

## Implemented Services

### 1. Metrics Collector (`/server/src/services/metricsCollector.ts`)
- `recordAgentExecution()` - Track agent execution duration and success/failure
- `recordApiCall()` - Track API calls with status codes and response times
- `recordQueueJob()` - Track queue job success/failure/retry
- `recordWordPressCall()` - Track WordPress API operations
- `recordGSCCall()` - Track Google Search Console API calls
- `getAgentMetrics()` - Get metrics for specific agent type
- `getAllAgentMetrics()` - Get all agent metrics
- `getApiMetrics()` - Get metrics for specific route or all routes
- `getAllApiMetrics()` - Get all API metrics
- `getQueueMetrics()` - Get metrics for specific queue
- `getAllQueueMetrics()` - Get all queue metrics
- `getSystemHealth()` - Get system health metrics
- `reset()` - Clear all metrics

### 2. Error Tracking (`/server/src/services/errorTracking.ts`)
- `trackError()` - Track errors with context and persist to database
- `trackAgentFailure()` - Track agent-specific failures with input data
- `getErrorStats()` - Get error statistics grouped by type, route, project
- `getRecentErrors()` - Get most recent errors
- `getAgentFailureStats()` - Get failure statistics by agent type
- `clearErrors()` - Clear in-memory error logs

### 3. Monitoring Service (`/server/src/services/monitoring.ts`)
- `getDetailedHealth()` - Check health of database, Redis, Supabase, and external APIs
- `getAggregatedMetrics()` - Aggregate metrics from all sources
- `getPerformanceMetrics()` - Calculate request rate, error rate, response times
- `getProjectHealth()` - Get project-specific health metrics
- Implements `MetricsCollector` interface for recording metrics

## Implemented Middleware

### 1. Request Logger (`/server/src/middleware/requestLogger.ts`)
- Adds correlation ID to requests (from header or generated)
- Logs request start/completion with timing
- Adds correlation ID to response headers
- Tracks request method, URL, user agent

### 2. Metrics Recorder (`/server/src/middleware/metricsRecorder.ts`)
- Records API call metrics on every request
- Tracks route, method, status code, and duration
- Integrates with metrics collector service

### 3. Error Handler (`/server/src/middleware/errorHandler.ts`) - Updated
- Enhanced to integrate with error tracking service
- Tracks errors with context (route, method, projectId)
- Skips tracking for 404s and validation errors
- Returns consistent error response format with correlation ID

## Database Types Updated

### Webhooks Table (`/server/src/types/database.ts`)
Added `Webhook` interface and types:
- `id`, `project_id`, `url`, `events`, `secret`, `active`, `last_triggered_at`
- `WebhookInsert`, `WebhookUpdate` types
- Added to `Database['public']['Tables']` interface

## Features Implemented

### Consistent API Response Format
- All list endpoints return `{ data/[], total, limit, offset }` pagination format
- Error responses include `{ code, message, statusCode, correlationId, details? }`
- Success responses include relevant data and metadata

### Query Parameter Validation
- All endpoints use Zod schemas for validation
- Pagination params (limit, offset) with sensible defaults
- Filter params (status, search, dateRange, etc.)
- Sort params with validation

### Pagination Support
- All list endpoints support `limit` and `offset` parameters
- Default limits (20-50) with max limits (100)
- Returns total count for frontend pagination

### Error Response with Error Codes
- Custom error types (AuthError, ValidationError, NotFoundError, ConflictError, RateLimitError)
- Consistent error codes across all endpoints
- Detailed error messages for client-side handling

### Performance Metrics Collection
- Request/response timing tracking
- Agent execution metrics
- Queue job tracking
- Success/failure rates

### Health Check Endpoints
- Simple liveness check (`/health`)
- Detailed service health (`/health/detailed`)
- Current metrics (`/health/metrics`)
- Granular metrics by component (agents, apis, queues, system)

### Graceful Error Handling
- Try-catch blocks around database operations
- Validation errors with clear messages
- Proper HTTP status codes (400, 401, 404, 409, 429, 500)

### Idempotent Operations
- DELETE operations use soft delete where appropriate
- Retry operations create new runs instead of modifying existing
- Update operations only modify specified fields

## Usage Examples

### List Pages with Filters
```
GET /api/projects/abc123/pages?status=published&search=seo&limit=10&offset=0&sort=updated_at
```

### Get Ranking History
```
GET /api/projects/abc123/rankings/xyz789/history
```

### Sync GSC Data
```
POST /api/projects/abc123/rankings/sync
```

### Export Leads
```
GET /api/projects/abc123/leads/export?dateRange=month&status=converted&format=csv
```

### Get Analytics Overview
```
GET /api/projects/abc123/analytics/overview
```

### Check Health
```
GET /health/detailed
```

## Integration Points

All routes integrate with:
- **Supabase** - Database operations via `supabaseAdmin`
- **Authentication** - `authenticate` and `verifyProjectOwnership` middleware
- **Validation** - Zod schemas for request/response validation
- **Error Handling** - Custom error classes with tracking
- **Metrics** - MetricsCollector for performance tracking
- **Logging** - Structured logger with correlation IDs

## Future Enhancements

1. Add real-time metrics via WebSocket
2. Implement webhook retry logic with exponential backoff
3. Add rate limiting per project/user
4. Implement caching for expensive analytics queries
5. Add CSV streaming for large exports
6. Implement batch operations for leads/rankings
7. Add webhook signature verification helpers
8. Implement metric aggregation jobs for historical data
