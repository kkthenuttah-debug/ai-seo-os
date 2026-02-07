import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { supabaseAdmin } from '../lib/supabase.js';
import { authenticate, verifyProjectOwnership } from '../middleware/auth.js';
import { AppError, NotFoundError, ValidationError } from '../utils/errors.js';
import { agentTaskQueue } from '../queues/index.js';
import { logger } from '../lib/logger.js';
import { retryFailedTasks } from '../services/jobOrchestrator.js';

const log = logger.child({ service: 'agentRoutes' });

const listAgentRunsSchema = z.object({
  status: z.enum(['pending', 'running', 'completed', 'failed']).optional(),
  agentType: z.enum([
    'market_research',
    'site_arch',
    'internal_linker',
    'elementor_builder',
    'content_builder',
    'page_builder',
    'fixer',
    'technical_seo',
    'monitor',
    'optimizer',
    'publisher',
  ]).optional(),
  limit: z.coerce.number().int().positive().max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  sort: z.enum(['created_at', 'updated_at', 'duration_ms']).default('created_at'),
});

export async function agentsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);

  app.get(
    '/projects/:projectId/agent-runs',
    { preHandler: [verifyProjectOwnership] },
    async (request) => {
      const { projectId } = request.params as { projectId: string };
      const { status, agentType, limit, offset, sort } = listAgentRunsSchema.parse(request.query);

      let query = supabaseAdmin
        .from('agent_runs')
        .select('*', { count: 'exact' })
        .eq('project_id', projectId)
        .range(offset, offset + limit - 1)
        .order(sort, { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      if (agentType) {
        query = query.eq('agent_type', agentType);
      }

      const { data, count, error } = await query;
      if (error) throw new AppError(error.message ?? 'Failed to load agent runs', 503, 'SERVICE_UNAVAILABLE');

      return {
        agentRuns: data,
        total: count || 0,
        limit,
        offset,
      };
    }
  );

  app.post(
    '/projects/:projectId/agent-runs/retry-failed',
    { preHandler: [verifyProjectOwnership] },
    async (request) => {
      const { projectId } = request.params as { projectId: string };
      await retryFailedTasks(projectId);
      return { success: true, message: 'Failed agent runs scheduled for retry' };
    }
  );

  const listMonitorRunsSchema = z.object({
    limit: z.coerce.number().int().positive().max(100).default(20),
    offset: z.coerce.number().int().min(0).default(0),
  });

  app.get(
    '/projects/:projectId/monitor-runs',
    { preHandler: [verifyProjectOwnership] },
    async (request) => {
      const { projectId } = request.params as { projectId: string };
      const { limit, offset } = listMonitorRunsSchema.parse(request.query);

      const { data, error } = await supabaseAdmin
        .from('monitor_runs')
        .select('id, project_id, health_score, result, created_at')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw new AppError(error.message ?? 'Failed to load monitor runs', 503, 'SERVICE_UNAVAILABLE');

      return {
        monitorRuns: (data ?? []).map((row: { id: string; project_id: string; health_score: number | null; result: unknown; created_at: string }) => ({
          id: row.id,
          projectId: row.project_id,
          healthScore: row.health_score,
          result: row.result,
          createdAt: row.created_at,
        })),
        limit,
        offset,
      };
    }
  );

  app.get(
    '/projects/:projectId/monitor-runs/:runId',
    { preHandler: [verifyProjectOwnership] },
    async (request) => {
      const { projectId, runId } = request.params as { projectId: string; runId: string };

      const { data: run, error } = await supabaseAdmin
        .from('monitor_runs')
        .select('*')
        .eq('id', runId)
        .eq('project_id', projectId)
        .single();

      if (error) throw new AppError(error.message ?? 'Failed to load monitor run', 503, 'SERVICE_UNAVAILABLE');
      if (!run) throw new NotFoundError('Monitor run not found');

      return {
        id: run.id,
        projectId: run.project_id,
        healthScore: run.health_score,
        result: run.result,
        createdAt: run.created_at,
      };
    }
  );

  app.get(
    '/projects/:projectId/agent-runs/:runId',
    { preHandler: [verifyProjectOwnership] },
    async (request) => {
      const { projectId, runId } = request.params as { projectId: string; runId: string };

      const { data: run, error } = await supabaseAdmin
        .from('agent_runs')
        .select('*')
        .eq('id', runId)
        .eq('project_id', projectId)
        .single();

      if (error) throw new AppError(error.message ?? 'Failed to load agent run', 503, 'SERVICE_UNAVAILABLE');
      if (!run) throw new NotFoundError('Agent run not found');

      return {
        id: run.id,
        projectId: run.project_id,
        agentType: run.agent_type,
        status: run.status,
        input: run.input,
        output: run.output,
        errorMessage: run.error_message,
        modelUsed: run.model_used,
        tokensUsed: run.tokens_used,
        durationMs: run.duration_ms,
        retryCount: run.retry_count,
        createdAt: run.created_at,
        updatedAt: run.updated_at,
        completedAt: run.completed_at,
      };
    }
  );

  app.post(
    '/projects/:projectId/agent-runs/:runId/retry',
    { preHandler: [verifyProjectOwnership] },
    async (request) => {
      const { projectId, runId } = request.params as { projectId: string; runId: string };

      // Get original agent run
      const { data: originalRun, error: fetchError } = await supabaseAdmin
        .from('agent_runs')
        .select('*')
        .eq('id', runId)
        .eq('project_id', projectId)
        .single();

      if (fetchError) throw new AppError(fetchError.message ?? 'Failed to load agent run', 503, 'SERVICE_UNAVAILABLE');
      if (!originalRun) throw new NotFoundError('Agent run not found');

      if (originalRun.status === 'running') {
        throw new ValidationError('Cannot retry a running agent run');
      }

      // Create new agent run with same input
      const { data: newRun, error: insertError } = await supabaseAdmin
        .from('agent_runs')
        .insert({
          project_id: projectId,
          agent_type: originalRun.agent_type,
          status: 'pending',
          input: originalRun.input,
          output: {},
          error_message: null,
          model_used: originalRun.model_used,
          tokens_used: 0,
          duration_ms: null,
          retry_count: originalRun.retry_count + 1,
        })
        .select()
        .single();

      if (insertError) throw new AppError(insertError.message ?? 'Failed to create retry run', 503, 'SERVICE_UNAVAILABLE');

      // Add job to queue
      try {
        await agentTaskQueue.add(
          `${originalRun.agent_type}-${newRun.id}`,
          {
            projectId,
            agentType: originalRun.agent_type,
            input: originalRun.input,
            runId: newRun.id,
          },
          {
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 5000,
            },
          }
        );

        log.info({ originalRunId: runId, newRunId: newRun.id }, 'Agent run retry queued');
      } catch (queueError) {
        log.error({ error: queueError }, 'Failed to queue retry job');
        throw new ValidationError('Failed to queue retry job');
      }

      return newRun;
    }
  );

  app.get(
    '/projects/:projectId/agent-runs/queue-status',
    { preHandler: [verifyProjectOwnership] },
    async (request) => {
      const { projectId } = request.params as { projectId: string };

      const emptyResponse = () => ({
        queueName: 'agent-tasks',
        isPaused: false,
        jobs: { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 },
        currentJobs: [] as Array<{ id: string; agentType: string; runId?: string; progress?: number; madeProgress?: boolean; processedOn?: number }>,
        workerHealth: { isRunning: false, activeCount: 0 },
      });

      try {
        const isPaused = await agentTaskQueue.isPaused();
        const [activeJobs, waitingJobs, delayedJobs, completedRes, failedRes] = await Promise.all([
          agentTaskQueue.getActive(),
          agentTaskQueue.getWaiting(),
          agentTaskQueue.getDelayed(),
          supabaseAdmin.from('agent_runs').select('id', { count: 'exact', head: true }).eq('project_id', projectId).eq('status', 'completed'),
          supabaseAdmin.from('agent_runs').select('id', { count: 'exact', head: true }).eq('project_id', projectId).eq('status', 'failed'),
        ]);

        const completedCount = (completedRes as { count?: number | null })?.count ?? 0;
        const failedCount = (failedRes as { count?: number | null })?.count ?? 0;
        const projectActiveJobs = activeJobs.filter((job: { data?: { project_id?: string } }) => job.data?.project_id === projectId);
        const projectWaitingCount = waitingJobs.filter((job: { data?: { project_id?: string } }) => job.data?.project_id === projectId).length;
        const projectDelayedCount = delayedJobs.filter((job: { data?: { project_id?: string } }) => job.data?.project_id === projectId).length;

        return {
          queueName: 'agent-tasks',
          isPaused,
          jobs: {
            waiting: projectWaitingCount,
            active: projectActiveJobs.length,
            completed: completedCount,
            failed: failedCount,
            delayed: projectDelayedCount,
          },
          currentJobs: projectActiveJobs.map((job: { id: string; data?: { agent_type?: string; runId?: string }; progress?: number; madeProgress?: boolean; processedOn?: number }) => ({
            id: job.id,
            agentType: job.data?.agent_type ?? 'unknown',
            runId: job.data?.runId,
            progress: job.progress,
            madeProgress: job.madeProgress,
            processedOn: job.processedOn,
          })),
          workerHealth: {
            isRunning: true,
            activeCount: projectActiveJobs.length,
          },
        };
      } catch (err) {
        log.warn({ err, projectId }, 'Queue status unavailable (Redis/queue or DB error)');
        return emptyResponse();
      }
    }
  );

  app.post(
    '/projects/:projectId/agent-runs/:runId/cancel',
    { preHandler: [verifyProjectOwnership] },
    async (request) => {
      const { projectId, runId } = request.params as { projectId: string; runId: string };

      // Get agent run
      const { data: run, error: fetchError } = await supabaseAdmin
        .from('agent_runs')
        .select('*')
        .eq('id', runId)
        .eq('project_id', projectId)
        .single();

      if (fetchError) throw new AppError(fetchError.message ?? 'Failed to load agent run', 503, 'SERVICE_UNAVAILABLE');
      if (!run) throw new NotFoundError('Agent run not found');

      if (run.status !== 'running' && run.status !== 'pending') {
        throw new ValidationError('Can only cancel pending or running agent runs');
      }

      // Find and cancel job in queue
      const jobs = await agentTaskQueue.getJobs(['pending', 'active', 'delayed']);
      const job = jobs.find(j => j.data.runId === runId);

      if (job) {
        try {
          await job.remove();
          log.info({ runId }, 'Agent run job removed from queue');
        } catch (removeError) {
          log.error({ error: removeError, runId }, 'Failed to remove job from queue');
        }
      }

      // Update agent run status
      const { data: updatedRun, error: updateError } = await supabaseAdmin
        .from('agent_runs')
        .update({
          status: 'cancelled',
          error_message: 'Cancelled by user',
          completed_at: new Date().toISOString(),
        })
        .eq('id', runId)
        .select()
        .single();

      if (updateError) throw new AppError(updateError.message ?? 'Failed to update agent run', 503, 'SERVICE_UNAVAILABLE');

      return {
        success: true,
        run: updatedRun,
      };
    }
  );

  app.get(
    '/projects/:projectId/agent-runs/stats',
    { preHandler: [verifyProjectOwnership] },
    async (request) => {
      const { projectId } = request.params as { projectId: string };

      // Get all agent runs for project
      const { data: runs, error } = await supabaseAdmin
        .from('agent_runs')
        .select('*')
        .eq('project_id', projectId);

      if (error) throw new AppError(error.message ?? 'Failed to load agent stats', 503, 'SERVICE_UNAVAILABLE');

      const agentStats = new Map<string, {
        totalRuns: number;
        successCount: number;
        failureCount: number;
        totalDuration: number;
        totalTokens: number;
      }>();

      for (const run of runs || []) {
        const agentType = run.agent_type;
        if (!agentStats.has(agentType)) {
          agentStats.set(agentType, {
            totalRuns: 0,
            successCount: 0,
            failureCount: 0,
            totalDuration: 0,
            totalTokens: 0,
          });
        }

        const stats = agentStats.get(agentType)!;
        stats.totalRuns++;
        stats.totalDuration += run.duration_ms || 0;
        stats.totalTokens += run.tokens_used || 0;

        if (run.status === 'completed') {
          stats.successCount++;
        } else if (run.status === 'failed' || run.status === 'cancelled') {
          stats.failureCount++;
        }
      }

      const result = Array.from(agentStats.entries()).map(([agentType, stats]) => ({
        agentType,
        totalRuns: stats.totalRuns,
        successCount: stats.successCount,
        failureCount: stats.failureCount,
        successRate: stats.totalRuns > 0 ? stats.successCount / stats.totalRuns : 0,
        avgDuration: stats.totalRuns > 0 ? stats.totalDuration / stats.totalRuns : 0,
        avgTokens: stats.totalRuns > 0 ? stats.totalTokens / stats.totalRuns : 0,
      }));

      return {
        stats: result,
        summary: {
          totalRuns: (runs || []).length,
          totalSuccess: result.reduce((sum, r) => sum + r.successCount, 0),
          totalFailure: result.reduce((sum, r) => sum + r.failureCount, 0),
          overallSuccessRate: (runs || []).length > 0 
            ? result.reduce((sum, r) => sum + r.successCount, 0) / (runs || []).length 
            : 0,
        },
      };
    }
  );
}
