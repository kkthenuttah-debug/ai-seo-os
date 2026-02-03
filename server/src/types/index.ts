// Core types for AI SEO OS

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  domain: string;
  status: ProjectStatus;
  settings: ProjectSettings;
  created_at: string;
  updated_at: string;
}

export type ProjectStatus =
  | 'draft'
  | 'configuring'
  | 'building'
  | 'publishing'
  | 'live'
  | 'optimizing'
  | 'paused'
  | 'error';

export interface ProjectSettings {
  niche: string;
  target_audience: string;
  keywords: string[];
  content_tone: string;
  monetization_strategy: string;
  auto_optimize: boolean;
  publish_frequency: 'daily' | 'weekly' | 'biweekly';
}

export interface Integration {
  id: string;
  project_id: string;
  type: IntegrationType;
  credentials: IntegrationCredentials;
  status: 'active' | 'inactive' | 'error';
  last_sync: string | null;
  created_at: string;
  updated_at: string;
}

export type IntegrationType = 'wordpress' | 'google_search_console';

export interface IntegrationCredentials {
  wordpress?: {
    site_url: string;
    username: string;
    application_password: string;
  };
  gsc?: {
    access_token: string;
    refresh_token: string;
    token_expiry: string;
    site_url: string;
  };
}

export interface Page {
  id: string;
  project_id: string;
  title: string;
  slug: string;
  content: string;
  meta_title: string;
  meta_description: string;
  status: PageStatus;
  wordpress_id: number | null;
  elementor_data: object | null;
  internal_links: string[];
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

export type PageStatus =
  | 'draft'
  | 'generating'
  | 'ready'
  | 'publishing'
  | 'published'
  | 'optimizing'
  | 'error';

export interface AgentRun {
  id: string;
  project_id: string;
  agent_type: AgentType;
  status: AgentRunStatus;
  input: object;
  output: object | null;
  error: string | null;
  tokens_used: number;
  model_used: string;
  duration_ms: number | null;
  created_at: string;
  completed_at: string | null;
}

export type AgentType =
  | 'market_research'
  | 'site_architect'
  | 'internal_linker'
  | 'elementor_builder'
  | 'content_builder'
  | 'page_builder'
  | 'fixer'
  | 'technical_seo'
  | 'monitor'
  | 'optimizer'
  | 'publisher';

export type AgentRunStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'retrying';

export interface GSCSnapshot {
  id: string;
  project_id: string;
  date: string;
  total_clicks: number;
  total_impressions: number;
  average_ctr: number;
  average_position: number;
  data: GSCData;
  created_at: string;
}

export interface GSCData {
  queries: GSCQueryData[];
  pages: GSCPageData[];
}

export interface GSCQueryData {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface GSCPageData {
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface Ranking {
  id: string;
  project_id: string;
  page_id: string | null;
  keyword: string;
  position: number;
  previous_position: number | null;
  change: number;
  url: string;
  date: string;
  created_at: string;
}

export interface Lead {
  id: string;
  project_id: string;
  page_id: string | null;
  email: string;
  name: string | null;
  phone: string | null;
  source: string;
  data: object;
  created_at: string;
}

export interface Log {
  id: string;
  project_id: string | null;
  agent_run_id: string | null;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  data: object | null;
  created_at: string;
}

// Agent I/O Types
export interface MarketResearchInput {
  niche: string;
  target_audience: string;
  competitors?: string[];
}

export interface MarketResearchOutput {
  market_analysis: {
    market_size: string;
    trends: string[];
    opportunities: string[];
    challenges: string[];
  };
  competitor_analysis: {
    competitors: Array<{
      name: string;
      url: string;
      strengths: string[];
      weaknesses: string[];
    }>;
  };
  keyword_opportunities: Array<{
    keyword: string;
    intent: 'informational' | 'transactional' | 'navigational';
    difficulty: 'low' | 'medium' | 'high';
    potential: 'low' | 'medium' | 'high';
  }>;
  content_gaps: string[];
  recommended_topics: string[];
}

export interface SiteArchitectOutput {
  site_structure: {
    homepage: {
      title: string;
      meta_description: string;
      sections: string[];
    };
    categories: Array<{
      name: string;
      slug: string;
      description: string;
      pages: Array<{
        title: string;
        slug: string;
        target_keyword: string;
        content_type: string;
      }>;
    }>;
  };
  internal_link_strategy: {
    hub_pages: string[];
    pillar_content: string[];
    link_clusters: Array<{
      hub: string;
      spokes: string[];
    }>;
  };
  technical_requirements: {
    schema_types: string[];
    required_plugins: string[];
    performance_targets: object;
  };
}

export interface ContentBuilderInput {
  page_title: string;
  target_keyword: string;
  content_type: string;
  tone: string;
  word_count: number;
  outline?: string[];
  internal_links?: string[];
}

export interface ContentBuilderOutput {
  title: string;
  meta_title: string;
  meta_description: string;
  content: string;
  headings: Array<{
    level: number;
    text: string;
  }>;
  word_count: number;
  reading_time: number;
  suggested_internal_links: string[];
}

export interface ElementorBuilderOutput {
  elementor_data: object;
  widgets_used: string[];
  sections: number;
  columns: number;
}

export interface PageBuilderInput {
  project_id: string;
  page: {
    title: string;
    slug: string;
    target_keyword: string;
    content_type: string;
  };
}

export interface PublisherInput {
  project_id: string;
  page_id: string;
}

export interface OptimizerInput {
  project_id: string;
  page_id: string;
  gsc_data: GSCQueryData[];
  current_content: string;
}

export interface OptimizerOutput {
  recommendations: Array<{
    type: 'title' | 'meta' | 'content' | 'heading' | 'internal_link';
    current: string;
    suggested: string;
    reason: string;
    priority: 'low' | 'medium' | 'high';
  }>;
  updated_content?: string;
  updated_meta_title?: string;
  updated_meta_description?: string;
}

// Queue Job Types
export interface BuildJob {
  type: 'build';
  project_id: string;
  page_id?: string;
  phase: 'research' | 'architecture' | 'content' | 'elementor' | 'linking';
}

export interface PublishJob {
  type: 'publish';
  project_id: string;
  page_id: string;
}

export interface MonitorJob {
  type: 'monitor';
  project_id: string;
}

export interface OptimizeJob {
  type: 'optimize';
  project_id: string;
  page_id: string;
  reason: 'scheduled' | 'performance_drop' | 'manual';
}

export type QueueJob = BuildJob | PublishJob | MonitorJob | OptimizeJob;
