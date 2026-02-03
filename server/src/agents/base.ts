import { z } from 'zod';
import { callGeminiWithRetry, parseJsonResponse, getModelForAgent } from '../lib/gemini.js';
import { createAgentRun, updateAgentRun, createLog } from '../lib/supabase.js';
import { logger } from '../lib/logger.js';
import type { AgentType, AgentRunStatus } from '../types/index.js';

export interface AgentConfig<TInput, TOutput> {
  type: AgentType;
  name: string;
  description: string;
  systemPrompt: string;
  inputSchema: z.ZodSchema<TInput>;
  outputSchema: z.ZodSchema<TOutput>;
  maxTokens?: number;
  temperature?: number;
}

export abstract class BaseAgent<TInput, TOutput> {
  protected config: AgentConfig<TInput, TOutput>;
  protected log: ReturnType<typeof logger.child>;

  constructor(config: AgentConfig<TInput, TOutput>) {
    this.config = config;
    this.log = logger.child({ agent: config.type });
  }

  async run(projectId: string, input: TInput): Promise<TOutput> {
    // Validate input
    const validatedInput = this.config.inputSchema.parse(input);

    // Create agent run record
    const agentRun = await createAgentRun({
      project_id: projectId,
      agent_type: this.config.type,
      status: 'running',
      input: validatedInput as object,
      model_used: getModelForAgent(this.config.type),
    });

    const startTime = Date.now();

    try {
      this.log.info({ runId: agentRun.id, projectId }, 'Agent run started');

      // Build the user prompt
      const userPrompt = this.buildUserPrompt(validatedInput);

      // Call Gemini
      const response = await callGeminiWithRetry({
        agentType: this.config.type,
        systemPrompt: this.config.systemPrompt,
        userPrompt,
        maxTokens: this.config.maxTokens,
        temperature: this.config.temperature,
      });

      // Parse and validate output
      const rawOutput = parseJsonResponse<TOutput>(response.content);
      const validatedOutput = this.config.outputSchema.parse(rawOutput);

      // Update agent run
      const duration = Date.now() - startTime;
      await updateAgentRun(agentRun.id, {
        status: 'completed',
        output: validatedOutput as object,
        tokens_used: response.tokensUsed,
        duration_ms: duration,
        completed_at: new Date().toISOString(),
      });

      await createLog({
        project_id: projectId,
        agent_run_id: agentRun.id,
        level: 'info',
        message: `${this.config.name} completed successfully`,
        data: { duration, tokensUsed: response.tokensUsed },
      });

      this.log.info({ runId: agentRun.id, duration }, 'Agent run completed');

      return validatedOutput;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const duration = Date.now() - startTime;

      await updateAgentRun(agentRun.id, {
        status: 'failed',
        error: errorMessage,
        duration_ms: duration,
        completed_at: new Date().toISOString(),
      });

      await createLog({
        project_id: projectId,
        agent_run_id: agentRun.id,
        level: 'error',
        message: `${this.config.name} failed`,
        data: { error: errorMessage, duration },
      });

      this.log.error({ runId: agentRun.id, error: errorMessage }, 'Agent run failed');

      throw error;
    }
  }

  protected abstract buildUserPrompt(input: TInput): string;

  getConfig() {
    return this.config;
  }
}
