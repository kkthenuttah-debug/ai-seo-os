import { Queue, Worker, QueueEvents } from 'bullmq';
import { logger } from '../lib/logger.js';
import {
  agentTaskQueue,
  buildQueue,
  publishQueue,
  monitorQueue,
  optimizeQueue,
  webhookQueue,
  getAgentTaskQueueStats,
  getWebhookQueueStats,
} from '../queues/index.js';
import type { AgentTaskJob, WebhookJob } from '../types/queue.js';
import type { QueueHealth, WorkerHealth } from '../types/queue.js';

const log = logger.child({ service: 'queueManager' });

// Worker tracking
const activeWorkers = new Map<string, Worker>();

// Register a worker
export function registerWorker(queueName: string, worker: Worker) {
  activeWorkers.set(queueName, worker);
  log.info({ queueName }, 'Worker registered');
}

// Unregister a worker
export function unregisterWorker(queueName: string) {
  const worker = activeWorkers.get(queueName);
  if (worker) {
    activeWorkers.delete(queueName);
    log.info({ queueName }, 'Worker unregistered');
  }
}

// Pause a specific queue
export async function pauseQueue(queueName: string): Promise<void> {
  const queue = getQueueByName(queueName);
  if (!queue) {
    throw new Error(`Queue not found: ${queueName}`);
  }

  await queue.pause();
  log.info({ queueName }, 'Queue paused');
}

// Resume a specific queue
export async function resumeQueue(queueName: string): Promise<void> {
  const queue = getQueueByName(queueName);
  if (!queue) {
    throw new Error(`Queue not found: ${queueName}`);
  }

  await queue.resume();
  log.info({ queueName }, 'Queue resumed');
}

// Clear a specific queue
export async function clearQueue(queueName: string): Promise<void> {
  const queue = getQueueByName(queueName);
  if (!queue) {
    throw new Error(`Queue not found: ${queueName}`);
  }

  await queue.drain();
  await queue.clean(0, 0, 'completed');
  await queue.clean(0, 0, 'failed');
  await queue.clean(0, 0, 'delayed');

  log.info({ queueName }, 'Queue cleared');
}

// Get queue by name
function getQueueByName(name: string): Queue | null {
  switch (name) {
    case 'agent-tasks':
      return agentTaskQueue;
    case 'build':
      return buildQueue;
    case 'publish':
      return publishQueue;
    case 'monitor':
      return monitorQueue;
    case 'optimize':
      return optimizeQueue;
    case 'webhooks':
      return webhookQueue;
    default:
      return null;
  }
}

// Get queue health
export async function getQueueHealth(queueName: string): Promise<QueueHealth | null> {
  const queue = getQueueByName(queueName);
  if (!queue) {
    return null;
  }

  let counts;
  if (queueName === 'agent-tasks') {
    counts = await getAgentTaskQueueStats();
  } else if (queueName === 'webhooks') {
    counts = await getWebhookQueueStats();
  } else {
    counts = await queue.getJobCounts();
  }

  const isPaused = await queue.isPaused();

  return {
    queue_name: queueName,
    waiting: counts.waiting || 0,
    active: counts.active || 0,
    completed: counts.completed || 0,
    failed: counts.failed || 0,
    delayed: counts.delayed || 0,
    is_paused: isPaused,
  };
}

// Get all queues health
export async function getAllQueuesHealth(): Promise<QueueHealth[]> {
  const queueNames = ['agent-tasks', 'build', 'publish', 'monitor', 'optimize', 'webhooks'];
  const healthPromises = queueNames.map(name => getQueueHealth(name));
  const healthResults = await Promise.all(healthPromises);

  return healthResults.filter((h): h is QueueHealth => h !== null);
}

// Get worker health
export async function getWorkerHealth(queueName: string): Promise<WorkerHealth | null> {
  const worker = activeWorkers.get(queueName);
  if (!worker) {
    return null;
  }

  return {
    queue_name: queueName,
    is_running: !worker.isClosing(),
    active_jobs: worker.getActiveCount(),
    processed_jobs: await getProcessedJobCount(queueName),
    failed_jobs: await getFailedJobCount(queueName),
    last_job_timestamp: await getLastJobTimestamp(queueName),
  };
}

// Get all workers health
export async function getAllWorkersHealth(): Promise<WorkerHealth[]> {
  const queueNames = Array.from(activeWorkers.keys());
  const healthPromises = queueNames.map(name => getWorkerHealth(name));
  const healthResults = await Promise.all(healthPromises);

  return healthResults.filter((h): h is WorkerHealth => h !== null);
}

// Get metrics for monitoring
export async function getQueueMetrics() {
  const queuesHealth = await getAllQueuesHealth();
  const workersHealth = await getAllWorkersHealth();

  const totalWaiting = queuesHealth.reduce((sum, q) => sum + q.waiting, 0);
  const totalActive = queuesHealth.reduce((sum, q) => sum + q.active, 0);
  const totalFailed = queuesHealth.reduce((sum, q) => sum + q.failed, 0);
  const totalCompleted = queuesHealth.reduce((sum, q) => sum + q.completed, 0);

  const healthyQueues = queuesHealth.filter(q => !q.isPaused).length;
  const pausedQueues = queuesHealth.filter(q => q.isPaused).length;

  return {
    queues: {
      total: queuesHealth.length,
      healthy: healthyQueues,
      paused: pausedQueues,
      waiting: totalWaiting,
      active: totalActive,
      failed: totalFailed,
      completed: totalCompleted,
      details: queuesHealth,
    },
    workers: {
      total: workersHealth.length,
      active: workersHealth.filter(w => w.isRunning).length,
      details: workersHealth,
    },
  };
}

// Helper: Get processed job count
async function getProcessedJobCount(queueName: string): Promise<number> {
  const queue = getQueueByName(queueName);
  if (!queue) return 0;

  const counts = await queue.getJobCounts();
  return counts.completed || 0;
}

// Helper: Get failed job count
async function getFailedJobCount(queueName: string): Promise<number> {
  const queue = getQueueByName(queueName);
  if (!queue) return 0;

  const counts = await queue.getJobCounts();
  return counts.failed || 0;
}

// Helper: Get last job timestamp
async function getLastJobTimestamp(queueName: string): Promise<number | undefined> {
  const queue = getQueueByName(queueName);
  if (!queue) return undefined;

  const completed = await queue.getCompleted(0, 0);
  if (completed.length > 0) {
    return completed[0].timestamp;
  }

  const failed = await queue.getFailed(0, 0);
  if (failed.length > 0) {
    return failed[0].timestamp;
  }

  return undefined;
}

// Graceful shutdown
export async function gracefulShutdown(): Promise<void> {
  log.info('Starting graceful shutdown');

  // Pause all queues
  await pauseAllQueues();

  // Wait for active jobs to complete (with timeout)
  const SHUTDOWN_TIMEOUT = 30 * 1000; // 30 seconds
  const startTime = Date.now();

  while (Date.now() - startTime < SHUTDOWN_TIMEOUT) {
    const queuesHealth = await getAllQueuesHealth();
    const totalActive = queuesHealth.reduce((sum, q) => sum + q.active, 0);

    if (totalActive === 0) {
      break;
    }

    log.info({ activeJobs: totalActive }, 'Waiting for active jobs to complete');
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Close all workers
  for (const [queueName, worker] of activeWorkers) {
    try {
      await worker.close();
      log.info({ queueName }, 'Worker closed');
    } catch (error) {
      log.error({ queueName, error }, 'Error closing worker');
    }
  }

  activeWorkers.clear();

  // Close all queues
  await closeAllQueues();

  log.info('Graceful shutdown completed');
}

// Pause all queues
async function pauseAllQueues(): Promise<void> {
  const queueNames = ['agent-tasks', 'build', 'publish', 'monitor', 'optimize', 'webhooks'];
  await Promise.all(queueNames.map(name => pauseQueue(name)));
}

// Close all queues
async function closeAllQueues(): Promise<void> {
  const queues = [agentTaskQueue, buildQueue, publishQueue, monitorQueue, optimizeQueue, webhookQueue];
  await Promise.all(queues.map(q => q.close()));
}

// Health check for the queue system
export async function healthCheck(): Promise<{
  healthy: boolean;
  queues: QueueHealth[];
  workers: WorkerHealth[];
}> {
  const queuesHealth = await getAllQueuesHealth();
  const workersHealth = await getAllWorkersHealth();

  // System is healthy if:
  // - No queues have excessive failures (> 10% failure rate)
  // - All workers are running (if registered)
  const queuesHealthy = queuesHealth.every(q => {
    const total = q.completed + q.failed;
    if (total === 0) return true;
    return (q.failed / total) < 0.1;
  });

  const workersHealthy = workersHealth.every(w => w.is_running);

  return {
    healthy: queuesHealthy && workersHealthy,
    queues: queuesHealth,
    workers: workersHealth,
  };
}

// Setup queue event listeners for metrics
export function setupQueueEventListeners() {
  const queueNames = ['agent-tasks', 'build', 'publish', 'monitor', 'optimize', 'webhooks'];

  for (const queueName of queueNames) {
    const events = new QueueEvents(queueName, {
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    });

    events.on('completed', ({ jobId }) => {
      log.debug({ queueName, jobId }, 'Job completed');
    });

    events.on('failed', ({ jobId, failedReason }) => {
      log.warn({ queueName, jobId, reason: failedReason }, 'Job failed');
    });

    events.on('stalled', ({ jobId }) => {
      log.warn({ queueName, jobId }, 'Job stalled');
    });

    events.on('error', (error) => {
      log.error({ queueName, error }, 'Queue event error');
    });
  }

  log.info('Queue event listeners setup complete');
}
