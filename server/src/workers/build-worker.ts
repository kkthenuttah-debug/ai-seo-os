import { Worker, Job } from 'bullmq';
import { getWorkerOptions } from '../queues/config.js';
import { logger } from '../lib/logger.js';
import { createOrchestrator } from '../services/orchestrator.js';
import { supabaseAdmin, getProjectById, getPagesByProjectId } from '../lib/supabase.js';
import { redis } from '../lib/redis.js';
import { scheduleBuildJob, schedulePublishJob } from '../queues/index.js';
import type { BuildJob } from '../types/index.js';

const log = logger.child({ worker: 'build' });

const CONTENT_PENDING_KEY = (projectId: string) => `build:content_pending:${projectId}`;

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
        let research = project.settings?.market_research;
        if (!research) {
          const { data: run } = await supabaseAdmin
            .from('agent_runs')
            .select('output')
            .eq('project_id', project_id)
            .eq('agent_type', 'market_research')
            .eq('status', 'completed')
            .order('completed_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          research = run?.output ?? null;
        }
        if (!research) throw new Error('Market research not found');
        await orchestrator.runSiteArchitecture(research);
        break;
      }

      case 'content': {
        const pages = await getPagesByProjectId(project_id);
        const draftPages = pages.filter(p => p.status === 'draft');

        if (page_id) {
          await orchestrator.buildPageContent(page_id);
          const remaining = await redis.decr(CONTENT_PENDING_KEY(project_id));
          if (remaining === 0) {
            await redis.del(CONTENT_PENDING_KEY(project_id));
            log.info({ projectId: project_id }, 'All content jobs completed; scheduling Publisher (per spec)');
            const readyPages = (await getPagesByProjectId(project_id)).filter(p => p.status === 'ready');
            for (let i = 0; i < readyPages.length; i++) {
              await schedulePublishJob(
                { project_id, page_id: readyPages[i].id },
                { delay: 2000 + i * 5000 }
              );
            }
          }
        } else {
          // Fan-out: enqueue one job per page so workers process in parallel
          if (draftPages.length === 0) {
            log.info({ projectId: project_id }, 'No draft pages to build');
            break;
          }
          await redis.set(CONTENT_PENDING_KEY(project_id), draftPages.length);
          for (let i = 0; i < draftPages.length; i++) {
            const page = draftPages[i];
            await scheduleBuildJob(
              { project_id, phase: 'content', page_id: page.id },
              { priority: page.slug === 'home' ? 1 : 2 }
            );
          }
          log.info({ projectId: project_id, pageCount: draftPages.length }, 'Content phase fanned out to parallel jobs');
        }
        break;
      }

      case 'elementor': {
        log.info({ projectId: project_id }, 'Elementor phase - layouts built in content phase');
        break;
      }

      case 'linking': {
        log.info({ projectId: project_id }, 'Linking phase - internal links applied in content phase');
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
  const worker = new Worker<BuildJob>('build', processBuildJob, getWorkerOptions('build'));

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
