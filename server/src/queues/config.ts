import { env } from '../lib/config.js';
import type { QueueConfig } from '../types/queue.js';

// Parse Redis URL
function parseRedisUrl(url: string) {
  const parsed = new URL(url);
  return {
    host: parsed.hostname || 'localhost',
    port: parseInt(parsed.port || '6379'),
    password: parsed.password || undefined,
  };
}

const redisConfig = parseRedisUrl(env.REDIS_URL);

export const queueConfig: QueueConfig = {
  ...redisConfig,
  max_concurrency: {
    agent_tasks: parseInt(process.env.AGENT_TASKS_CONCURRENCY || '3'),
    build: parseInt(process.env.BUILD_CONCURRENCY || '2'),
    publish: parseInt(process.env.PUBLISH_CONCURRENCY || '1'),
    monitor: parseInt(process.env.MONITOR_CONCURRENCY || '3'),
    optimize: parseInt(process.env.OPTIMIZE_CONCURRENCY || '2'),
    webhooks: parseInt(process.env.WEBHOOKS_CONCURRENCY || '5'),
  },
  retry_attempts: parseInt(process.env.RETRY_ATTEMPTS || '3'),
  retry_delay_ms: parseInt(process.env.RETRY_DELAY_MS || '1000'),
  lock_duration_ms: parseInt(process.env.LOCK_DURATION_MS || '30000'),
};

// BullMQ connection options
export const connectionOptions = {
  host: queueConfig.host,
  port: queueConfig.port,
  password: queueConfig.password,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
};

// Default job options
export const defaultJobOptions = {
  attempts: queueConfig.retry_attempts,
  backoff: {
    type: 'exponential' as const,
    delay: queueConfig.retry_delay_ms,
  },
  removeOnComplete: {
    count: 100,
    age: 24 * 60 * 60, // 24 hours
  },
  removeOnFail: {
    count: 500,
    age: 7 * 24 * 60 * 60, // 7 days
  },
};

// Queue-specific options
export const getQueueOptions = (queueName: string) => ({
  connection: connectionOptions,
  defaultJobOptions: {
    ...defaultJobOptions,
    ...(queueName === 'agent-tasks' && {
      attempts: 5,
      backoff: {
        type: 'exponential' as const,
        delay: 5000,
      },
    }),
    ...(queueName === 'webhooks' && {
      attempts: 10,
      backoff: {
        type: 'exponential' as const,
        delay: 2000,
      },
    }),
  },
});

// Worker options
export const getWorkerOptions = (queueName: string) => ({
  connection: connectionOptions,
  concurrency: queueName === 'agent-tasks'
    ? queueConfig.max_concurrency.agent_tasks
    : queueName === 'build'
    ? queueConfig.max_concurrency.build
    : queueName === 'publish'
    ? queueConfig.max_concurrency.publish
    : queueName === 'monitor'
    ? queueConfig.max_concurrency.monitor
    : queueName === 'optimize'
    ? queueConfig.max_concurrency.optimize
    : queueName === 'webhooks'
    ? queueConfig.max_concurrency.webhooks
    : 1,
  limiter: queueName === 'publish'
    ? { max: 5, duration: 60000 }
    : queueName === 'webhooks'
    ? { max: 20, duration: 60000 }
    : { max: 10, duration: 60000 },
});
