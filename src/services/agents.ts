import { api } from "@/services/api";

export interface AgentRunFromApi {
  id: string;
  project_id: string;
  agent_type: string;
  status: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error_message?: string;
  duration_ms?: number;
  tokens_used?: number;
  created_at: string;
  completed_at?: string;
}

export interface AgentRunsListResponse {
  agentRuns: AgentRunFromApi[];
  total: number;
  limit: number;
  offset: number;
}

export interface QueueStatusResponse {
  queueName: string;
  isPaused: boolean;
  jobs: { waiting: number; active: number; completed: number; failed: number; delayed: number };
  currentJobs: Array<{ id: string; agentType: string; runId: string; progress?: number }>;
  workerHealth: { isRunning: boolean; activeCount: number };
}

export interface AgentStatsResponse {
  stats: Array<{
    agentType: string;
    totalRuns: number;
    successCount: number;
    failureCount: number;
    successRate: number;
    avgDuration: number;
    avgTokens: number;
  }>;
  summary: {
    totalRuns: number;
    totalSuccess: number;
    totalFailure: number;
    overallSuccessRate: number;
  };
}

export interface MonitorRunFromApi {
  id: string;
  projectId: string;
  healthScore: number | null;
  result: {
    rankings?: unknown[];
    trends?: unknown[];
    alerts?: unknown[];
    recommendations?: unknown[];
    optimization_candidates?: unknown[];
  };
  createdAt: string;
}

export interface MonitorRunsListResponse {
  monitorRuns: MonitorRunFromApi[];
  limit: number;
  offset: number;
}

export interface AgentInfo {
  type: string;
  name: string;
  description: string;
  category: 'strategy' | 'execution';
  version: string;
  dependencies: string[];
}

export interface AgentsListResponse {
  agents: AgentInfo[];
}

export interface RunAgentResponse {
  success: boolean;
  runId: string;
  jobId: string;
  correlationId: string;
  status: string;
  message: string;
}

export const agentsService = {
  listRuns: (projectId: string, params?: { limit?: number; offset?: number; status?: string }) => {
    const q = new URLSearchParams();
    if (params?.limit != null) q.set("limit", String(params.limit));
    if (params?.offset != null) q.set("offset", String(params.offset));
    if (params?.status) q.set("status", params.status);
    const path = q.toString() ? `/projects/${projectId}/agent-runs?${q}` : `/projects/${projectId}/agent-runs`;
    return api.get<AgentRunsListResponse>(path);
  },
  listMonitorRuns: (projectId: string, params?: { limit?: number; offset?: number }) => {
    const q = new URLSearchParams();
    if (params?.limit != null) q.set("limit", String(params.limit));
    if (params?.offset != null) q.set("offset", String(params.offset));
    const path = q.toString() ? `/projects/${projectId}/monitor-runs?${q}` : `/projects/${projectId}/monitor-runs`;
    return api.get<MonitorRunsListResponse>(path);
  },
  getMonitorRun: (projectId: string, runId: string) =>
    api.get<MonitorRunFromApi>(`/projects/${projectId}/monitor-runs/${runId}`),
  queueStatus: (projectId: string) =>
    api.get<QueueStatusResponse>(`/projects/${projectId}/agent-runs/queue-status`),
  stats: (projectId: string) =>
    api.get<AgentStatsResponse>(`/projects/${projectId}/agent-runs/stats`),
  retryFailed: (projectId: string) =>
    api.post<{ success: boolean; message: string }>(`/projects/${projectId}/agent-runs/retry-failed`),
  // List all available agents with metadata
  list: (projectId: string) =>
    api.get<AgentsListResponse>(`/projects/${projectId}/agents`),
  // Run an agent manually
  run: (projectId: string, agentType: string, input: Record<string, unknown>) =>
    api.post<RunAgentResponse>(`/projects/${projectId}/agents/run`, { agentType, input }),
};
