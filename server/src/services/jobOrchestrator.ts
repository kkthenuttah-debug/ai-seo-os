import { logger } from '../lib/logger.js';
import { supabaseAdmin, getProjectById } from '../lib/supabase.js';
import {
  scheduleAgentTask,
  scheduleAgentTasks,
  scheduleBuildJob,
  schedulePublishJob,
  scheduleMonitorJob,
} from '../queues/index.js';
import type { Project } from '../types/index.js';

const log = logger.child({ service: 'jobOrchestrator' });

// Generate correlation ID
function generateCorrelationId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Start automation loop for a project
export async function startAutomationLoop(projectId: string): Promise<void> {
  log.info({ projectId }, 'Starting automation loop');

  const project = await getProjectById(projectId);
  if (!project) {
    throw new Error('Project not found');
  }

  const correlationId = generateCorrelationId('automation');

  // Update project status
  await supabaseAdmin
    .from('projects')
    .update({ status: 'building' })
    .eq('id', projectId);

  const settings = project.settings && typeof project.settings === 'object' ? project.settings as Record<string, unknown> : {};
  const niche = (settings.niche as string) ?? '';
  const targetAudience = (settings.target_audience as string) ?? '';

  // Phase 1: Enqueue Market Research Agent
  await scheduleAgentTask({
    project_id: projectId,
    agent_type: 'market_research',
    input: {
      niche,
      target_audience: targetAudience,
    },
    correlation_id: `${correlationId}-market-research`,
  });

  log.info({ projectId, correlationId }, 'Automation loop started');
}

// Continue automation after market research
export async function continueAfterMarketResearch(projectId: string, researchResult: any): Promise<void> {
  log.info({ projectId }, 'Continuing after market research');

  const correlationId = generateCorrelationId('post-research');

  // Enqueue Site Architect Agent
  await scheduleAgentTask({
    project_id: projectId,
    agent_type: 'site_architect',
    input: {
      niche: researchResult.niche,
      target_audience: researchResult.target_audience,
      market_research: researchResult,
    },
    correlation_id: `${correlationId}-site-architect`,
  });
}

// Continue automation after site architecture
export async function continueAfterSiteArchitecture(projectId: string, pages: any[]): Promise<void> {
  log.info({ projectId, pageCount: pages.length }, 'Continuing after site architecture');

  // Schedule content building for all pages via build queue
  await scheduleBuildJob({
    project_id: projectId,
    phase: 'content',
  }, { delay: 5000 });
}

// Schedule content building for multiple pages
export async function scheduleContentBuilding(projectId: string, pageIds: string[]): Promise<void> {
  log.info({ projectId, pageCount: pageIds.length }, 'Scheduling content building');

  const correlationId = generateCorrelationId('content-build');

  // Schedule page builder agents for each page
  const tasks = pageIds.map((pageId, index) => ({
    project_id: projectId,
    agent_type: 'page_builder' as const,
    input: {
      pageId,
      buildContent: true,
      buildLayout: true,
    },
    correlation_id: `${correlationId}-page-${index}`,
  }));

  await scheduleAgentTasks(tasks);
}

// Schedule publishing for multiple pages
export async function schedulePublishing(projectId: string, pageIds: string[]): Promise<void> {
  log.info({ projectId, pageCount: pageIds.length }, 'Scheduling publishing');

  // Schedule publish jobs with delays to avoid rate limits
  for (let i = 0; i < pageIds.length; i++) {
    await schedulePublishJob({
      project_id: projectId,
      page_id: pageIds[i],
    }, {
      delay: i * 30000, // 30 seconds between each publish
    });
  }
}

// Start monitoring loop
export async function startMonitoringLoop(projectId: string): Promise<void> {
  log.info({ projectId }, 'Starting monitoring loop');

  // Update project status
  await supabaseAdmin
    .from('projects')
    .update({ status: 'live' })
    .eq('id', projectId);

  // Schedule initial monitoring job
  await scheduleMonitorJob({
    project_id: projectId,
  });

  log.info({ projectId }, 'Monitoring loop started');
}

// Schedule optimization for a page
export async function scheduleOptimization(projectId: string, pageId: string, reason: 'scheduled' | 'performance_drop' | 'manual'): Promise<void> {
  log.info({ projectId, pageId, reason }, 'Scheduling optimization');

  const correlationId = generateCorrelationId('optimization');

  await scheduleAgentTask({
    project_id: projectId,
    agent_type: 'optimizer',
    input: {
      pageId,
      reason,
    },
    correlation_id: correlationId,
  });
}

// Schedule full rebuild
export async function scheduleFullRebuild(projectId: string): Promise<void> {
  log.info({ projectId }, 'Scheduling full rebuild');

  // Update project status
  await supabaseAdmin
    .from('projects')
    .update({ status: 'building' })
    .eq('id', projectId);

  // Start fresh automation loop
  await startAutomationLoop(projectId);
}

// Schedule technical SEO audit
export async function scheduleTechnicalSEOAudit(projectId: string): Promise<void> {
  log.info({ projectId }, 'Scheduling technical SEO audit');

  const correlationId = generateCorrelationId('technical-seo');

  await scheduleAgentTask({
    project_id: projectId,
    agent_type: 'technical_seo',
    input: {
      projectId,
    },
    correlation_id: correlationId,
  });
}

// Schedule fixer agent for issues
export async function scheduleFixer(projectId: string, issues: any[]): Promise<void> {
  log.info({ projectId, issueCount: issues.length }, 'Scheduling fixer agent');

  const correlationId = generateCorrelationId('fixer');

  await scheduleAgentTask({
    project_id: projectId,
    agent_type: 'fixer',
    input: {
      issues,
      autoFix: true,
    },
    correlation_id: correlationId,
  });
}

// Pause project automation
export async function pauseProjectAutomation(projectId: string): Promise<void> {
  log.info({ projectId }, 'Pausing project automation');

  // Update project status
  await supabaseAdmin
    .from('projects')
    .update({ status: 'paused' })
    .eq('id', projectId);

  // Note: Active jobs will complete, but no new jobs will be scheduled
  // Queue pausing is handled separately via queueManager
}

// Resume project automation
export async function resumeProjectAutomation(projectId: string): Promise<void> {
  log.info({ projectId }, 'Resuming project automation');

  const project = await getProjectById(projectId);
  if (!project) {
    throw new Error('Project not found');
  }

  // Update project status based on current state
  let newStatus = 'building';
  if (project.status === 'live' || project.status === 'optimizing') {
    newStatus = 'live';
  }

  await supabaseAdmin
    .from('projects')
    .update({ status: newStatus as any })
    .eq('id', projectId);

  // Reschedule monitoring if project is live
  if (newStatus === 'live') {
    await scheduleMonitorJob({
      projectId,
    });
  }
}

// Get automation status for a project
export async function getAutomationStatus(projectId: string) {
  const project = await getProjectById(projectId);
  if (!project) {
    throw new Error('Project not found');
  }

  // Get recent agent runs
  const { data: agentRuns } = await supabaseAdmin
    .from('agent_runs')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(20);

  return {
    projectId,
    status: project.status,
    lastAgentRun: agentRuns?.[0] || null,
    recentAgentRuns: agentRuns || [],
  };
}

// Retry failed agent tasks
export async function retryFailedTasks(projectId: string): Promise<void> {
  log.info({ projectId }, 'Retrying failed tasks');

  // Get failed agent runs
  const { data: failedRuns } = await supabaseAdmin
    .from('agent_runs')
    .select('*')
    .eq('project_id', projectId)
    .eq('status', 'failed')
    .order('created_at', { ascending: false });

  if (!failedRuns || failedRuns.length === 0) {
    log.info({ projectId }, 'No failed tasks to retry');
    return;
  }

  // Retry each failed task
  for (const run of failedRuns) {
    try {
      await scheduleAgentTask({
        project_id: projectId,
        agent_type: run.agent_type,
        input: run.input,
        correlation_id: generateCorrelationId('retry'),
      });

      log.info({ projectId, agentType: run.agent_type }, 'Scheduled retry');
    } catch (error) {
      log.error({ projectId, agentType: run.agent_type, error }, 'Failed to schedule retry');
    }
  }

  log.info({ projectId, retryCount: failedRuns.length }, 'Failed tasks scheduled for retry');
}
