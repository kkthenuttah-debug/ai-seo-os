import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import { redis } from '../lib/redis.js';
import { logger } from '../lib/logger.js';
import type { QueueJob, BuildJob, PublishJob, MonitorJob, OptimizeJob } from '../types/index.js';

const QUEUE_OPTIONS = {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential' as const,
      delay: 1000,
    },
    removeOnComplete: {
      count: 100,
      age: 24 * 60 * 60, // 24 hours
    },
    removeOnFail: {
      count: 50,
    },
  },
};

// Queue definitions
export const buildQueue = new Queue<BuildJob>('build', QUEUE_OPTIONS);
export const publishQueue = new Queue<PublishJob>('publish', QUEUE_OPTIONS);
export const monitorQueue = new Queue<MonitorJob>('monitor', QUEUE_OPTIONS);
export const optimizeQueue = new Queue<OptimizeJob>('optimize', QUEUE_OPTIONS);

// Queue event handlers
const setupQueueEvents = (queue: Queue, name: string) => {
  const events = new QueueEvents(name, { connection: redis });

  events.on('completed', ({ jobId }) => {
    logger.info({ queue: name, jobId }, 'Job completed');
  });

  events.on('failed', ({ jobId, failedReason }) => {
    logger.error({ queue: name, jobId, reason: failedReason }, 'Job failed');
  });

  events.on('stalled', ({ jobId }) => {
    logger.warn({ queue: name, jobId }, 'Job stalled');
  });

  return events;
};

export const buildQueueEvents = setupQueueEvents(buildQueue, 'build');
export const publishQueueEvents = setupQueueEvents(publishQueue, 'publish');
export const monitorQueueEvents = setupQueueEvents(monitorQueue, 'monitor');
export const optimizeQueueEvents = setupQueueEvents(optimizeQueue, 'optimize');

// Job scheduling helpers
export async function scheduleBuildJob(data: Omit<BuildJob, 'type'>, options?: { delay?: number; priority?: number }) {
  const job = await buildQueue.add('build', { ...data, type: 'build' }, options);
  logger.info({ jobId: job.id, projectId: data.project_id, phase: data.phase }, 'Build job scheduled');
  return job;
}

export async function schedulePublishJob(data: Omit<PublishJob, 'type'>, options?: { delay?: number; priority?: number }) {
  const job = await publishQueue.add('publish', { ...data, type: 'publish' }, options);
  logger.info({ jobId: job.id, projectId: data.project_id, pageId: data.page_id }, 'Publish job scheduled');
  return job;
}

export async function scheduleMonitorJob(data: Omit<MonitorJob, 'type'>, options?: { delay?: number; priority?: number }) {
  const job = await monitorQueue.add('monitor', { ...data, type: 'monitor' }, options);
  logger.info({ jobId: job.id, projectId: data.project_id }, 'Monitor job scheduled');
  return job;
}

export async function scheduleOptimizeJob(data: Omit<OptimizeJob, 'type'>, options?: { delay?: number; priority?: number }) {
  const job = await optimizeQueue.add('optimize', { ...data, type: 'optimize' }, options);
  logger.info({ jobId: job.id, projectId: data.project_id, pageId: data.page_id }, 'Optimize job scheduled');
  return job;
}

// Bulk scheduling for automation loops
export async function scheduleAutomationLoop(projectId: string) {
  // Schedule initial research phase
  await scheduleBuildJob({ project_id: projectId, phase: 'research' });
}

export async function scheduleFullBuildPipeline(projectId: string) {
  // Schedule all build phases with delays
  await scheduleBuildJob({ project_id: projectId, phase: 'research' });
  await scheduleBuildJob({ project_id: projectId, phase: 'architecture' }, { delay: 30000 });
  await scheduleBuildJob({ project_id: projectId, phase: 'content' }, { delay: 120000 });
  await scheduleBuildJob({ project_id: projectId, phase: 'elementor' }, { delay: 300000 });
  await scheduleBuildJob({ project_id: projectId, phase: 'linking' }, { delay: 600000 });
}

// Recurring jobs setup
export async function setupRecurringJobs() {
  // Clean old jobs
  await buildQueue.obliterate({ force: true }).catch(() => {});

  logger.info('Recurring jobs configured');
}
