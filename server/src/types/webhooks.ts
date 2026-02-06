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
}

export interface WebhookResult {
  success: boolean;
  message?: string;
}
