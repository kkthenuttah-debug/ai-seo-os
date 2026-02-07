export interface LeadWebhookPayload {
  projectId: string;
  pageId?: string;
  email: string;
  name?: string;
  message?: string;
  phone?: string;
  sourceUrl?: string;
  data?: Record<string, unknown>;
}

export interface PagePublishWebhookPayload {
  projectId: string;
  pageId?: string;
  slug?: string;
  url?: string;
  status?: 'draft' | 'published';
  publishedAt?: string;
  wordpressPostId?: number;
}

export interface WebhookResult {
  success: boolean;
  message?: string;
}

/** Payload sent to external URLs when event is monitor.completed */
export interface MonitorCompletedWebhookPayload {
  event: 'monitor.completed';
  projectId: string;
  monitorRunId: string;
  healthScore: number | null;
  alertsCount: number;
  trendsCount: number;
  recommendationsCount: number;
  optimizationCandidatesCount: number;
  result: {
    rankings?: unknown[];
    trends?: unknown[];
    alerts?: unknown[];
    recommendations?: unknown[];
    optimization_candidates?: unknown[];
  };
  completedAt: string;
}
