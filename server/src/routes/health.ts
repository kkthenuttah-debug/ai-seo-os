import type { FastifyInstance } from 'fastify';
import { monitoringService } from '../services/monitoring.js';
import { metricsCollector } from '../services/metricsCollector.js';
import { logger } from '../lib/logger.js';

export async function healthRoutes(app: FastifyInstance) {
  // Simple health check
  app.get('/health', async () => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  });

  // Detailed health check
  app.get('/health/detailed', async () => {
    try {
      const healthDetails = await monitoringService.getDetailedHealth();
      
      const isHealthy = Object.values(healthDetails).every(
        (service: any) => typeof service === 'object' && service.connected !== false
      );

      return {
        status: isHealthy ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        services: healthDetails,
      };
    } catch (error) {
      logger.error({ error }, 'Health check failed');
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // Metrics endpoint
  app.get('/health/metrics', async () => {
    try {
      const metrics = await monitoringService.getAggregatedMetrics();
      const performanceMetrics = await monitoringService.getPerformanceMetrics('24h');

      return {
        timestamp: new Date().toISOString(),
        system: metrics.system,
        queues: metrics.queues,
        agents: metrics.agents,
        apis: metrics.apis,
        performance: {
          requestRate: performanceMetrics.requestRate,
          errorRate: performanceMetrics.errorRate,
          avgResponseTime: performanceMetrics.avgResponseTime,
          p95ResponseTime: performanceMetrics.p95ResponseTime,
          p99ResponseTime: performanceMetrics.p99ResponseTime,
        },
      };
    } catch (error) {
      logger.error({ error }, 'Failed to collect metrics');
      throw error;
    }
  });

  // Agent metrics
  app.get('/health/metrics/agents', async () => {
    const agentMetrics = metricsCollector.getAllAgentMetrics();
    
    return {
      timestamp: new Date().toISOString(),
      agents: agentMetrics,
      summary: {
        totalAgentTypes: agentMetrics.length,
        totalRuns: agentMetrics.reduce((sum, a) => sum + a.totalRuns, 0),
        totalSuccess: agentMetrics.reduce((sum, a) => sum + a.successCount, 0),
        totalFailures: agentMetrics.reduce((sum, a) => sum + a.failureCount, 0),
        overallSuccessRate: agentMetrics.reduce((sum, a) => sum + a.totalRuns, 0) > 0
          ? agentMetrics.reduce((sum, a) => sum + a.successCount, 0) / 
            agentMetrics.reduce((sum, a) => sum + a.totalRuns, 0)
          : 0,
      },
    };
  });

  // API metrics
  app.get('/health/metrics/apis', async () => {
    const apiMetrics = metricsCollector.getAllApiMetrics();
    
    return {
      timestamp: new Date().toISOString(),
      apis: apiMetrics,
      summary: {
        totalEndpoints: apiMetrics.length,
        totalCalls: apiMetrics.reduce((sum, a) => sum + a.totalCalls, 0),
        totalSuccess: apiMetrics.reduce((sum, a) => sum + a.successCount, 0),
        totalFailures: apiMetrics.reduce((sum, a) => sum + a.failureCount, 0),
        overallSuccessRate: apiMetrics.reduce((sum, a) => sum + a.totalCalls, 0) > 0
          ? apiMetrics.reduce((sum, a) => sum + a.successCount, 0) / 
            apiMetrics.reduce((sum, a) => sum + a.totalCalls, 0)
          : 0,
      },
    };
  });

  // Queue metrics
  app.get('/health/metrics/queues', async () => {
    const queueMetrics = metricsCollector.getAllQueueMetrics();
    
    return {
      timestamp: new Date().toISOString(),
      queues: queueMetrics,
      summary: {
        totalQueues: queueMetrics.length,
        totalJobs: queueMetrics.reduce((sum, q) => sum + q.totalJobs, 0),
        totalSuccess: queueMetrics.reduce((sum, q) => sum + q.successCount, 0),
        totalFailures: queueMetrics.reduce((sum, q) => sum + q.failureCount, 0),
        totalRetried: queueMetrics.reduce((sum, q) => sum + q.retriedCount, 0),
        overallSuccessRate: queueMetrics.reduce((sum, q) => sum + q.totalJobs, 0) > 0
          ? queueMetrics.reduce((sum, q) => sum + q.successCount, 0) / 
            queueMetrics.reduce((sum, q) => sum + q.totalJobs, 0)
          : 0,
      },
    };
  });

  // System health
  app.get('/health/system', async () => {
    const systemHealth = metricsCollector.getSystemHealth();
    
    return {
      timestamp: new Date().toISOString(),
      system: {
        healthy: systemHealth.healthy,
        uptime: systemHealth.uptime,
        uptimeFormatted: formatUptime(systemHealth.uptime),
        memory: {
          rss: formatBytes(systemHealth.memoryUsage.rss),
          heapTotal: formatBytes(systemHealth.memoryUsage.heapTotal),
          heapUsed: formatBytes(systemHealth.memoryUsage.heapUsed),
          external: formatBytes(systemHealth.memoryUsage.external),
          heapUsagePercent: Math.round(
            (systemHealth.memoryUsage.heapUsed / systemHealth.memoryUsage.heapTotal) * 100
          ),
        },
        cpu: {
          user: systemHealth.cpuUsage.user,
          system: systemHealth.cpuUsage.system,
        },
        node: {
          version: process.version,
          platform: process.platform,
          arch: process.arch,
        },
      },
    };
  });
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
}

function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  const remainingHours = hours % 24;
  const remainingMinutes = minutes % 60;
  const remainingSeconds = seconds % 60;

  if (days > 0) {
    return `${days}d ${remainingHours}h ${remainingMinutes}m`;
  } else if (hours > 0) {
    return `${hours}h ${remainingMinutes}m ${remainingSeconds}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  } else {
    return `${remainingSeconds}s`;
  }
}
