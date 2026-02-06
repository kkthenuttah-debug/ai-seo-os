import { logger } from '../lib/logger.js';
import { supabaseAdmin } from '../lib/supabase.js';
import { metricsCollector } from './metricsCollector.js';

const log = logger.child({ service: 'errorTracking' });

interface ErrorContext {
  route?: string;
  method?: string;
  projectId?: string;
  userId?: string;
  agentRunId?: string;
  correlationId?: string;
  [key: string]: unknown;
}

interface ErrorLog {
  id?: string;
  message: string;
  stack: string;
  context: ErrorContext;
  timestamp: Date;
}

interface ErrorStats {
  totalErrors: number;
  errorsByType: Record<string, number>;
  errorsByRoute: Record<string, number>;
  errorsByProject: Record<string, number>;
  recentErrors: ErrorLog[];
}

interface AgentFailureStats {
  agentType: string;
  totalFailures: number;
  failureRate: number;
  commonErrors: Array<{ message: string; count: number }>;
  avgRetries: number;
}

// In-memory error storage (rotate periodically)
const errorLogs: ErrorLog[] = [];
const MAX_ERROR_LOGS = 1000;

class ErrorTracker {
  async trackError(error: Error, context: ErrorContext): Promise<void> {
    const errorLog: ErrorLog = {
      message: error.message,
      stack: error.stack || 'No stack trace available',
      context,
      timestamp: new Date(),
    };

    // Add to in-memory storage
    errorLogs.push(errorLog);
    if (errorLogs.length > MAX_ERROR_LOGS) {
      errorLogs.shift(); // Remove oldest
    }

    // Log to structured logger
    log.error({
      error: error.message,
      stack: error.stack,
      ...context,
    }, 'Error tracked');

    // Optionally save to database for persistent tracking
    try {
      await supabaseAdmin
        .from('logs')
        .insert({
          project_id: context.projectId || null,
          level: 'error',
          service: 'errorTracker',
          message: `Error: ${error.message}`,
          metadata: {
            stack: error.stack,
            ...context,
          },
        });
    } catch (dbError) {
      log.error({ error: dbError }, 'Failed to persist error to database');
    }
  }

  async trackAgentFailure(projectId: string, agentType: string, error: Error, input?: unknown): Promise<void> {
    const context: ErrorContext = {
      projectId,
      agentType,
      input,
    };

    await this.trackError(error, context);
    log.error({ projectId, agentType, error: error.message }, 'Agent failure tracked');
  }

  getErrorStats(projectId?: string): ErrorStats {
    const filteredErrors = projectId
      ? errorLogs.filter(e => e.context.projectId === projectId)
      : errorLogs;

    const errorsByType: Record<string, number> = {};
    const errorsByRoute: Record<string, number> = {};
    const errorsByProject: Record<string, number> = {};

    for (const error of filteredErrors) {
      // Group by error type (first part of message before colon)
      const errorType = error.message.split(':')[0];
      errorsByType[errorType] = (errorsByType[errorType] || 0) + 1;

      // Group by route
      if (error.context.route) {
        errorsByRoute[error.context.route] = (errorsByRoute[error.context.route] || 0) + 1;
      }

      // Group by project
      if (error.context.projectId) {
        errorsByProject[error.context.projectId] = (errorsByProject[error.context.projectId] || 0) + 1;
      }
    }

    return {
      totalErrors: filteredErrors.length,
      errorsByType,
      errorsByRoute,
      errorsByProject,
      recentErrors: filteredErrors.slice(-50),
    };
  }

  getRecentErrors(limit: number = 50): ErrorLog[] {
    return errorLogs.slice(-limit);
  }

  async getAgentFailureStats(agentType?: string): Promise<AgentFailureStats[]> {
    const { data: agentRuns, error } = await supabaseAdmin
      .from('agent_runs')
      .select('agent_type, status, error_message, retry_count')
      .eq('status', 'failed')
      .order('created_at', { ascending: false })
      .limit(1000);

    if (error) {
      log.error({ error }, 'Failed to fetch agent run stats');
      return [];
    }

    const failures = agentRuns || [];
    const groupedFailures = new Map<string, {
      count: number;
      errors: Map<string, number>;
      totalRetries: number;
    }>();

    for (const run of failures) {
      if (agentType && run.agent_type !== agentType) continue;

      const key = run.agent_type;
      if (!groupedFailures.has(key)) {
        groupedFailures.set(key, {
          count: 0,
          errors: new Map(),
          totalRetries: 0,
        });
      }

      const stats = groupedFailures.get(key)!;
      stats.count++;
      stats.totalRetries += run.retry_count || 0;

      if (run.error_message) {
        const errorMsg = run.error_message.split(':')[0];
        stats.errors.set(errorMsg, (stats.errors.get(errorMsg) || 0) + 1);
      }
    }

    // Calculate total runs per agent for failure rate
    const agentTypes = Array.from(groupedFailures.keys());
    const totalRunsPromises = agentTypes.map(async (type) => {
      const { count } = await supabaseAdmin
        .from('agent_runs')
        .select('*', { count: 'exact', head: true })
        .eq('agent_type', type);

      return { type, count: count || 0 };
    });

    const totalRunsResults = await Promise.all(totalRunsPromises);
    const totalRunsMap = new Map(totalRunsResults.map(r => [r.type, r.count]));

    const stats: AgentFailureStats[] = [];
    for (const [agentType, data] of groupedFailures) {
      const totalRuns = totalRunsMap.get(agentType) || 0;
      const commonErrors = Array.from(data.errors.entries())
        .map(([message, count]) => ({ message, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      stats.push({
        agentType,
        totalFailures: data.count,
        failureRate: totalRuns > 0 ? data.count / totalRuns : 0,
        commonErrors,
        avgRetries: data.count > 0 ? data.totalRetries / data.count : 0,
      });
    }

    return stats.sort((a, b) => b.totalFailures - a.totalFailures);
  }

  clearErrors(): void {
    errorLogs.length = 0;
    log.info('Error logs cleared');
  }

  getErrorById(id: string): ErrorLog | null {
    // Since we don't have IDs in our in-memory storage, return most recent matching error
    return errorLogs.find(e => e.message.includes(id)) || null;
  }
}

export const errorTracker = new ErrorTracker();
