import { Worker, Job } from 'bullmq';
import { getWorkerOptions } from '../queues/config.js';
import { logger } from '../lib/logger.js';
import { createOrchestrator } from '../services/orchestrator.js';
import { scheduleMonitorJob } from '../queues/index.js';
import type { IndexJob } from '../types/index.js';

const log = logger.child({ worker: 'index' });

async function processIndexJob(job: Job<IndexJob>) {
  const { project_id, url } = job.data;

  log.info({ jobId: job.id, projectId: project_id }, 'Processing index job');

  try {
    const orchestrator = await createOrchestrator(project_id).initialize();
    await orchestrator.runIndexing(url);

    // Per spec: Indexing → Monitor (GSC loop)
    await scheduleMonitorJob({ project_id }, { delay: 60000 });

    log.info({ jobId: job.id, projectId: project_id }, 'Index job completed');
    return { success: true };
  } catch (error) {
    const err = error as Error | { message?: string };
    const errorMessage = err?.message ?? (error != null ? String(error) : 'Unknown error');

    if (errorMessage.startsWith('Project not found:')) {
      log.warn({ jobId: job.id, projectId: project_id }, 'Index job skipped (project no longer exists)');
      return { success: true, skipped: true };
    }

    log.error({ jobId: job.id, projectId: project_id, error: errorMessage }, 'Index job failed');
    throw error;
  }
}

export function startIndexWorker() {
  const worker = new Worker<IndexJob>('index', processIndexJob, getWorkerOptions('index'));

  worker.on('completed', (job) => {
    log.info({ jobId: job.id }, 'Index worker: job completed');
  });

  worker.on('failed', (job, error) => {
    log.error({ jobId: job?.id, error: error.message }, 'Index worker: job failed');
  });

  worker.on('error', (error) => {
    log.error({ error: error.message }, 'Index worker error');
  });

  log.info('Index worker started');
  return worker;
}
