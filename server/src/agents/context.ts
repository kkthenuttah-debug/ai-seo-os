import type { SupabaseClient } from '@supabase/supabase-js';
import { nanoid } from 'nanoid';
import type { AgentType } from '../types/index.js';

export interface AgentContext {
  projectId: string;
  correlationId: string;
  userId: string;
  retryCount: number;
  startTime: number;
  metadata?: Record<string, unknown>;
}

export interface AgentExecutionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  runId: string;
  duration: number;
  tokensUsed: number;
  cost: number;
  model: string;
}

export interface AgentRunMetrics {
  agentType: AgentType;
  projectId: string;
  runId: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'retrying';
  tokensUsed: number;
  cost: number;
  model: string;
  retryCount: number;
  error?: string;
}

export class AgentContextBuilder {
  private context: Partial<AgentContext> = {};

  withProjectId(projectId: string): this {
    this.context.projectId = projectId;
    return this;
  }

  withUserId(userId: string): this {
    this.context.userId = userId;
    return this;
  }

  withCorrelationId(correlationId?: string): this {
    this.context.correlationId = correlationId || nanoid();
    return this;
  }

  withRetryCount(retryCount: number): this {
    this.context.retryCount = retryCount;
    return this;
  }

  withMetadata(metadata: Record<string, unknown>): this {
    this.context.metadata = metadata;
    return this;
  }

  build(): AgentContext {
    if (!this.context.projectId) {
      throw new Error('projectId is required');
    }
    if (!this.context.userId) {
      throw new Error('userId is required');
    }

    return {
      projectId: this.context.projectId,
      correlationId: this.context.correlationId || nanoid(),
      userId: this.context.userId,
      retryCount: this.context.retryCount || 0,
      startTime: Date.now(),
      metadata: this.context.metadata,
    };
  }
}

export function createAgentContext(
  projectId: string,
  userId: string,
  options?: Partial<AgentContext>,
): AgentContext {
  return new AgentContextBuilder()
    .withProjectId(projectId)
    .withUserId(userId)
    .withCorrelationId(options?.correlationId)
    .withRetryCount(options?.retryCount || 0)
    .withMetadata(options?.metadata || {})
    .build();
}

export class AgentMetricsCollector {
  private metrics: Map<string, AgentRunMetrics> = new Map();

  startRun(
    agentType: AgentType,
    projectId: string,
    runId: string,
  ): void {
    this.metrics.set(runId, {
      agentType,
      projectId,
      runId,
      startTime: Date.now(),
      status: 'running',
      tokensUsed: 0,
      cost: 0,
      model: '',
      retryCount: 0,
    });
  }

  completeRun(
    runId: string,
    data: {
      tokensUsed: number;
      cost: number;
      model: string;
      status: 'completed' | 'failed';
      error?: string;
    },
  ): void {
    const metrics = this.metrics.get(runId);
    if (!metrics) return;

    const endTime = Date.now();
    metrics.endTime = endTime;
    metrics.duration = endTime - metrics.startTime;
    metrics.status = data.status;
    metrics.tokensUsed = data.tokensUsed;
    metrics.cost = data.cost;
    metrics.model = data.model;
    metrics.error = data.error;
  }

  incrementRetry(runId: string): void {
    const metrics = this.metrics.get(runId);
    if (metrics) {
      metrics.retryCount += 1;
      metrics.status = 'retrying';
    }
  }

  getMetrics(runId: string): AgentRunMetrics | undefined {
    return this.metrics.get(runId);
  }

  getAllMetrics(): AgentRunMetrics[] {
    return Array.from(this.metrics.values());
  }

  clearMetrics(runId: string): void {
    this.metrics.delete(runId);
  }

  clearAllMetrics(): void {
    this.metrics.clear();
  }
}

export const metricsCollector = new AgentMetricsCollector();
