import type { AgentType } from './index.js';

// Agent Task Job Schema
export interface AgentTaskJob {
  project_id: string;
  agent_type: AgentType;
  input: Record<string, any>;
  correlation_id: string;
  retry_count: number;
  timestamp: number;
}

// Webhook Job Schema
export interface WebhookJob {
  project_id: string;
  webhook_type: 'wordpress_publish' | 'gsc_update' | 'custom';
  url: string;
  payload: Record<string, any>;
  headers?: Record<string, string>;
  retry_count: number;
  correlation_id: string;
}

// Job priority levels
export const JOB_PRIORITIES = {
  HIGH: 10,
  MEDIUM: 5,
  LOW: 1,
} as const;

export type JobPriority = typeof JOB_PRIORITIES[keyof typeof JOB_PRIORITIES];

// Queue configuration
export interface QueueConfig {
  host: string;
  port: number;
  password?: string;
  max_concurrency: {
    agent_tasks: number;
    build: number;
    publish: number;
    monitor: number;
    optimize: number;
    webhooks: number;
  };
  retry_attempts: number;
  retry_delay_ms: number;
  lock_duration_ms: number;
}

// Job result types
export interface AgentTaskResult {
  success: boolean;
  agent_type: AgentType;
  output?: Record<string, any>;
  error?: string;
  duration_ms: number;
}

export interface BuildResult {
  success: boolean;
  phase: string;
  pages_processed?: number;
  error?: string;
}

export interface PublishResult {
  success: boolean;
  wordpress_id?: number;
  link?: string;
  error?: string;
}

export interface MonitorResult {
  success: boolean;
  health_score?: number;
  alerts_count?: number;
  optimization_candidates?: number;
  error?: string;
}

export interface OptimizeResult {
  success: boolean;
  recommendations_count?: number;
  has_content_update?: boolean;
  error?: string;
}

export interface WebhookResult {
  success: boolean;
  status_code?: number;
  error?: string;
}

// Queue health metrics
export interface QueueHealth {
  queue_name: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  is_paused: boolean;
}

export interface WorkerHealth {
  queue_name: string;
  is_running: boolean;
  active_jobs: number;
  processed_jobs: number;
  failed_jobs: number;
  last_job_timestamp?: number;
}
