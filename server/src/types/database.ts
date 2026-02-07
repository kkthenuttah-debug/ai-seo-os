// AI SEO OS - Database Types
// Auto-generated from Supabase schema
// This file provides TypeScript types matching the PostgreSQL database schema

// ============================================================================
// ENUM TYPES
// ============================================================================

export type ProjectStatus =
  | 'active'
  | 'paused'
  | 'archived'
  | 'building'
  | 'configuring'
  | 'draft'
  | 'publishing'
  | 'live'
  | 'optimizing'
  | 'error';

export type IntegrationType = 'gsc' | 'wordpress' | 'elementor' | 'rankmath' | 'yoast';

export type IntegrationStatus = 'active' | 'inactive' | 'error';

export type PageStatus = 'draft' | 'published' | 'optimized' | 'optimizing' | 'ready' | 'publishing' | 'error';

export type PublishStatus = 'pending' | 'published' | 'failed';

export type AgentType =
  | 'market_research'
  | 'site_arch'
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

export type AgentRunStatus = 'pending' | 'running' | 'completed' | 'failed';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// ============================================================================
// JSONB TYPE DEFINITIONS
// ============================================================================

export interface ProjectSettings {
  niche: string;
  target_audience: string;
  keywords: string[];
  content_tone: string;
  monetization_strategy: string;
  auto_optimize: boolean;
  publish_frequency: 'daily' | 'weekly' | 'biweekly';
  [key: string]: unknown;
}

export interface IntegrationData {
  site_url?: string;
  property_set_id?: string;
  api_endpoint?: string;
  version?: string;
  pro_enabled?: boolean;
  [key: string]: unknown;
}

export interface ElementorData {
  version?: string;
  sections?: Array<{
    id: string;
    type: string;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}

export interface AgentRunInput {
  [key: string]: unknown;
}

export interface AgentRunOutput {
  [key: string]: unknown;
}

export interface GSCData {
  device?: string;
  country?: string;
  [key: string]: unknown;
}

export interface LeadData {
  form_id?: string;
  utm_source?: string;
  utm_medium?: string;
  company_size?: string;
  fitness_goal?: string;
  [key: string]: unknown;
}

export interface LogMetadata {
  [key: string]: unknown;
}

// ============================================================================
// DATABASE TABLES
// ============================================================================

/**
 * Table: users
 * Description: Application users linked to Supabase Auth
 */
export interface User {
  id: string;
  email: string;
  auth_id: string;
  company_name: string | null;
  created_at: string;
  updated_at: string;
}

export type UserInsert = Omit<User, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
};

export type UserUpdate = Partial<Omit<User, 'id' | 'created_at' | 'updated_at'>>;

/**
 * Table: projects
 * Description: SEO projects owned by users
 */
export interface Project {
  id: string;
  user_id: string;
  name: string;
  domain: string | null;
  wordpress_url: string | null;
  wordpress_username: string | null;
  wordpress_password_encrypted: string | null;
  status: ProjectStatus;
  settings: ProjectSettings;
  created_at: string;
  updated_at: string;
}

export type ProjectInsert = Omit<Project, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  status?: ProjectStatus;
  settings?: ProjectSettings;
};

export type ProjectUpdate = Partial<Omit<Project, 'id' | 'created_at' | 'updated_at'>>;

/**
 * Table: integrations
 * Description: Third-party service integrations for projects
 */
export interface Integration {
  id: string;
  project_id: string;
  type: IntegrationType;
  access_token_encrypted: string | null;
  refresh_token_encrypted: string | null;
  expires_at: string | null;
  data: IntegrationData;
  status: IntegrationStatus;
  last_sync_at: string | null;
  created_at: string;
  updated_at: string;
}

export type IntegrationInsert = Omit<Integration, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  data?: IntegrationData;
  status?: IntegrationStatus;
};

export type IntegrationUpdate = Partial<Omit<Integration, 'id' | 'created_at' | 'updated_at'>>;

/**
 * Table: pages
 * Description: Website pages/content within projects
 */
export interface Page {
  id: string;
  project_id: string;
  title: string;
  slug: string;
  content: string | null;
  content_type: string | null;
  meta_title: string | null;
  meta_description: string | null;
  meta_keywords: string | null;
  elementor_data: ElementorData;
  internal_links: string[];
  status: PageStatus;
  publish_status: PublishStatus;
  wordpress_post_id: number | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export type PageInsert = Omit<Page, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  content_type?: string | null;
  elementor_data?: ElementorData;
  internal_links?: string[];
  status?: PageStatus;
  publish_status?: PublishStatus;
};

export type PageUpdate = Partial<Omit<Page, 'id' | 'created_at' | 'updated_at'>>;

/**
 * Table: agent_runs
 * Description: AI agent execution tracking
 */
export interface AgentRun {
  id: string;
  project_id: string;
  agent_type: AgentType;
  status: AgentRunStatus;
  input: AgentRunInput;
  output: AgentRunOutput;
  error_message: string | null;
  model_used: string | null;
  tokens_used: number;
  duration_ms: number | null;
  retry_count: number;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export type AgentRunInsert = Omit<AgentRun, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  input?: AgentRunInput;
  output?: AgentRunOutput;
  status?: AgentRunStatus;
  tokens_used?: number;
  retry_count?: number;
};

export type AgentRunUpdate = Partial<Omit<AgentRun, 'id' | 'created_at' | 'updated_at'>>;

/**
 * Table: gsc_snapshots
 * Description: Google Search Console data snapshots
 */
export interface GSCSnapshot {
  id: string;
  project_id: string;
  query: string | null;
  page: string | null;
  clicks: number;
  impressions: number;
  ctr: number | null;
  position: number | null;
  snapshot_date: string;
  total_clicks: number;
  total_impressions: number;
  average_ctr: number | null;
  average_position: number | null;
  data: GSCData;
  created_at: string;
}

export type GSCSnapshotInsert = Omit<GSCSnapshot, 'id' | 'created_at'> & {
  id?: string;
  data?: GSCData;
  clicks?: number;
  impressions?: number;
  total_clicks?: number;
  total_impressions?: number;
};

export type GSCSnapshotUpdate = Partial<Omit<GSCSnapshot, 'id' | 'created_at'>>;

/**
 * Table: rankings
 * Description: Keyword ranking tracking
 */
export interface Ranking {
  id: string;
  project_id: string;
  page_id: string | null;
  keyword: string;
  position: number;
  previous_position: number | null;
  position_change: number | null;
  url: string | null;
  search_volume: number | null;
  difficulty: number | null;
  tracked_at: string;
  created_at: string;
}

export type RankingInsert = Omit<Ranking, 'id' | 'created_at'> & {
  id?: string;
  tracked_at?: string;
};

export type RankingUpdate = Partial<Omit<Ranking, 'id' | 'created_at'>>;

/**
 * Table: leads
 * Description: Captured leads from website forms
 */
export interface Lead {
  id: string;
  project_id: string;
  email: string;
  phone: string | null;
  name: string | null;
  message: string | null;
  source_page_id: string | null;
  source_url: string | null;
  data: LeadData;
  captured_at: string;
  created_at: string;
}

export type LeadInsert = Omit<Lead, 'id' | 'created_at'> & {
  id?: string;
  data?: LeadData;
  captured_at?: string;
};

export type LeadUpdate = Partial<Omit<Lead, 'id' | 'created_at'>>;

/**
 * Table: webhooks
 * Description: Webhook configurations for external integrations
 */
export interface Webhook {
  id: string;
  project_id: string;
  url: string;
  events: string[];
  secret: string;
  active: boolean;
  last_triggered_at: string | null;
  created_at: string;
  updated_at: string;
}

export type WebhookInsert = Omit<Webhook, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
};

export type WebhookUpdate = Partial<Omit<Webhook, 'id' | 'created_at' | 'updated_at'>>;

/**
 * Table: logs
 * Description: System and application logs
 */
export interface Log {
  id: string;
  project_id: string | null;
  agent_run_id: string | null;
  level: LogLevel;
  service: string;
  message: string;
  metadata: LogMetadata;
  created_at: string;
}

export type LogInsert = Omit<Log, 'id' | 'created_at'> & {
  id?: string;
  level?: LogLevel;
  metadata?: LogMetadata;
};

export type LogUpdate = Partial<Omit<Log, 'id' | 'created_at'>>;

/**
 * Table: monitor_runs
 * Description: Monitor agent run results (health score, alerts, trends, recommendations)
 */
export interface MonitorRun {
  id: string;
  project_id: string;
  health_score: number | null;
  result: MonitorRunResult;
  created_at: string;
}

export interface MonitorRunResult {
  rankings?: Array<{ keyword?: string; position?: number; previousPosition?: number | null; change?: number; url?: string; pageId?: string }>;
  trends?: Array<{ metric?: string; direction?: 'up' | 'down' | 'stable'; changePercentage?: number; analysis?: string }>;
  alerts?: Array<{ type?: 'warning' | 'critical' | 'info'; message?: string; pageId?: string; keyword?: string; actionRequired?: boolean }>;
  recommendations?: Array<{ type?: string; pageId?: string; suggestion?: string; priority?: 'high' | 'medium' | 'low' }>;
  optimization_candidates?: Array<{ page_slug: string; priority: 'high' | 'medium' | 'low'; reason?: string }>;
  health_score?: number;
}

export type MonitorRunInsert = Omit<MonitorRun, 'id' | 'created_at'> & {
  id?: string;
  result?: MonitorRunResult;
};

export type MonitorRunUpdate = Partial<Omit<MonitorRun, 'id' | 'created_at'>>;

// ============================================================================
// VIEW TYPES
// ============================================================================

/**
 * View: project_health_summary
 * Description: Aggregated project metrics
 */
export interface ProjectHealthSummary {
  project_id: string;
  project_name: string;
  domain: string | null;
  status: ProjectStatus;
  total_pages: number;
  published_pages: number;
  optimized_pages: number;
  total_leads: number;
  total_agent_runs: number;
  failed_agent_runs: number;
  last_agent_run_at: string | null;
  last_gsc_snapshot_date: string | null;
}

/**
 * View: agent_performance_summary
 * Description: Agent execution statistics
 */
export interface AgentPerformanceSummary {
  agent_type: AgentType;
  status: AgentRunStatus;
  run_count: number;
  avg_duration_ms: number | null;
  total_tokens: number | null;
  avg_tokens_per_run: number | null;
  first_run_at: string | null;
  last_run_at: string | null;
}

// ============================================================================
// DATABASE FUNCTION TYPES
// ============================================================================

/**
 * Function: get_project_stats
 * Returns: JSONB with project statistics
 */
export interface ProjectStats {
  total_pages: number;
  published_pages: number;
  optimized_pages: number;
  total_leads: number;
  total_agent_runs: number;
  failed_runs: number;
  last_activity: string | null;
}

// ============================================================================
// SUPABASE CLIENT TYPES
// ============================================================================

import type { SupabaseClient } from '@supabase/supabase-js';

export type Database = {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: UserInsert;
        Update: UserUpdate;
      };
      projects: {
        Row: Project;
        Insert: ProjectInsert;
        Update: ProjectUpdate;
      };
      integrations: {
        Row: Integration;
        Insert: IntegrationInsert;
        Update: IntegrationUpdate;
      };
      pages: {
        Row: Page;
        Insert: PageInsert;
        Update: PageUpdate;
      };
      agent_runs: {
        Row: AgentRun;
        Insert: AgentRunInsert;
        Update: AgentRunUpdate;
      };
      gsc_snapshots: {
        Row: GSCSnapshot;
        Insert: GSCSnapshotInsert;
        Update: GSCSnapshotUpdate;
      };
      rankings: {
        Row: Ranking;
        Insert: RankingInsert;
        Update: RankingUpdate;
      };
      leads: {
        Row: Lead;
        Insert: LeadInsert;
        Update: LeadUpdate;
      };
      webhooks: {
        Row: Webhook;
        Insert: WebhookInsert;
        Update: WebhookUpdate;
      };
      logs: {
        Row: Log;
        Insert: LogInsert;
        Update: LogUpdate;
      };
      monitor_runs: {
        Row: MonitorRun;
        Insert: MonitorRunInsert;
        Update: MonitorRunUpdate;
      };
    };
    Views: {
      project_health_summary: ProjectHealthSummary;
      agent_performance_summary: AgentPerformanceSummary;
    };
    Functions: {
      get_project_stats: {
        Args: { project_uuid: string };
        Returns: ProjectStats;
      };
      clean_old_logs: {
        Args: { days_to_keep: number };
        Returns: number;
      };
    };
  };
};

export type TypedSupabaseClient = SupabaseClient<Database>;

// ============================================================================
// HELPER TYPES
// ============================================================================

export type Tables = Database['public']['Tables'];
export type Views = Database['public']['Views'];
export type Functions = Database['public']['Functions'];

// Utility type to get table row type
export type TableRow<T extends keyof Tables> = Tables[T]['Row'];

// Utility type to get table insert type
export type TableInsert<T extends keyof Tables> = Tables[T]['Insert'];

// Utility type to get table update type
export type TableUpdate<T extends keyof Tables> = Tables[T]['Update'];

// Utility type to get view type
export type ViewRow<T extends keyof Views> = Views[T];
