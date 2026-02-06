import { Worker, Job } from 'bullmq';
import { getWorkerOptions } from '../queues/config.js';
import { logger } from '../lib/logger.js';
import { createOrchestrator } from '../services/orchestrator.js';
import { scheduleMonitorJob } from '../queues/index.js';
import type { MonitorJob } from '../types/index.js';

const log = logger.child({ worker: 'monitor' });

// Run monitoring every 24 hours
const MONITOR_INTERVAL_MS = 24 * 60 * 60 * 1000;

async function processMonitorJob(job: Job<MonitorJob>) {
  const { project_id } = job.data;

  log.info({ jobId: job.id, projectId: project_id }, 'Processing monitor job');

  try {
    const orchestrator = await createOrchestrator(project_id).initialize();
    const result = await orchestrator.runMonitoring();

    if (result) {
      log.info({
        jobId: job.id,
        projectId: project_id,
        healthScore: result.health_score,
        alerts: result.alerts.length,
        optimizationCandidates: result.optimization_candidates.length,
      }, 'Monitor job completed');
    }

    // Schedule next monitoring run
    await scheduleMonitorJob({ project_id }, { delay: MONITOR_INTERVAL_MS });

    return { success: true, result };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log.error({ jobId: job.id, projectId: project_id, error: errorMessage }, 'Monitor job failed');

    // Still schedule next run even on failure
    await scheduleMonitorJob({ project_id }, { delay: MONITOR_INTERVAL_MS });

    throw error;
  }
}

export function startMonitorWorker() {
  const worker = new Worker<MonitorJob>('monitor', processMonitorJob, getWorkerOptions('monitor'));

  worker.on('completed', (job) => {
    log.info({ jobId: job.id }, 'Monitor worker: job completed');
  });

  worker.on('failed', (job, error) => {
    log.error({ jobId: job?.id, error: error.message }, 'Monitor worker: job failed');
  });

  worker.on('error', (error) => {
    log.error({ error: error.message }, 'Monitor worker error');
  });

  log.info('Monitor worker started');

  return worker;
}
