import { Queue } from 'bullmq';
import { logger } from '../lib/logger.js';
import { getQueueOptions } from './config.js';
import type { WebhookJob } from '../types/queue.js';

const log = logger.child({ queue: 'webhooks' });

// Create the webhooks queue
export const webhookQueue = new Queue<WebhookJob>('webhooks', getQueueOptions('webhooks'));

// Schedule a webhook delivery job
export async function scheduleWebhook(data: {
  project_id: string;
  webhook_type: WebhookJob['webhook_type'];
  url: string;
  payload: Record<string, any>;
  headers?: Record<string, string>;
  correlation_id: string;
}, options?: { delay?: number; priority?: number }) {
  const jobData: WebhookJob = {
    ...data,
    retry_count: 0,
  };

  const job = await webhookQueue.add(data.webhook_type, jobData, {
    delay: options?.delay,
    priority: options?.priority,
  });

  log.info({
    jobId: job.id,
    projectId: data.project_id,
    webhookType: data.webhook_type,
    url: data.url,
    correlationId: data.correlation_id,
  }, 'Webhook scheduled');

  return job;
}

// Schedule webhooks in bulk
export async function scheduleWebhooks(webhooks: Array<{
  project_id: string;
  webhook_type: WebhookJob['webhook_type'];
  url: string;
  payload: Record<string, any>;
  headers?: Record<string, string>;
  correlation_id: string;
}>): Promise<void> {
  const jobs = webhooks.map((webhook, index) => ({
    name: webhook.webhook_type,
    data: {
      ...webhook,
      retry_count: 0,
    } as WebhookJob,
    opts: {
      delay: index * 50, // Stagger by 50ms
    },
  }));

  await webhookQueue.addBulk(jobs);

  log.info({ count: webhooks.length }, 'Webhooks scheduled in bulk');
}

// Get queue statistics
export async function getWebhookQueueStats() {
  const waiting = await webhookQueue.getWaiting();
  const active = await webhookQueue.getActive();
  const completed = await webhookQueue.getCompleted();
  const failed = await webhookQueue.getFailed();
  const delayed = await webhookQueue.getDelayed();

  return {
    waiting: waiting.length,
    active: active.length,
    completed: completed.length,
    failed: failed.length,
    delayed: delayed.length,
  };
}

// Pause the queue
export async function pauseWebhookQueue() {
  await webhookQueue.pause();
  log.info('Webhook queue paused');
}

// Resume the queue
export async function resumeWebhookQueue() {
  await webhookQueue.resume();
  log.info('Webhook queue resumed');
}

// Clean up old jobs
export async function cleanWebhookQueue() {
  await webhookQueue.clean(24 * 60 * 60 * 1000, 100, 'completed');
  await webhookQueue.clean(7 * 24 * 60 * 60 * 1000, 500, 'failed');
  log.info('Webhook queue cleaned');
}

// Drain the queue (remove all jobs)
export async function drainWebhookQueue() {
  await webhookQueue.drain();
  log.info('Webhook queue drained');
}

// Close the queue
export async function closeWebhookQueue() {
  await webhookQueue.close();
  log.info('Webhook queue closed');
}

export default webhookQueue;
