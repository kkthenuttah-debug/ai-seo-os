import { z } from 'zod';
import { nanoid } from 'nanoid';
import { jsonEnforcer } from './jsonEnforcer.js';
import { createAgentRun, updateAgentRun, createLog } from '../lib/supabase.js';
import { logger } from '../lib/logger.js';
import { metricsCollector } from './context.js';
import type { AgentType, AgentRunStatus } from '../types/index.js';
import type { AgentConfig, AgentRunOptions } from './types/agents.js';

export { type AgentConfig } from './types/agents.js';

export abstract class BaseAgent<TInput, TOutput> {
  protected config: AgentConfig<TInput, TOutput>;
  protected log: ReturnType<typeof logger.child>;

  constructor(config: AgentConfig<TInput, TOutput>) {
    this.config = config;
    this.log = logger.child({ agent: config.type });
  }

  async run(projectId: string, input: TInput, options?: Partial<AgentRunOptions>): Promise<TOutput> {
    const runId = nanoid();
    const correlationId = options?.correlationId || nanoid();
    let agentRun: { id: string } | null = null;

    this.log.info({
      runId,
      correlationId,
      projectId,
    }, 'Agent run started');

    try {
      const validatedInput = this.config.inputSchema.parse(input);

      agentRun = await createAgentRun({
        project_id: projectId,
        agent_type: this.config.type,
        status: 'running' as AgentRunStatus,
        input: validatedInput as object,
        model_used: '',
      });

      metricsCollector.startRun(this.config.type, projectId, runId);

      const startTime = Date.now();

      const userPrompt = this.buildUserPrompt(validatedInput);

      const rawOutput = await jsonEnforcer.enforceJson<TOutput>({
        agentType: this.config.type,
        systemPrompt: this.config.systemPrompt,
        userPrompt,
        maxTokens: this.config.maxTokens,
        temperature: this.config.temperature,
        timeoutMs: this.config.timeout,
        maxRetries: 3,
      });

      const validatedOutput = this.config.outputSchema.parse(rawOutput);

      const duration = Date.now() - startTime;
      const metrics = metricsCollector.getMetrics(runId);

      await updateAgentRun(agentRun!.id, {
        status: 'completed' as AgentRunStatus,
        output: validatedOutput as object,
        tokens_used: metrics?.tokensUsed || 0,
        duration_ms: duration,
        completed_at: new Date().toISOString(),
      });

      metricsCollector.completeRun(runId, {
        tokensUsed: metrics?.tokensUsed || 0,
        cost: metrics?.cost || 0,
        model: metrics?.model || '',
        status: 'completed',
      });

      await createLog({
        project_id: projectId,
        agent_run_id: agentRun.id,
        level: 'info',
        message: `${this.config.name} completed successfully`,
        data: {
          duration,
          tokensUsed: metrics?.tokensUsed || 0,
          cost: metrics?.cost || 0,
          correlationId,
        },
      });

      this.log.info({
        runId,
        duration,
        tokensUsed: metrics?.tokensUsed || 0,
      }, 'Agent run completed');

      return validatedOutput;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const duration = Date.now() - Date.now();

      this.log.error({
        runId,
        error: errorMessage,
        correlationId,
      }, 'Agent run failed');

      try {
        if (agentRun?.id) {
          await updateAgentRun(agentRun.id, {
            status: 'failed' as AgentRunStatus,
            error: errorMessage,
            duration_ms: duration,
            completed_at: new Date().toISOString(),
          });

          await createLog({
            project_id: projectId,
            agent_run_id: agentRun.id,
            level: 'error',
            message: `${this.config.name} failed`,
            data: { error: errorMessage, correlationId },
          });
        }
        metricsCollector.completeRun(runId, {
          tokensUsed: 0,
          cost: 0,
          model: '',
          status: 'failed',
          error: errorMessage,
        });
      } catch (updateError) {
        this.log.error({
          error: updateError,
          originalError: errorMessage,
        }, 'Failed to update agent run status');
      }

      throw error;
    }
  }

  async runWithRetry(
    projectId: string,
    input: TInput,
    maxRetries = 3,
    options?: Partial<AgentRunOptions>,
  ): Promise<TOutput> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await this.run(projectId, input, {
          ...options,
          retryCount: attempt,
        });
      } catch (error) {
        lastError = error as Error;
        
        this.log.warn({
          attempt,
          error: lastError.message,
          projectId,
        }, 'Agent run failed, retrying');

        if (attempt < maxRetries - 1) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    this.log.error({
      maxRetries,
      projectId,
    }, 'Agent run failed after all retries');

    throw lastError || new Error('Agent run failed after all retries');
  }

  validateInput(input: unknown): TInput {
    return this.config.inputSchema.parse(input);
  }

  validateOutput(output: unknown): TOutput {
    return this.config.outputSchema.parse(output);
  }

  protected abstract buildUserPrompt(input: TInput): string;

  getConfig(): AgentConfig<TInput, TOutput> {
    return this.config;
  }

  getName(): string {
    return this.config.name;
  }

  getType(): AgentType {
    return this.config.type;
  }

  getDescription(): string {
    return this.config.description;
  }
}
