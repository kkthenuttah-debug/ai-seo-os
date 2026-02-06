import { Queue } from 'bullmq';
import { logger } from '../lib/logger.js';
import { getQueueOptions } from './config.js';
import type { AgentTaskJob } from '../types/queue.js';

const log = logger.child({ queue: 'agent-tasks' });

// Create the agent tasks queue
export const agentTaskQueue = new Queue<AgentTaskJob>('agent-tasks', getQueueOptions('agent-tasks'));

// Schedule an agent task job
export async function scheduleAgentTask(data: {
  project_id: string;
  agent_type: AgentTaskJob['agent_type'];
  input: Record<string, any>;
  correlation_id: string;
}, options?: { delay?: number; priority?: number }) {
  const jobData: AgentTaskJob = {
    ...data,
    retry_count: 0,
    timestamp: Date.now(),
  };

  const job = await agentTaskQueue.add(data.agent_type, jobData, {
    delay: options?.delay,
    priority: options?.priority,
  });

  log.info({
    jobId: job.id,
    projectId: data.project_id,
    agentType: data.agent_type,
    correlationId: data.correlation_id,
  }, 'Agent task scheduled');

  return job;
}

// Schedule agent tasks in bulk
export async function scheduleAgentTasks(tasks: Array<{
  project_id: string;
  agent_type: AgentTaskJob['agent_type'];
  input: Record<string, any>;
  correlation_id: string;
}>): Promise<void> {
  const jobs = tasks.map((task, index) => ({
    name: task.agent_type,
    data: {
      ...task,
      retry_count: 0,
      timestamp: Date.now() + index * 100, // Stagger by 100ms
    } as AgentTaskJob,
    opts: {
      delay: index * 100,
    },
  }));

  await agentTaskQueue.addBulk(jobs);

  log.info({ count: tasks.length }, 'Agent tasks scheduled in bulk');
}

// Get queue statistics
export async function getAgentTaskQueueStats() {
  const waiting = await agentTaskQueue.getWaiting();
  const active = await agentTaskQueue.getActive();
  const completed = await agentTaskQueue.getCompleted();
  const failed = await agentTaskQueue.getFailed();
  const delayed = await agentTaskQueue.getDelayed();

  return {
    waiting: waiting.length,
    active: active.length,
    completed: completed.length,
    failed: failed.length,
    delayed: delayed.length,
  };
}

// Pause the queue
export async function pauseAgentTaskQueue() {
  await agentTaskQueue.pause();
  log.info('Agent task queue paused');
}

// Resume the queue
export async function resumeAgentTaskQueue() {
  await agentTaskQueue.resume();
  log.info('Agent task queue resumed');
}

// Clean up old jobs
export async function cleanAgentTaskQueue() {
  await agentTaskQueue.clean(24 * 60 * 60 * 1000, 100, 'completed');
  await agentTaskQueue.clean(7 * 24 * 60 * 60 * 1000, 500, 'failed');
  log.info('Agent task queue cleaned');
}

// Drain the queue (remove all jobs)
export async function drainAgentTaskQueue() {
  await agentTaskQueue.drain();
  log.info('Agent task queue drained');
}

// Close the queue
export async function closeAgentTaskQueue() {
  await agentTaskQueue.close();
  log.info('Agent task queue closed');
}

export default agentTaskQueue;
