import type { z } from 'zod';
import type { AgentType } from '../../types/index.js';

export interface AgentConfig<TInput, TOutput> {
  type: AgentType;
  name: string;
  description: string;
  systemPrompt: string;
  inputSchema: z.ZodSchema<TInput>;
  outputSchema: z.ZodSchema<TOutput>;
  maxTokens?: number;
  temperature?: number;
  timeout?: number;
  retryable?: boolean;
}

export interface AgentRunOptions {
  projectId: string;
  correlationId?: string;
  userId?: string;
  retryCount?: number;
  metadata?: Record<string, unknown>;
}

export interface AgentResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  runId: string;
  duration: number;
  tokensUsed: number;
  cost: number;
  model: string;
}

export interface InternalLinkerInput {
  content: string;
  existingPages: Array<{
    title: string;
    slug: string;
    url: string;
    keywords: string[];
  }>;
  currentPageTitle: string;
  currentPageSlug?: string;
}

export interface InternalLinkerOutput {
  suggestions: Array<{
    anchor: string;
    targetUrl: string;
    targetTitle: string;
    position: number;
    contextBefore: string;
    contextAfter: string;
    relevanceScore: number;
  }>;
  totalSuggestions: number;
}

export interface ElementorBuilderInput {
  pageTitle: string;
  content: string;
  keywords: string[];
  contentType: string;
  sections?: string[];
}

export interface ElementorBuilderOutput {
  elementorData: {
    version: string;
    elements: Array<{
      id: string;
      elType: string;
      settings: Record<string, unknown>;
      elements?: Array<unknown>;
    }>;
  };
  widgetsUsed: string[];
  sectionsCount: number;
  columnsCount: number;
}

export interface PageBuilderInput {
  title: string;
  slug: string;
  targetKeyword: string;
  contentType: string;
  tone: string;
  wordCount: number;
  /** Optional outline for content structure (e.g. intro, sections, FAQ, conclusion). */
  outline?: string[];
  /** Slugs or paths of other pages to link to (e.g. ["/", "/about"]). */
  internalLinkSlugs?: string[];
  /** When set, content builder will include a lead-capture form that POSTs to this webhook. */
  leadCapture?: { webhookUrl: string; projectId: string; pageId: string; sourceUrl: string };
}

export interface PageBuilderOutput {
  pageId: string;
  title: string;
  slug: string;
  content: string;
  metaTitle: string;
  metaDescription: string;
  elementorData: object;
  internalLinks: string[];
  readyToPublish: boolean;
}

export interface FixerInput {
  errorType: 'content' | 'technical' | 'api' | 'validation';
  errorMessage: string;
  context: {
    pageId?: string;
    agentType?: AgentType;
    failedInput?: unknown;
    failedOutput?: unknown;
  };
  previousAttempts?: number;
}

export interface FixerOutput {
  fixed: boolean;
  changes: Array<{
    type: string;
    description: string;
    appliedFix: string;
  }>;
  newContent?: string;
  recommendations: string[];
  requiresManualReview: boolean;
}

export interface TechnicalSEOInput {
  domain: string;
  pages: Array<{
    url: string;
    title: string;
    meta_description: string;
    h1: string;
    wordCount: number;
    loadTime: number;
  }>;
  siteAudit?: {
    crawlErrors: string[];
    brokenLinks: string[];
    missingMeta: string[];
    slowPages: string[];
  };
}

export interface TechnicalSEOOutput {
  issues: Array<{
    type: 'critical' | 'warning' | 'info';
    category: string;
    description: string;
    affectedPages: string[];
    impact: 'high' | 'medium' | 'low';
  }>;
  recommendations: Array<{
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
    effort: 'high' | 'medium' | 'low';
    impact: string;
    implementation: string;
  }>;
  prioritizedFixes: Array<{
    issue: string;
    fix: string;
    priority: number;
  }>;
  score: number;
}

export interface MonitorInput {
  projectId: string;
  gscSnapshots: Array<{
    date: string;
    totalClicks: number;
    totalImpressions: number;
    averageCtr: number;
    averagePosition: number;
  }>;
  pages: Array<{
    pageId: string;
    url: string;
    targetKeyword: string;
  }>;
}

export interface MonitorOutput {
  rankings: Array<{
    keyword: string;
    position: number;
    previousPosition: number | null;
    change: number;
    url: string;
    pageId: string;
  }>;
  trends: Array<{
    metric: string;
    direction: 'up' | 'down' | 'stable';
    changePercentage: number;
    analysis: string;
  }>;
  alerts: Array<{
    type: 'warning' | 'critical' | 'info';
    message: string;
    pageId?: string;
    keyword?: string;
    actionRequired: boolean;
  }>;
  recommendations: Array<{
    type: string;
    pageId?: string;
    suggestion: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  optimization_candidates?: Array<{
    page_slug: string;
    priority: 'high' | 'medium' | 'low';
    reason?: string;
  }>;
  health_score?: number;
}

export interface PublisherInput {
  projectId: string;
  pageId: string;
  publishSettings?: {
    scheduleDate?: string;
    status?: 'publish' | 'draft' | 'pending';
    categories?: string[];
    tags?: string[];
  };
  /** Optional page context for pre-publish checks (orchestrator passes these) */
  page_title?: string;
  page_slug?: string;
  content_html?: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
  target_keyword?: string;
}

export interface PublisherOutput {
  published: boolean;
  postId: number;
  url: string;
  publishedAt: string;
  status: string;
  errors?: string[];
  /** Pre-publish check: if false, orchestrator will not publish */
  publish_ready?: boolean;
  seo_checklist?: Record<string, unknown>;
  final_meta_title?: string;
  final_meta_description?: string;
}

export type AgentInputMap = {
  market_research: import('../../types/index.js').MarketResearchInput;
  site_architect: import('../../types/index.js').MarketResearchOutput;
  content_builder: import('../../types/index.js').ContentBuilderInput;
  elementor_builder: ElementorBuilderInput;
  internal_linker: InternalLinkerInput;
  page_builder: PageBuilderInput;
  fixer: FixerInput;
  technical_seo: TechnicalSEOInput;
  monitor: MonitorInput;
  optimizer: import('../../types/index.js').OptimizerInput;
  publisher: PublisherInput;
};

export type AgentOutputMap = {
  market_research: import('../../types/index.js').MarketResearchOutput;
  site_architect: import('../../types/index.js').SiteArchitectOutput;
  content_builder: import('../../types/index.js').ContentBuilderOutput;
  elementor_builder: ElementorBuilderOutput;
  internal_linker: InternalLinkerOutput;
  page_builder: PageBuilderOutput;
  fixer: FixerOutput;
  technical_seo: TechnicalSEOOutput;
  monitor: MonitorOutput;
  optimizer: import('../../types/index.js').OptimizerOutput;
  publisher: PublisherOutput;
};
