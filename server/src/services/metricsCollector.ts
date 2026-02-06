import { logger } from '../lib/logger.js';

const log = logger.child({ service: 'metricsCollector' });

interface AgentMetrics {
  agentType: string;
  totalRuns: number;
  successCount: number;
  failureCount: number;
  avgDurationMs: number;
  totalTokens: number;
}

interface ApiMetrics {
  route: string;
  method: string;
  totalCalls: number;
  successCount: number;
  failureCount: number;
  avgDurationMs: number;
  statusCodes: Record<number, number>;
}

interface QueueMetrics {
  queueName: string;
  totalJobs: number;
  successCount: number;
  failureCount: number;
  retriedCount: number;
}

interface SystemHealth {
  healthy: boolean;
  uptime: number;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage: NodeJS.CpuUsage;
  lastCheck: Date;
}

// In-memory metrics storage
const agentMetrics = new Map<string, Partial<AgentMetrics>>();
const apiMetrics = new Map<string, Partial<ApiMetrics>>();
const queueMetrics = new Map<string, Partial<QueueMetrics>>();
const startTime = Date.now();

function getAgentKey(agentType: string): string {
  return `agent:${agentType}`;
}

function getApiKey(route: string, method: string): string {
  return `${method}:${route}`;
}

function getQueueKey(queueName: string): string {
  return `queue:${queueName}`;
}

class MetricsCollector {
  recordAgentExecution(agentType: string, durationMs: number, success: boolean, tokensUsed = 0): void {
    const key = getAgentKey(agentType);
    const existing = agentMetrics.get(key) || {
      agentType,
      totalRuns: 0,
      successCount: 0,
      failureCount: 0,
      avgDurationMs: 0,
      totalTokens: 0,
    };

    const totalRuns = (existing.totalRuns || 0) + 1;
    const successCount = (existing.successCount || 0) + (success ? 1 : 0);
    const failureCount = (existing.failureCount || 0) + (success ? 0 : 1);
    
    // Calculate rolling average
    const totalDuration = (existing.avgDurationMs || 0) * (existing.totalRuns || 0) + durationMs;
    const avgDurationMs = totalDuration / totalRuns;

    agentMetrics.set(key, {
      agentType,
      totalRuns,
      successCount,
      failureCount,
      avgDurationMs: Math.round(avgDurationMs),
      totalTokens: (existing.totalTokens || 0) + tokensUsed,
    });

    log.debug({ agentType, durationMs, success, tokensUsed }, 'Recorded agent execution');
  }

  recordApiCall(route: string, method: string, statusCode: number, durationMs: number): void {
    const key = getApiKey(route, method);
    const existing = apiMetrics.get(key) || {
      route,
      method,
      totalCalls: 0,
      successCount: 0,
      failureCount: 0,
      avgDurationMs: 0,
      statusCodes: {},
    };

    const totalCalls = (existing.totalCalls || 0) + 1;
    const successCount = (existing.successCount || 0) + (statusCode < 400 ? 1 : 0);
    const failureCount = (existing.failureCount || 0) + (statusCode >= 400 ? 1 : 0);
    
    // Calculate rolling average
    const totalDuration = (existing.avgDurationMs || 0) * (existing.totalCalls || 0) + durationMs;
    const avgDurationMs = totalDuration / totalCalls;

    const statusCodes = { ...(existing.statusCodes || {}) };
    statusCodes[statusCode] = (statusCodes[statusCode] || 0) + 1;

    apiMetrics.set(key, {
      route,
      method,
      totalCalls,
      successCount,
      failureCount,
      avgDurationMs: Math.round(avgDurationMs),
      statusCodes,
    });

    log.debug({ route, method, statusCode, durationMs }, 'Recorded API call');
  }

  recordQueueJob(queueName: string, status: 'success' | 'failed' | 'retried'): void {
    const key = getQueueKey(queueName);
    const existing = queueMetrics.get(key) || {
      queueName,
      totalJobs: 0,
      successCount: 0,
      failureCount: 0,
      retriedCount: 0,
    };

    const totalJobs = (existing.totalJobs || 0) + 1;
    const successCount = (existing.successCount || 0) + (status === 'success' ? 1 : 0);
    const failureCount = (existing.failureCount || 0) + (status === 'failed' ? 1 : 0);
    const retriedCount = (existing.retriedCount || 0) + (status === 'retried' ? 1 : 0);

    queueMetrics.set(key, {
      queueName,
      totalJobs,
      successCount,
      failureCount,
      retriedCount,
    });

    log.debug({ queueName, status }, 'Recorded queue job');
  }

  recordWordPressCall(operation: string, success: boolean, durationMs: number): void {
    const key = `wordpress:${operation}`;
    this.recordApiCall('/api/wordpress', operation, success ? 200 : 500, durationMs);
  }

  recordGSCCall(operation: string, success: boolean, durationMs: number): void {
    const key = `gsc:${operation}`;
    this.recordApiCall('/api/gsc', operation, success ? 200 : 500, durationMs);
  }

  getAgentMetrics(agentType: string): AgentMetrics | null {
    const key = getAgentKey(agentType);
    const metrics = agentMetrics.get(key);
    if (!metrics) {
      return null;
    }

    return {
      agentType,
      totalRuns: metrics.totalRuns || 0,
      successCount: metrics.successCount || 0,
      failureCount: metrics.failureCount || 0,
      avgDurationMs: metrics.avgDurationMs || 0,
      totalTokens: metrics.totalTokens || 0,
    };
  }

  getAllAgentMetrics(): AgentMetrics[] {
    return Array.from(agentMetrics.values()).map(m => ({
      agentType: m.agentType || '',
      totalRuns: m.totalRuns || 0,
      successCount: m.successCount || 0,
      failureCount: m.failureCount || 0,
      avgDurationMs: m.avgDurationMs || 0,
      totalTokens: m.totalTokens || 0,
    }));
  }

  getApiMetrics(route: string, method?: string): ApiMetrics[] {
    const results: ApiMetrics[] = [];

    if (method) {
      const key = getApiKey(route, method);
      const metrics = apiMetrics.get(key);
      if (metrics) {
        results.push({
          route,
          method,
          totalCalls: metrics.totalCalls || 0,
          successCount: metrics.successCount || 0,
          failureCount: metrics.failureCount || 0,
          avgDurationMs: metrics.avgDurationMs || 0,
          statusCodes: metrics.statusCodes || {},
        });
      }
    } else {
      for (const [key, metrics] of apiMetrics) {
        if (key.endsWith(route)) {
          results.push({
            route,
            method: metrics.method || '',
            totalCalls: metrics.totalCalls || 0,
            successCount: metrics.successCount || 0,
            failureCount: metrics.failureCount || 0,
            avgDurationMs: metrics.avgDurationMs || 0,
            statusCodes: metrics.statusCodes || {},
          });
        }
      }
    }

    return results;
  }

  getAllApiMetrics(): ApiMetrics[] {
    return Array.from(apiMetrics.values()).map(m => ({
      route: m.route || '',
      method: m.method || '',
      totalCalls: m.totalCalls || 0,
      successCount: m.successCount || 0,
      failureCount: m.failureCount || 0,
      avgDurationMs: m.avgDurationMs || 0,
      statusCodes: m.statusCodes || {},
    }));
  }

  getQueueMetrics(queueName: string): QueueMetrics | null {
    const key = getQueueKey(queueName);
    const metrics = queueMetrics.get(key);
    if (!metrics) {
      return null;
    }

    return {
      queueName,
      totalJobs: metrics.totalJobs || 0,
      successCount: metrics.successCount || 0,
      failureCount: metrics.failureCount || 0,
      retriedCount: metrics.retriedCount || 0,
    };
  }

  getAllQueueMetrics(): QueueMetrics[] {
    return Array.from(queueMetrics.values()).map(m => ({
      queueName: m.queueName || '',
      totalJobs: m.totalJobs || 0,
      successCount: m.successCount || 0,
      failureCount: m.failureCount || 0,
      retriedCount: m.retriedCount || 0,
    }));
  }

  getSystemHealth(): SystemHealth {
    const healthy = true; // Could add more sophisticated checks
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    return {
      healthy,
      uptime: Date.now() - startTime,
      memoryUsage,
      cpuUsage,
      lastCheck: new Date(),
    };
  }

  reset(): void {
    agentMetrics.clear();
    apiMetrics.clear();
    queueMetrics.clear();
    log.info('Metrics reset');
  }
}

export const metricsCollector = new MetricsCollector();
