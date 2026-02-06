import { Worker, Job } from 'bullmq';
import { getWorkerOptions } from '../queues/config.js';
import { logger } from '../lib/logger.js';
import { createOrchestrator } from '../services/orchestrator.js';
import { supabaseAdmin } from '../lib/supabase.js';
import type { OptimizeJob } from '../types/index.js';

const log = logger.child({ worker: 'optimize' });

async function processOptimizeJob(job: Job<OptimizeJob>) {
  const { project_id, page_id, reason } = job.data;

  log.info({ jobId: job.id, projectId: project_id, pageId: page_id, reason }, 'Processing optimize job');

  try {
    // Update page status
    await supabaseAdmin
      .from('pages')
      .update({ status: 'optimizing' })
      .eq('id', page_id);

    const orchestrator = await createOrchestrator(project_id).initialize();
    const result = await orchestrator.optimizePage(page_id);

    // Update page status back to published
    await supabaseAdmin
      .from('pages')
      .update({ status: 'published' })
      .eq('id', page_id);

    log.info({
      jobId: job.id,
      projectId: project_id,
      pageId: page_id,
      recommendationsCount: result.recommendations.length,
      hasContentUpdate: !!result.updated_content,
    }, 'Optimize job completed');

    return { success: true, result };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log.error({ jobId: job.id, projectId: project_id, pageId: page_id, error: errorMessage }, 'Optimize job failed');

    // Revert page status
    await supabaseAdmin
      .from('pages')
      .update({ status: 'published' })
      .eq('id', page_id);

    throw error;
  }
}

export function startOptimizeWorker() {
  const worker = new Worker<OptimizeJob>('optimize', processOptimizeJob, getWorkerOptions('optimize'));

  worker.on('completed', (job) => {
    log.info({ jobId: job.id }, 'Optimize worker: job completed');
  });

  worker.on('failed', (job, error) => {
    log.error({ jobId: job?.id, error: error.message }, 'Optimize worker: job failed');
  });

  worker.on('error', (error) => {
    log.error({ error: error.message }, 'Optimize worker error');
  });

  log.info('Optimize worker started');

  return worker;
}
