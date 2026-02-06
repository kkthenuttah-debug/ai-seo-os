# BullMQ Queue System

This directory contains the BullMQ-based queue system for agent orchestration in the AI SEO OS platform.

## Architecture

### Queue Types

1. **agent-tasks** - Main queue for agent execution jobs
2. **build** - Page building and Elementor layout generation
3. **publish** - WordPress publishing operations
4. **monitor** - GSC monitoring and analysis
5. **optimize** - Continuous optimization loops
6. **webhooks** - Webhook delivery management

### Directory Structure

```
queues/
├── config.ts           # Queue configuration and Redis connection
├── index.ts           # Main exports and queue initialization
├── agentTaskQueue.ts  # Agent task queue implementation
└── webhookQueue.ts    # Webhook queue implementation
```

## Configuration

Queue configuration is managed via environment variables:

```bash
# Redis Configuration
REDIS_URL=redis://localhost:6379

# Worker Concurrency
AGENT_TASKS_CONCURRENCY=3
BUILD_CONCURRENCY=2
PUBLISH_CONCURRENCY=1
MONITOR_CONCURRENCY=3
OPTIMIZE_CONCURRENCY=2
WEBHOOKS_CONCURRENCY=5

# Retry Configuration
RETRY_ATTEMPTS=3
RETRY_DELAY_MS=1000
LOCK_DURATION_MS=30000
```

## Usage

### Starting Workers

Start all workers:

```bash
npm run worker
```

Or start individual workers:

```bash
tsx src/workers/agent-task.worker.ts
tsx src/workers/build-worker.ts
tsx src/workers/publish-worker.ts
tsx src/workers/monitor-worker.ts
tsx src/workers/optimize-worker.ts
```

### Scheduling Jobs

```typescript
import {
  scheduleAgentTask,
  scheduleBuildJob,
  schedulePublishJob,
  scheduleMonitorJob,
  scheduleOptimizeJob,
  scheduleWebhook,
} from './queues/index.js';

// Schedule an agent task
await scheduleAgentTask({
  project_id: projectId,
  agent_type: 'market_research',
  input: { niche: 'example', target_audience: 'developers' },
  correlation_id: 'unique-id-123',
});

// Schedule a build job
await scheduleBuildJob({
  project_id: projectId,
  phase: 'architecture',
});

// Schedule a publish job
await schedulePublishJob({
  project_id: projectId,
  page_id: pageId,
});

// Schedule monitoring
await scheduleMonitorJob({
  project_id: projectId,
});

// Schedule optimization
await scheduleOptimizeJob({
  project_id: projectId,
  page_id: pageId,
  reason: 'performance_drop',
});

// Schedule webhook delivery
await scheduleWebhook({
  project_id: projectId,
  webhook_type: 'wordpress_publish',
  url: 'https://example.com/webhook',
  payload: { event: 'published' },
  correlation_id: 'unique-id-456',
});
```

### Queue Management

```typescript
import {
  getAllQueueStats,
  pauseAllQueues,
  resumeAllQueues,
  cleanAllQueues,
  checkQueuesHealth,
} from './queues/index.js';

// Get queue statistics
const stats = await getAllQueueStats();
console.log(stats);

// Pause all queues
await pauseAllQueues();

// Resume all queues
await resumeAllQueues();

// Clean old jobs
await cleanAllQueues();

// Health check
const health = await checkQueuesHealth();
console.log(health);
```

### Job Orchestration

```typescript
import {
  startAutomationLoop,
  scheduleContentBuilding,
  schedulePublishing,
  startMonitoringLoop,
  scheduleOptimization,
} from './services/jobOrchestrator.js';

// Start full automation loop
await startAutomationLoop(projectId);

// Schedule content building for pages
await scheduleContentBuilding(projectId, pageIds);

// Schedule publishing for pages
await schedulePublishing(projectId, pageIds);

// Start monitoring loop
await startMonitoringLoop(projectId);

// Schedule optimization
await scheduleOptimization(projectId, pageId, 'manual');
```

## Job Flow

### Automation Loop

1. **Market Research Agent** (`agent-tasks`)
   - Analyzes niche and target audience
   - Identifies keyword opportunities
   - On complete → Site Architect Agent

2. **Site Architect Agent** (`agent-tasks`)
   - Designs site structure
   - Creates page hierarchy
   - On complete → Build Queue (content phase)

3. **Content Builder Phase** (`build`)
   - Generates content for all pages
   - Creates internal linking structure
   - On complete → Page Builder Agents

4. **Page Builder Agents** (`agent-tasks`)
   - Builds content for individual pages
   - Generates Elementor layouts
   - On complete → Publish Queue

5. **Publish Queue** (`publish`)
   - Publishes pages to WordPress
   - Submits URLs for GSC indexing
   - On complete → Monitor Queue

6. **Monitor Queue** (`monitor`)
   - Runs GSC analysis
   - Tracks rankings and performance
   - On complete → Optimize Queue (if needed)
   - Recurring every 24 hours

7. **Optimize Queue** (`optimize`)
   - Analyzes performance data
   - Generates optimization recommendations
   - Applies content updates
   - On complete → Publish Queue (if changes)

### Error Handling

- **Exponential Backoff**: 1s, 5s, 30s delays
- **Retry Attempts**: 3-10 depending on queue type
- **Dead-letter Queue**: Failed jobs retained for analysis
- **Error Logging**: All errors logged to agent_runs table
- **Project Status**: Critical failures update project status to 'error'

### Priority Levels

Jobs can be prioritized:

```typescript
import { JOB_PRIORITIES } from './types/queue.js';

await scheduleAgentTask({
  project_id: projectId,
  agent_type: 'market_research',
  input: {...},
  correlation_id: '...',
}, {
  priority: JOB_PRIORITIES.HIGH,  // 10
  // or
  priority: JOB_PRIORITIES.MEDIUM, // 5
  // or
  priority: JOB_PRIORITIES.LOW,    // 1
});
```

## Monitoring

### Queue Metrics

Access queue metrics via the Queue Manager:

```typescript
import { getQueueMetrics, healthCheck } from './services/queueManager.js';

const metrics = await getQueueMetrics();
console.log('Queue metrics:', metrics.queues);
console.log('Worker metrics:', metrics.workers);

const health = await healthCheck();
console.log('System healthy:', health.healthy);
```

### Health Checks

System health checks verify:

- No queues have excessive failures (> 10% failure rate)
- All workers are running (if registered)
- Redis connection is active
- Job processing is not stalled

## Graceful Shutdown

The system supports graceful shutdown:

```typescript
import { gracefulShutdown } from './services/queueManager.js';

// Waits for active jobs to complete (30s timeout)
await gracefulShutdown();
```

The worker process automatically handles SIGTERM and SIGINT signals.

## Job Correlation

All jobs include a `correlation_id` for distributed tracing:

```typescript
const correlationId = `build-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

await scheduleAgentTask({
  project_id: projectId,
  agent_type: 'market_research',
  input: {...},
  correlation_id: correlationId,
});
```

Use the same `correlation_id` across related jobs to trace workflows.

## Concurrency Management

Each queue has configurable concurrency limits:

- **agent-tasks**: 3 concurrent agents
- **build**: 2 concurrent builds
- **publish**: 1 concurrent publish (rate limit avoidance)
- **monitor**: 3 concurrent monitors
- **optimize**: 2 concurrent optimizations
- **webhooks**: 5 concurrent webhooks

Rate limiting is also applied:

- **build**: 10 jobs/minute
- **publish**: 5 jobs/minute
- **webhooks**: 20 jobs/minute
- **Others**: 10 jobs/minute

## Job Cleanup

Old jobs are automatically cleaned:

- **Completed jobs**: Removed after 24 hours (max 100 per queue)
- **Failed jobs**: Removed after 7 days (max 500 per queue)

Manual cleanup:

```typescript
import { cleanAllQueues } from './queues/index.js';

await cleanAllQueues();
```

## Troubleshooting

### Jobs Not Processing

1. Check Redis connection
2. Verify workers are running
3. Check queue is not paused
4. Review worker logs for errors

### High Failure Rate

1. Check agent error logs in `agent_runs` table
2. Verify integration credentials (WordPress, GSC)
3. Check API rate limits
4. Review Redis memory usage

### Stuck Jobs

1. Check for stalled jobs in queue metrics
2. Restart workers
3. Manually drain queue if needed

```typescript
import { drainAgentTaskQueue } from './queues/agentTaskQueue.js';

await drainAgentTaskQueue();
```

## API Endpoints

Manage queues via REST API:

```
POST   /api/projects/:projectId/start-loop   - Start automation
POST   /api/projects/:projectId/pause       - Pause automation
GET    /api/queues/stats                   - Queue statistics
GET    /api/queues/health                  - Health check
POST   /api/queues/pause                  - Pause queues
POST   /api/queues/resume                 - Resume queues
POST   /api/queues/clean                  - Clean old jobs
```

## Notes

- All job data uses snake_case naming convention
- Queue names are lowercase with hyphens
- Worker processes should be run with proper process managers (PM2, systemd)
- Monitor Redis memory usage in production
- Configure Redis persistence for job durability
