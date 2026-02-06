import { logger } from '../lib/logger.js';
import { supabaseAdmin } from '../lib/supabase.js';
import { getQueueMetrics } from './queueManager.js';
import { metricsCollector } from './metricsCollector.js';
import { errorTracker } from './errorTracking.js';

const log = logger.child({ service: 'monitoring' });

interface MetricsCollector {
  recordAgentExecution(agentType: string, durationMs: number, success: boolean): void;
  recordApiCall(route: string, method: string, statusCode: number, durationMs: number): void;
  recordQueueJob(queueName: string, status: 'success' | 'failed' | 'retried'): void;
  recordWordPressCall(operation: string, success: boolean, durationMs: number): void;
  recordGSCCall(operation: string, success: boolean, durationMs: number): void;
  
  getAgentMetrics(agentType: string): ReturnType<typeof metricsCollector.getAgentMetrics>;
  getApiMetrics(route: string): ReturnType<typeof metricsCollector.getApiMetrics>;
  getQueueMetrics(queueName: string): ReturnType<typeof metricsCollector.getQueueMetrics>;
  getSystemHealth(): ReturnType<typeof metricsCollector.getSystemHealth>;
}

class MonitoringService implements MetricsCollector {
  recordAgentExecution(agentType: string, durationMs: number, success: boolean): void {
    metricsCollector.recordAgentExecution(agentType, durationMs, success);
  }

  recordApiCall(route: string, method: string, statusCode: number, durationMs: number): void {
    metricsCollector.recordApiCall(route, method, statusCode, durationMs);
  }

  recordQueueJob(queueName: string, status: 'success' | 'failed' | 'retried'): void {
    metricsCollector.recordQueueJob(queueName, status);
  }

  recordWordPressCall(operation: string, success: boolean, durationMs: number): void {
    metricsCollector.recordWordPressCall(operation, success, durationMs);
  }

  recordGSCCall(operation: string, success: boolean, durationMs: number): void {
    metricsCollector.recordGSCCall(operation, success, durationMs);
  }

  getAgentMetrics(agentType: string) {
    return metricsCollector.getAgentMetrics(agentType);
  }

  getApiMetrics(route: string) {
    return metricsCollector.getApiMetrics(route);
  }

  getQueueMetrics(queueName: string) {
    return metricsCollector.getQueueMetrics(queueName);
  }

  getSystemHealth() {
    return metricsCollector.getSystemHealth();
  }

  async getDetailedHealth(): Promise<{
    database: { connected: boolean; latency: number | null };
    redis: { connected: boolean; latency: number | null };
    supabase: { auth: boolean; latency: number | null };
    externalApis: { gemini: boolean; wordpress: boolean };
  }> {
    const startTime = Date.now();

    // Database health check
    let dbLatency: number | null = null;
    let dbConnected = false;
    try {
      const dbStart = Date.now();
      const { error } = await supabaseAdmin.from('projects').select('id').limit(1);
      dbLatency = Date.now() - dbStart;
      dbConnected = !error;
    } catch (error) {
      log.error({ error }, 'Database health check failed');
    }

    // Redis health check (via queue manager)
    let redisLatency: number | null = null;
    let redisConnected = false;
    try {
      const redisStart = Date.now();
      const queueHealth = await getQueueMetrics('agent-tasks');
      redisLatency = Date.now() - redisStart;
      redisConnected = queueHealth !== null;
    } catch (error) {
      log.error({ error }, 'Redis health check failed');
    }

    // Supabase Auth health check
    let authLatency: number | null = null;
    let authWorking = false;
    try {
      const authStart = Date.now();
      const { error } = await supabaseAdmin.auth.getUser();
      authLatency = Date.now() - authStart;
      authWorking = !error || error.message.includes('Auth session missing');
    } catch (error) {
      log.error({ error }, 'Supabase Auth health check failed');
    }

    return {
      database: { connected: dbConnected, latency: dbLatency },
      redis: { connected: redisConnected, latency: redisLatency },
      supabase: { auth: authWorking, latency: authLatency },
      externalApis: {
        gemini: true, // Could add actual health check
        wordpress: true, // Could add actual health check
      },
    };
  }

  async getAggregatedMetrics(): Promise<{
    system: ReturnType<typeof metricsCollector.getSystemHealth>;
    queues: ReturnType<typeof metricsCollector.getAllQueueMetrics>;
    agents: ReturnType<typeof metricsCollector.getAllAgentMetrics>;
    apis: ReturnType<typeof metricsCollector.getAllApiMetrics>;
  }> {
    return {
      system: metricsCollector.getSystemHealth(),
      queues: metricsCollector.getAllQueueMetrics(),
      agents: metricsCollector.getAllAgentMetrics(),
      apis: metricsCollector.getAllApiMetrics(),
    };
  }

  async getPerformanceMetrics(timeRange: '1h' | '24h' | '7d' | '30d' = '24h'): Promise<{
    requestRate: number;
    errorRate: number;
    avgResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
  }> {
    // Calculate based on API metrics
    const apiMetrics = metricsCollector.getAllApiMetrics();
    
    let totalCalls = 0;
    let totalDuration = 0;
    let successCalls = 0;
    const durations: number[] = [];

    for (const metric of apiMetrics) {
      totalCalls += metric.totalCalls;
      totalDuration += metric.avgDurationMs * metric.totalCalls;
      successCalls += metric.successCount;
      
      // Collect durations for percentile calculation (simplified)
      for (let i = 0; i < metric.totalCalls; i++) {
        durations.push(metric.avgDurationMs);
      }
    }

    const requestRate = timeRange === '1h' ? totalCalls / 3600 : 
                        timeRange === '24h' ? totalCalls / 86400 :
                        timeRange === '7d' ? totalCalls / 604800 :
                        totalCalls / 2592000;

    const errorRate = totalCalls > 0 ? (totalCalls - successCalls) / totalCalls : 0;
    const avgResponseTime = totalCalls > 0 ? totalDuration / totalCalls : 0;

    // Calculate percentiles
    durations.sort((a, b) => a - b);
    const p95Index = Math.floor(durations.length * 0.95);
    const p99Index = Math.floor(durations.length * 0.99);
    const p95ResponseTime = durations[p95Index] || 0;
    const p99ResponseTime = durations[p99Index] || 0;

    return {
      requestRate,
      errorRate,
      avgResponseTime,
      p95ResponseTime,
      p99ResponseTime,
    };
  }

  async getProjectHealth(projectId: string): Promise<{
    projectId: string;
    pages: { total: number; published: number; draft: number };
    leads: { total: number; thisWeek: number; thisMonth: number };
    agentRuns: { total: number; failed: number; running: number };
    rankings: { tracked: number; improving: number; declining: number };
    lastActivity: string | null;
  }> {
    const [
      { count: totalPages, data: pages },
      { count: totalLeads, data: leads },
      { count: totalAgentRuns, data: agentRuns },
      { data: rankings },
    ] = await Promise.all([
      supabaseAdmin
        .from('pages')
        .select('*', { count: 'exact' })
        .eq('project_id', projectId),
      supabaseAdmin
        .from('leads')
        .select('*', { count: 'exact' })
        .eq('project_id', projectId),
      supabaseAdmin
        .from('agent_runs')
        .select('*', { count: 'exact' })
        .eq('project_id', projectId),
      supabaseAdmin
        .from('rankings')
        .select('*')
        .eq('project_id', projectId)
        .order('tracked_at', { ascending: false })
        .limit(100),
    ]);

    const publishedPages = pages?.filter(p => p.status === 'published').length || 0;
    const draftPages = pages?.filter(p => p.status === 'draft').length || 0;

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const leadsThisWeek = leads?.filter(l => new Date(l.created_at) >= weekAgo).length || 0;
    const leadsThisMonth = leads?.filter(l => new Date(l.created_at) >= monthAgo).length || 0;

    const failedAgentRuns = agentRuns?.filter(r => r.status === 'failed').length || 0;
    const runningAgentRuns = agentRuns?.filter(r => r.status === 'running').length || 0;

    const improvingRankings = rankings?.filter(r => r.position_change && r.position_change < 0).length || 0;
    const decliningRankings = rankings?.filter(r => r.position_change && r.position_change > 0).length || 0;

    // Get last activity timestamp
    const lastAgentRun = agentRuns?.[0];
    const lastActivity = lastAgentRun?.created_at || null;

    return {
      projectId,
      pages: {
        total: totalPages || 0,
        published: publishedPages,
        draft: draftPages,
      },
      leads: {
        total: totalLeads || 0,
        thisWeek: leadsThisWeek,
        thisMonth: leadsThisMonth,
      },
      agentRuns: {
        total: totalAgentRuns || 0,
        failed: failedAgentRuns,
        running: runningAgentRuns,
      },
      rankings: {
        tracked: rankings?.length || 0,
        improving: improvingRankings,
        declining: decliningRankings,
      },
      lastActivity,
    };
  }
}

export const monitoringService = new MonitoringService();
