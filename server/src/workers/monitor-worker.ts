import { Worker, Job } from 'bullmq';
import { getWorkerOptions } from '../queues/config.js';
import { logger } from '../lib/logger.js';
import { createOrchestrator } from '../services/orchestrator.js';
import { WebhookService } from '../services/webhooks.js';
import { scheduleMonitorJob } from '../queues/index.js';
import { supabaseAdmin } from '../lib/supabase.js';
import type { MonitorJob } from '../types/index.js';

const log = logger.child({ worker: 'monitor' });
const webhookService = new WebhookService();

// Run monitoring every 24 hours
const MONITOR_INTERVAL_MS = 24 * 60 * 60 * 1000;

async function processMonitorJob(job: Job<MonitorJob>) {
  const { project_id } = job.data;

  log.info({ jobId: job.id, projectId: project_id }, 'Processing monitor job');

  try {
    const orchestrator = await createOrchestrator(project_id).initialize();
    const result = await orchestrator.runMonitoring();

    let monitorRunId: string | null = null;

    if (result) {
      const resultPayload = {
        rankings: result.rankings ?? [],
        trends: result.trends ?? [],
        alerts: result.alerts ?? [],
        recommendations: result.recommendations ?? [],
        optimization_candidates: result.optimization_candidates ?? [],
      };
      const healthScore =
        result.health_score != null && result.health_score >= 0 && result.health_score <= 100
          ? result.health_score
          : null;

      const { data: inserted, error } = await supabaseAdmin
        .from('monitor_runs')
        .insert({
          project_id,
          health_score: healthScore,
          result: resultPayload as never,
        })
        .select('id')
        .single();

      if (error) {
        log.warn({ projectId: project_id, error: error.message }, 'Failed to save monitor run');
      } else if (inserted?.id) {
        monitorRunId = inserted.id as string;
        await webhookService.triggerMonitorCompleted({
          event: 'monitor.completed',
          projectId: project_id,
          monitorRunId,
          healthScore,
          alertsCount: resultPayload.alerts.length,
          trendsCount: resultPayload.trends.length,
          recommendationsCount: resultPayload.recommendations.length,
          optimizationCandidatesCount: resultPayload.optimization_candidates.length,
          result: resultPayload,
          completedAt: new Date().toISOString(),
        });
      }

      log.info({
        jobId: job.id,
        projectId: project_id,
        healthScore: result.health_score,
        alerts: result.alerts?.length ?? 0,
        optimizationCandidates: result.optimization_candidates?.length ?? 0,
      }, 'Monitor job completed');
    }

    // Schedule next monitoring run
    await scheduleMonitorJob({ project_id }, { delay: MONITOR_INTERVAL_MS });

    return { success: true, result, monitorRunId };
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
