import { Worker, Job } from 'bullmq';
import { redis } from '../lib/redis.js';
import { logger } from '../lib/logger.js';
import { createOrchestrator } from '../services/orchestrator.js';
import { supabaseAdmin, getProjectById, getPagesByProjectId } from '../lib/supabase.js';
import type { BuildJob } from '../types/index.js';

const log = logger.child({ worker: 'build' });

async function processBuildJob(job: Job<BuildJob>) {
  const { project_id, phase, page_id } = job.data;

  log.info({ jobId: job.id, projectId: project_id, phase }, 'Processing build job');

  const orchestrator = await createOrchestrator(project_id).initialize();
  const project = await getProjectById(project_id);

  try {
    switch (phase) {
      case 'research': {
        await orchestrator.runMarketResearch();
        break;
      }

      case 'architecture': {
        const research = project.settings?.market_research;
        if (!research) throw new Error('Market research not found');
        await orchestrator.runSiteArchitecture(research);
        break;
      }

      case 'content': {
        // Build content for all draft pages
        const pages = await getPagesByProjectId(project_id);
        const draftPages = pages.filter(p => p.status === 'draft');

        for (const page of draftPages) {
          await orchestrator.buildPageContent(page.id);

          // Update job progress
          await job.updateProgress({
            current: draftPages.indexOf(page) + 1,
            total: draftPages.length,
            currentPage: page.slug,
          });
        }
        break;
      }

      case 'elementor': {
        // Elementor data is built as part of page building
        // This phase can be used for additional layout optimization
        log.info({ projectId: project_id }, 'Elementor phase - layouts already built');
        break;
      }

      case 'linking': {
        // Internal linking is done during content building
        // This phase can be used for link optimization
        log.info({ projectId: project_id }, 'Linking phase - links already added');
        break;
      }

      default:
        throw new Error(`Unknown build phase: ${phase}`);
    }

    log.info({ jobId: job.id, projectId: project_id, phase }, 'Build job completed');

    return { success: true, phase, project_id };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log.error({ jobId: job.id, projectId: project_id, phase, error: errorMessage }, 'Build job failed');

    // Update project status
    await supabaseAdmin
      .from('projects')
      .update({ status: 'error' })
      .eq('id', project_id);

    throw error;
  }
}

export function startBuildWorker() {
  const worker = new Worker<BuildJob>('build', processBuildJob, {
    connection: redis,
    concurrency: 2,
    limiter: {
      max: 10,
      duration: 60000, // 10 jobs per minute
    },
  });

  worker.on('completed', (job) => {
    log.info({ jobId: job.id }, 'Build worker: job completed');
  });

  worker.on('failed', (job, error) => {
    log.error({ jobId: job?.id, error: error.message }, 'Build worker: job failed');
  });

  worker.on('error', (error) => {
    log.error({ error: error.message }, 'Build worker error');
  });

  log.info('Build worker started');

  return worker;
}
