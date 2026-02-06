import { logger } from '../lib/logger.js';
import { nanoid } from 'nanoid';
import { getAgent } from './index.js';
import { createAgentContext, metricsCollector, type AgentContext } from './context.js';
import type { AgentType } from '../types/index.js';
import type { BaseAgent } from './base.js';

export interface OrchestratorOptions {
  projectId: string;
  userId: string;
  correlationId?: string;
  retryOnFailure?: boolean;
  maxRetries?: number;
}

export interface ExecutionStep<TInput = any, TOutput = any> {
  agentType: AgentType;
  input: TInput | ((context: ExecutionContext) => TInput | Promise<TInput>);
  onSuccess?: (output: TOutput, context: ExecutionContext) => void | Promise<void>;
  onError?: (error: Error, context: ExecutionContext) => void | Promise<void>;
  retryable?: boolean;
}

export interface ExecutionContext {
  projectId: string;
  userId: string;
  correlationId: string;
  results: Map<AgentType, any>;
  metadata: Record<string, unknown>;
}

export interface OrchestratorResult {
  success: boolean;
  executedAgents: AgentType[];
  results: Map<AgentType, any>;
  errors: Array<{ agentType: AgentType; error: string }>;
  duration: number;
  totalCost: number;
  totalTokens: number;
}

export class AgentOrchestrator {
  private steps: ExecutionStep[] = [];
  private context: ExecutionContext;
  private options: OrchestratorOptions;
  private log: ReturnType<typeof logger.child>;

  constructor(options: OrchestratorOptions) {
    this.options = {
      retryOnFailure: true,
      maxRetries: 3,
      ...options,
    };

    this.context = {
      projectId: options.projectId,
      userId: options.userId,
      correlationId: options.correlationId || nanoid(),
      results: new Map(),
      metadata: {},
    };

    this.log = logger.child({
      correlationId: this.context.correlationId,
      projectId: options.projectId,
    });
  }

  addStep<TInput, TOutput>(step: ExecutionStep<TInput, TOutput>): this {
    this.steps.push(step);
    return this;
  }

  getResult<T>(agentType: AgentType): T | undefined {
    return this.context.results.get(agentType) as T | undefined;
  }

  setMetadata(key: string, value: unknown): this {
    this.context.metadata[key] = value;
    return this;
  }

  async execute(): Promise<OrchestratorResult> {
    const startTime = Date.now();
    const executedAgents: AgentType[] = [];
    const errors: Array<{ agentType: AgentType; error: string }> = [];

    this.log.info({
      stepsCount: this.steps.length,
      projectId: this.options.projectId,
    }, 'Orchestrator execution started');

    for (let i = 0; i < this.steps.length; i++) {
      const step = this.steps[i];
      
      try {
        this.log.info({ agentType: step.agentType, stepIndex: i }, 'Executing agent step');

        const agent = getAgent(step.agentType);
        
        let input: any;
        if (typeof step.input === 'function') {
          input = await step.input(this.context);
        } else {
          input = step.input;
        }

        let output: any;
        const retryable = step.retryable ?? this.options.retryOnFailure ?? true;

        if (retryable) {
          output = await this.executeWithRetry(
            agent,
            step.agentType,
            input,
            this.options.maxRetries!,
          );
        } else {
          output = await agent.run(this.options.projectId, input, {
            correlationId: this.context.correlationId,
            userId: this.options.userId,
          });
        }

        this.context.results.set(step.agentType, output);
        executedAgents.push(step.agentType);

        if (step.onSuccess) {
          await step.onSuccess(output, this.context);
        }

        this.log.info({ agentType: step.agentType }, 'Agent step completed');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        this.log.error({
          agentType: step.agentType,
          error: errorMessage,
        }, 'Agent step failed');

        errors.push({
          agentType: step.agentType,
          error: errorMessage,
        });

        if (step.onError) {
          await step.onError(error as Error, this.context);
        }

        break;
      }
    }

    const duration = Date.now() - startTime;
    const allMetrics = metricsCollector.getAllMetrics();
    const totalTokens = allMetrics.reduce((sum, m) => sum + m.tokensUsed, 0);
    const totalCost = allMetrics.reduce((sum, m) => sum + m.cost, 0);

    const success = errors.length === 0;

    this.log.info({
      success,
      duration,
      executedAgents: executedAgents.length,
      errors: errors.length,
      totalTokens,
      totalCost,
    }, 'Orchestrator execution completed');

    return {
      success,
      executedAgents,
      results: this.context.results,
      errors,
      duration,
      totalCost,
      totalTokens,
    };
  }

  private async executeWithRetry(
    agent: any,
    agentType: AgentType,
    input: any,
    maxRetries: number,
  ): Promise<any> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await agent.run(this.options.projectId, input, {
          correlationId: this.context.correlationId,
          userId: this.options.userId,
          retryCount: attempt,
        });
      } catch (error) {
        lastError = error as Error;
        
        this.log.warn({
          agentType,
          attempt,
          error: lastError.message,
        }, 'Agent execution failed, retrying');

        if (attempt < maxRetries - 1) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error(`Agent ${agentType} failed after ${maxRetries} retries`);
  }

  async executeParallel<T>(
    agentTypes: AgentType[],
    inputFn: (agentType: AgentType) => T,
  ): Promise<Map<AgentType, any>> {
    this.log.info({ agentCount: agentTypes.length }, 'Executing agents in parallel');

    const promises = agentTypes.map(async (agentType) => {
      const agent = getAgent(agentType);
      const input = inputFn(agentType);
      
      try {
        const output = await agent.run(this.options.projectId, input, {
          correlationId: this.context.correlationId,
          userId: this.options.userId,
        });
        
        return { agentType, output, error: null };
      } catch (error) {
        this.log.error({ agentType, error }, 'Parallel agent execution failed');
        return {
          agentType,
          output: null,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    });

    const results = await Promise.all(promises);
    const resultMap = new Map<AgentType, any>();

    for (const result of results) {
      if (result.output) {
        resultMap.set(result.agentType, result.output);
        this.context.results.set(result.agentType, result.output);
      }
    }

    return resultMap;
  }
}

export function createOrchestrator(options: OrchestratorOptions): AgentOrchestrator {
  return new AgentOrchestrator(options);
}

export async function executeMarketResearchPhase(
  projectId: string,
  userId: string,
  input: { niche: string; targetAudience: string; domain: string },
): Promise<any> {
  const orchestrator = createOrchestrator({ projectId, userId });

  orchestrator
    .addStep({
      agentType: 'market_research',
      input: {
        niche: input.niche,
        target_audience: input.targetAudience,
      },
    })
    .addStep({
      agentType: 'site_architect',
      input: (ctx) => ({
        niche: input.niche,
        target_audience: input.targetAudience,
        market_research: ctx.results.get('market_research'),
        domain: input.domain,
      }),
    });

  const result = await orchestrator.execute();
  
  if (!result.success) {
    throw new Error(`Market research phase failed: ${result.errors.map(e => e.error).join(', ')}`);
  }

  return {
    marketResearch: result.results.get('market_research'),
    siteArchitecture: result.results.get('site_architect'),
  };
}

export async function executeContentGenerationPhase(
  projectId: string,
  userId: string,
  pageSpecs: Array<{
    title: string;
    slug: string;
    targetKeyword: string;
    contentType: string;
    tone: string;
    wordCount: number;
  }>,
): Promise<any[]> {
  const orchestrator = createOrchestrator({ projectId, userId });

  const pages = [];

  for (const spec of pageSpecs) {
    const output = await orchestrator.executeParallel(
      ['content_builder', 'elementor_builder'],
      (agentType) => {
        if (agentType === 'content_builder') {
          return {
            page_title: spec.title,
            target_keyword: spec.targetKeyword,
            content_type: spec.contentType,
            tone: spec.tone,
            word_count: spec.wordCount,
          };
        } else {
          return {
            pageTitle: spec.title,
            content: '',
            keywords: [spec.targetKeyword],
            contentType: spec.contentType,
          };
        }
      },
    );

    pages.push({
      ...spec,
      content: output.get('content_builder'),
      elementorData: output.get('elementor_builder'),
    });
  }

  return pages;
}
