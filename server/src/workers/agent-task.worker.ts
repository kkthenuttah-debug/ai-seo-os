import { Worker, Job } from 'bullmq';
import { logger } from '../lib/logger.js';
import { getWorkerOptions } from '../queues/config.js';
import {
  marketResearchAgent,
  siteArchitectAgent,
  contentBuilderAgent,
  internalLinkerAgent,
  elementorBuilderAgent,
  pageBuilderAgent,
  publisherAgent,
  optimizerAgent,
  monitorAgent,
  fixerAgent,
  technicalSEOAgent,
} from '../agents/index.js';
import { supabaseAdmin } from '../lib/supabase.js';
import { scheduleBuildJob, schedulePublishJob, scheduleOptimizeJob } from '../queues/index.js';
import type { AgentTaskJob, AgentTaskResult } from '../types/queue.js';
import type { AgentType } from '../types/index.js';

const log = logger.child({ worker: 'agent-task' });

// Agent timeout in milliseconds
const AGENT_TIMEOUT = 5 * 60 * 1000; // 5 minutes

// Agent type mapping
const agentMap = {
  market_research: marketResearchAgent,
  site_architect: siteArchitectAgent,
  content_builder: contentBuilderAgent,
  internal_linker: internalLinkerAgent,
  elementor_builder: elementorBuilderAgent,
  page_builder: pageBuilderAgent,
  publisher: publisherAgent,
  optimizer: optimizerAgent,
  monitor: monitorAgent,
  fixer: fixerAgent,
  technical_seo: technicalSEOAgent,
};

// Process agent task job
async function processAgentTask(job: Job<AgentTaskJob>): Promise<AgentTaskResult> {
  const { project_id, agent_type, input, correlation_id, retry_count } = job.data;
  const startTime = Date.now();

  log.info({
    jobId: job.id,
    projectId: project_id,
    agentType: agent_type,
    correlationId: correlation_id,
    retryCount: retry_count,
  }, 'Processing agent task');

  try {
    // Get agent instance
    const agent = agentMap[agent_type as AgentType];
    if (!agent) {
      throw new Error(`Unknown agent type: ${agent_type}`);
    }

    // Set timeout for agent execution
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Agent timeout after ${AGENT_TIMEOUT}ms`)), AGENT_TIMEOUT);
    });

    // Execute agent with timeout
    const output = await Promise.race([
      agent.run(project_id, input),
      timeoutPromise,
    ]) as Record<string, any>;

    const duration = Date.now() - startTime;

    // Store result in database
    await supabaseAdmin
      .from('agent_runs')
      .update({
        status: 'completed',
        output,
        completed_at: new Date().toISOString(),
      })
      .eq('project_id', project_id)
      .eq('agent_type', agent_type)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    log.info({
      jobId: job.id,
      projectId: project_id,
      agentType: agent_type,
      correlationId: correlation_id,
      duration,
    }, 'Agent task completed successfully');

    // Enqueue next task based on agent type
    await enqueueNextTask(agent_type, project_id, input, correlation_id);

    return {
      success: true,
      agent_type,
      output,
      duration_ms: duration,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    log.error({
      jobId: job.id,
      projectId: project_id,
      agentType: agent_type,
      correlationId: correlation_id,
      error: errorMessage,
      duration,
    }, 'Agent task failed');

    // Store error in database
    await supabaseAdmin
      .from('agent_runs')
      .update({
        status: 'failed',
        error: errorMessage,
        completed_at: new Date().toISOString(),
      })
      .eq('project_id', project_id)
      .eq('agent_type', agent_type)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Update project status if critical agent failed
    const criticalAgents: AgentType[] = ['market_research', 'site_architect'];
    if (criticalAgents.includes(agent_type as AgentType)) {
      await supabaseAdmin
        .from('projects')
        .update({ status: 'error' })
        .eq('id', project_id);
    }

    throw error;
  }
}

// Enqueue next task based on agent result
async function enqueueNextTask(
  agentType: AgentType,
  projectId: string,
  input: Record<string, any>,
  correlationId: string
) {
  switch (agentType) {
    case 'market_research':
      // After market research, schedule site architecture
      await scheduleBuildJob({
        project_id: projectId,
        phase: 'architecture',
      }, { delay: 5000 });
      break;

    case 'site_architect':
      // After site architecture, schedule content building
      await scheduleBuildJob({
        project_id: projectId,
        phase: 'content',
      }, { delay: 10000 });
      break;

    case 'page_builder':
      // After page builder, schedule publishing if page is ready
      if (input.pageId) {
        await schedulePublishJob({
          project_id: projectId,
          page_id: input.pageId,
        }, { delay: 5000 });
      }
      break;

    case 'monitor':
      // Monitor agent might trigger optimization tasks
      // The output is captured earlier in the function and stored in database
      // Optimization candidates will be processed by the orchestrator
      break;

    default:
      // No automatic chaining for other agents
      break;
  }
}

// Start the agent task worker
export function startAgentTaskWorker() {
  const worker = new Worker<AgentTaskJob>(
    'agent-tasks',
    processAgentTask,
    getWorkerOptions('agent-tasks')
  );

  worker.on('completed', (job) => {
    log.info({ jobId: job.id, agentType: job.data.agentType }, 'Agent task worker: job completed');
  });

  worker.on('failed', (job, error) => {
    log.error({
      jobId: job?.id,
      agentType: job?.data.agentType,
      error: error.message,
    }, 'Agent task worker: job failed');
  });

  worker.on('error', (error) => {
    log.error({ error: error.message }, 'Agent task worker error');
  });

  worker.on('stalled', (jobId) => {
    log.warn({ jobId }, 'Agent task worker: job stalled');
  });

  worker.on('progress', (job, progress) => {
    log.debug({ jobId: job.id, progress }, 'Agent task worker: job progress');
  });

  log.info('Agent task worker started');

  return worker;
}
