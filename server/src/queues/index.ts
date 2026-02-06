import { Queue, QueueEvents } from 'bullmq';
import { logger } from '../lib/logger.js';
import { getQueueOptions } from './config.js';
import { agentTaskQueue, scheduleAgentTask, scheduleAgentTasks, getAgentTaskQueueStats } from './agentTaskQueue.js';
import { webhookQueue, scheduleWebhook, scheduleWebhooks, getWebhookQueueStats } from './webhookQueue.js';
import type { AgentTaskJob, WebhookJob } from '../types/queue.js';
import type { BuildJob, PublishJob, MonitorJob, OptimizeJob } from '../types/index.js';

const log = logger.child({ component: 'queues' });

// Export individual queues
export { agentTaskQueue, webhookQueue };

// Export queue-specific functions
export {
  scheduleAgentTask,
  scheduleAgentTasks,
  getAgentTaskQueueStats,
  pauseAgentTaskQueue,
  resumeAgentTaskQueue,
  cleanAgentTaskQueue,
  drainAgentTaskQueue,
  closeAgentTaskQueue,
} from './agentTaskQueue.js';

export {
  scheduleWebhook,
  scheduleWebhooks,
  getWebhookQueueStats,
  pauseWebhookQueue,
  resumeWebhookQueue,
  cleanWebhookQueue,
  drainWebhookQueue,
  closeWebhookQueue,
} from './webhookQueue.js';

// Create additional queues (build, publish, monitor, optimize)
export const buildQueue = new Queue<BuildJob>('build', getQueueOptions('build'));
export const publishQueue = new Queue<PublishJob>('publish', getQueueOptions('publish'));
export const monitorQueue = new Queue<MonitorJob>('monitor', getQueueOptions('monitor'));
export const optimizeQueue = new Queue<OptimizeJob>('optimize', getQueueOptions('optimize'));

// Queue events setup
const setupQueueEvents = (queueName: string) => {
  const events = new QueueEvents(queueName, { connection: getQueueOptions(queueName).connection });

  events.on('completed', ({ jobId }) => {
    log.debug({ queue: queueName, jobId }, 'Job completed');
  });

  events.on('failed', ({ jobId, failedReason }) => {
    log.warn({ queue: queueName, jobId, reason: failedReason }, 'Job failed');
  });

  events.on('stalled', ({ jobId }) => {
    log.warn({ queue: queueName, jobId }, 'Job stalled');
  });

  events.on('progress', ({ jobId, data }) => {
    log.debug({ queue: queueName, jobId, progress: data }, 'Job progress');
  });

  return events;
};

// Initialize queue events
export const agentTaskQueueEvents = setupQueueEvents('agent-tasks');
export const buildQueueEvents = setupQueueEvents('build');
export const publishQueueEvents = setupQueueEvents('publish');
export const monitorQueueEvents = setupQueueEvents('monitor');
export const optimizeQueueEvents = setupQueueEvents('optimize');
export const webhookQueueEvents = setupQueueEvents('webhooks');

// Job scheduling helpers for existing queues

export async function scheduleBuildJob(data: Omit<BuildJob, 'correlation_id'>, options?: { delay?: number; priority?: number }) {
  const jobData: BuildJob = {
    ...data,
    correlation_id: `build-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  };

  const job = await buildQueue.add('build', jobData, options);
  log.info({ jobId: job.id, projectId: data.project_id, phase: data.phase }, 'Build job scheduled');
  return job;
}

export async function schedulePublishJob(data: Omit<PublishJob, 'correlation_id'>, options?: { delay?: number; priority?: number }) {
  const jobData: PublishJob = {
    ...data,
    correlation_id: `publish-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  };

  const job = await publishQueue.add('publish', jobData, options);
  log.info({ jobId: job.id, projectId: data.project_id, pageId: data.page_id }, 'Publish job scheduled');
  return job;
}

export async function scheduleMonitorJob(data: Omit<MonitorJob, 'correlation_id'>, options?: { delay?: number; priority?: number }) {
  const jobData: MonitorJob = {
    ...data,
    correlation_id: `monitor-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  };

  const job = await monitorQueue.add('monitor', jobData, options);
  log.info({ jobId: job.id, projectId: data.project_id }, 'Monitor job scheduled');
  return job;
}

export async function scheduleOptimizeJob(data: Omit<OptimizeJob, 'correlation_id'>, options?: { delay?: number; priority?: number }) {
  const jobData: OptimizeJob = {
    ...data,
    correlation_id: `optimize-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  };

  const job = await optimizeQueue.add('optimize', jobData, options);
  log.info({ jobId: job.id, projectId: data.project_id, pageId: data.page_id }, 'Optimize job scheduled');
  return job;
}

// Get all queue stats
export async function getAllQueueStats() {
  const [agentTasks, build, publish, monitor, optimize, webhooks] = await Promise.all([
    getAgentTaskQueueStats(),
    buildQueue.getJobCounts(),
    publishQueue.getJobCounts(),
    monitorQueue.getJobCounts(),
    optimizeQueue.getJobCounts(),
    getWebhookQueueStats(),
  ]);

  return {
    'agent-tasks': agentTasks,
    build,
    publish,
    monitor,
    optimize,
    webhooks,
  };
}

// Pause all queues
export async function pauseAllQueues() {
  await Promise.all([
    agentTaskQueue.pause(),
    buildQueue.pause(),
    publishQueue.pause(),
    monitorQueue.pause(),
    optimizeQueue.pause(),
    webhookQueue.pause(),
  ]);
  log.info('All queues paused');
}

// Resume all queues
export async function resumeAllQueues() {
  await Promise.all([
    agentTaskQueue.resume(),
    buildQueue.resume(),
    publishQueue.resume(),
    monitorQueue.resume(),
    optimizeQueue.resume(),
    webhookQueue.resume(),
  ]);
  log.info('All queues resumed');
}

// Clean all queues
export async function cleanAllQueues() {
  await Promise.all([
    import('./agentTaskQueue.js').then(m => m.cleanAgentTaskQueue()),
    buildQueue.clean(24 * 60 * 60 * 1000, 100, 'completed'),
    buildQueue.clean(7 * 24 * 60 * 60 * 1000, 500, 'failed'),
    publishQueue.clean(24 * 60 * 60 * 1000, 100, 'completed'),
    publishQueue.clean(7 * 24 * 60 * 60 * 1000, 500, 'failed'),
    monitorQueue.clean(24 * 60 * 60 * 1000, 100, 'completed'),
    monitorQueue.clean(7 * 24 * 60 * 60 * 1000, 500, 'failed'),
    optimizeQueue.clean(24 * 60 * 60 * 1000, 100, 'completed'),
    optimizeQueue.clean(7 * 24 * 60 * 60 * 1000, 500, 'failed'),
    import('./webhookQueue.js').then(m => m.cleanWebhookQueue()),
  ]);
  log.info('All queues cleaned');
}

// Close all queues
export async function closeAllQueues() {
  await Promise.all([
    import('./agentTaskQueue.js').then(m => m.closeAgentTaskQueue()),
    buildQueue.close(),
    publishQueue.close(),
    monitorQueue.close(),
    optimizeQueue.close(),
    import('./webhookQueue.js').then(m => m.closeWebhookQueue()),
  ]);
  log.info('All queues closed');
}

// Health check for all queues
export async function checkQueuesHealth() {
  const stats = await getAllQueueStats();

  return Object.entries(stats).map(([queueName, counts]) => ({
    queueName,
    waiting: counts.waiting || 0,
    active: counts.active || 0,
    completed: counts.completed || 0,
    failed: counts.failed || 0,
    delayed: counts.delayed || 0,
    isHealthy: (counts.failed || 0) < (counts.completed || 0) * 0.1, // Less than 10% failure rate
  }));
}

// Initialize queues
export async function initializeQueues() {
  log.info('Initializing queues...');
  
  // Clean up any old jobs on startup
  await cleanAllQueues();

  log.info('Queues initialized successfully');
}

export default {
  agentTaskQueue,
  buildQueue,
  publishQueue,
  monitorQueue,
  optimizeQueue,
  webhookQueue,
  scheduleAgentTask,
  scheduleAgentTasks,
  scheduleBuildJob,
  schedulePublishJob,
  scheduleMonitorJob,
  scheduleOptimizeJob,
  scheduleWebhook,
  scheduleWebhooks,
  getAllQueueStats,
  pauseAllQueues,
  resumeAllQueues,
  cleanAllQueues,
  closeAllQueues,
  checkQueuesHealth,
  initializeQueues,
};
