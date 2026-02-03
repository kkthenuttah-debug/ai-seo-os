import { Worker, Job } from 'bullmq';
import { redis } from '../lib/redis.js';
import { logger } from '../lib/logger.js';
import { createOrchestrator } from '../services/orchestrator.js';
import { supabaseAdmin } from '../lib/supabase.js';
import type { PublishJob } from '../types/index.js';

const log = logger.child({ worker: 'publish' });

async function processPublishJob(job: Job<PublishJob>) {
  const { project_id, page_id } = job.data;

  log.info({ jobId: job.id, projectId: project_id, pageId: page_id }, 'Processing publish job');

  try {
    const orchestrator = await createOrchestrator(project_id).initialize();

    // Update page status
    await supabaseAdmin
      .from('pages')
      .update({ status: 'publishing' })
      .eq('id', page_id);

    const result = await orchestrator.publishPage(page_id);

    log.info({ jobId: job.id, projectId: project_id, pageId: page_id, wpId: result.id }, 'Publish job completed');

    return { success: true, wordpress_id: result.id, link: result.link };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log.error({ jobId: job.id, projectId: project_id, pageId: page_id, error: errorMessage }, 'Publish job failed');

    // Update page status
    await supabaseAdmin
      .from('pages')
      .update({ status: 'error' })
      .eq('id', page_id);

    throw error;
  }
}

export function startPublishWorker() {
  const worker = new Worker<PublishJob>('publish', processPublishJob, {
    connection: redis,
    concurrency: 1, // Publish one at a time to avoid rate limits
    limiter: {
      max: 5,
      duration: 60000, // 5 publishes per minute
    },
  });

  worker.on('completed', (job) => {
    log.info({ jobId: job.id }, 'Publish worker: job completed');
  });

  worker.on('failed', (job, error) => {
    log.error({ jobId: job?.id, error: error.message }, 'Publish worker: job failed');
  });

  worker.on('error', (error) => {
    log.error({ error: error.message }, 'Publish worker error');
  });

  log.info('Publish worker started');

  return worker;
}
