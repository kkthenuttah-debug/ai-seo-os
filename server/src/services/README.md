# Services Documentation

This directory contains service modules for the AI SEO OS platform.

## Services Overview

### Job Orchestrator (`jobOrchestrator.ts`)

Manages automation workflows and job chaining for SEO projects.

#### Main Functions

**startAutomationLoop(projectId)**
- Initiates complete SEO automation workflow
- Enqueues Market Research Agent as first step
- Sets project status to 'building'

**continueAfterMarketResearch(projectId, researchResult)**
- Enqueues Site Architect Agent after research completion
- Passes research data to next phase

**continueAfterSiteArchitecture(projectId, pages)**
- Schedules content building phase
- Enqueues via build queue

**scheduleContentBuilding(projectId, pageIds)**
- Schedules Page Builder Agents for multiple pages
- Runs in parallel across available workers

**schedulePublishing(projectId, pageIds)**
- Schedules WordPress publishing
- Staggered by 30s to avoid rate limits

**startMonitoringLoop(projectId)**
- Initiates recurring GSC monitoring
- Runs every 24 hours
- Sets project status to 'live'

**scheduleOptimization(projectId, pageId, reason)**
- Schedules optimization for a specific page
- Reasons: 'scheduled', 'performance_drop', 'manual'

**scheduleFullRebuild(projectId)**
- Resets and restarts automation loop
- Useful for major project changes

**scheduleTechnicalSEOAudit(projectId)**
- Schedules technical SEO analysis
- Identifies site issues

**scheduleFixer(projectId, issues)**
- Schedules automated fixes for identified issues
- Can auto-fix problems

**pauseProjectAutomation(projectId)**
- Pauses project automation
- Active jobs complete but no new ones scheduled

**resumeProjectAutomation(projectId)**
- Resumes paused project
- Restarts monitoring if applicable

**getAutomationStatus(projectId)**
- Returns current automation state
- Includes recent agent runs

**retryFailedTasks(projectId)**
- Retries all failed agent tasks
- Useful for error recovery

#### Usage Example

```typescript
import {
  startAutomationLoop,
  scheduleContentBuilding,
  schedulePublishing,
  startMonitoringLoop,
} from './services/jobOrchestrator.js';

// Start full automation
await startAutomationLoop(projectId);

// Or schedule specific phases
await scheduleContentBuilding(projectId, ['page-1', 'page-2']);
await schedulePublishing(projectId, ['page-1', 'page-2']);
await startMonitoringLoop(projectId);
```

### Queue Manager (`queueManager.ts`)

Manages queue health, metrics, and lifecycle operations.

#### Main Functions

**getQueueHealth(queueName)**
- Returns health status for a specific queue
- Includes waiting, active, completed, failed counts

**getAllQueuesHealth()**
- Returns health status for all queues

**getWorkerHealth(queueName)**
- Returns worker status and metrics

**getAllWorkersHealth()**
- Returns status for all workers

**getQueueMetrics()**
- Comprehensive metrics for monitoring
- Includes queue and worker statistics

**pauseQueue(queueName)**
- Pauses job processing for a queue
- Active jobs continue

**resumeQueue(queueName)**
- Resumes job processing

**clearQueue(queueName)**
- Removes all jobs from queue
- Warning: Cannot be undone

**gracefulShutdown()**
- Safely shuts down queue system
- Waits for active jobs to complete (30s timeout)

**healthCheck()**
- Returns overall system health
- Checks failure rates and worker status

**setupQueueEventListeners()**
- Sets up event listeners for monitoring
- Tracks job lifecycle events

#### Usage Example

```typescript
import {
  getQueueMetrics,
  healthCheck,
  pauseQueue,
  resumeQueue,
} from './services/queueManager.js';

// Check system health
const health = await healthCheck();
if (!health.healthy) {
  console.log('System unhealthy:', health);
}

// Get detailed metrics
const metrics = await getQueueMetrics();
console.log('Total active jobs:', metrics.queues.active);

// Pause a queue
await pauseQueue('build');

// Resume when ready
await resumeQueue('build');
```

## WordPress Service (`wordpress.ts`)

Handles WordPress REST API interactions.

### Key Features

- Post creation and updates
- Elementor data handling
- Retry logic for network failures
- Rate limit management

## GSC Service (`gsc.ts`)

Manages Google Search Console integration.

### Key Features

- OAuth2 authentication
- Performance data retrieval
- URL indexing submission
- Snapshot storage
- Integration recovery

## Webhooks Service (`webhooks.ts`)

Manages webhook delivery and processing.

### Key Features

- Webhook queue management
- Delivery retry logic
- Signature verification
- IP whitelisting

## Integration Recovery Service (`integrationRecovery.ts`)

Handles integration error recovery and re-authentication.

### Key Features

- Automatic token refresh
- Error detection and logging
- Recovery workflows
- Status monitoring

## Common Patterns

### Error Handling

All services follow consistent error handling:

```typescript
try {
  const result = await someService();
  return result;
} catch (error) {
  logger.error({ error }, 'Service error');
  throw new Error('Operation failed');
}
```

### Logging

Structured logging with context:

```typescript
const log = logger.child({ service: 'myService' });

log.info({ projectId }, 'Processing project');
log.warn({ error }, 'Warning message');
log.error({ error }, 'Error occurred');
```

### Database Operations

Use Supabase client for database operations:

```typescript
import { supabaseAdmin } from '../lib/supabase.js';

const { data, error } = await supabaseAdmin
  .from('projects')
  .select('*')
  .eq('id', projectId);

if (error) throw error;
```

## Best Practices

1. **Always handle errors** - Use try-catch and log appropriately
2. **Use correlation IDs** - For tracing across services
3. **Validate inputs** - Use Zod schemas for validation
4. **Implement timeouts** - For external API calls
5. **Use queues** - For long-running operations
6. **Log structured data** - Include relevant context
7. **Handle rate limits** - Respect API limitations
8. **Retry transient failures** - With exponential backoff
9. **Clean up resources** - Close connections, release locks
10. **Monitor health** - Check queue and worker status regularly

## Testing

Services can be tested independently:

```typescript
import { startAutomationLoop } from '../services/jobOrchestrator.js';
import { getQueueMetrics } from '../services/queueManager.js';

// Test automation loop
await startAutomationLoop('test-project-id');

// Check queue metrics
const metrics = await getQueueMetrics();
console.log('Queue metrics:', metrics);
```

## Configuration

Services use environment configuration from `config.ts`:

```typescript
import { env } from '../lib/config.js';

console.log('Redis URL:', env.REDIS_URL);
console.log('API URL:', env.API_URL);
```
