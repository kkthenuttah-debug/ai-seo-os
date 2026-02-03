import { createClient } from '@supabase/supabase-js';
import { env } from './config.js';
import type { Database } from '../types/database.js';

// Public client for user operations
export const supabase = createClient<Database>(
  env.SUPABASE_URL,
  env.SUPABASE_ANON_KEY
);

// Admin client for server-side operations
export const supabaseAdmin = createClient<Database>(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_KEY || env.SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Database helper functions
export async function getUserById(userId: string) {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data;
}

export async function getProjectById(projectId: string) {
  const { data, error } = await supabaseAdmin
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single();

  if (error) throw error;
  return data;
}

export async function getProjectsByUserId(userId: string) {
  const { data, error } = await supabaseAdmin
    .from('projects')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function getIntegrationsByProjectId(projectId: string) {
  const { data, error } = await supabaseAdmin
    .from('integrations')
    .select('*')
    .eq('project_id', projectId);

  if (error) throw error;
  return data;
}

export async function getPagesByProjectId(projectId: string) {
  const { data, error } = await supabaseAdmin
    .from('pages')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function getAgentRunsByProjectId(projectId: string, limit = 50) {
  const { data, error } = await supabaseAdmin
    .from('agent_runs')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

export async function getLeadsByProjectId(projectId: string) {
  const { data, error } = await supabaseAdmin
    .from('leads')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function getGSCSnapshotsByProjectId(projectId: string, limit = 30) {
  const { data, error } = await supabaseAdmin
    .from('gsc_snapshots')
    .select('*')
    .eq('project_id', projectId)
    .order('snapshot_date', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

export async function getRankingsByProjectId(projectId: string) {
  const { data, error } = await supabaseAdmin
    .from('rankings')
    .select('*')
    .eq('project_id', projectId)
    .order('tracked_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function createAgentRun(run: {
  project_id: string;
  agent_type: string;
  status: string;
  input: object;
  model_used: string;
}) {
  const { data, error } = await supabaseAdmin
    .from('agent_runs')
    .insert(run)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateAgentRun(id: string, updates: {
  status?: string;
  output?: object;
  error?: string;
  tokens_used?: number;
  duration_ms?: number;
  completed_at?: string;
}) {
  const { data, error } = await supabaseAdmin
    .from('agent_runs')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function createLog(log: {
  project_id?: string;
  agent_run_id?: string;
  level: string;
  message: string;
  data?: object;
}) {
  const { error } = await supabaseAdmin
    .from('logs')
    .insert(log);

  if (error) console.error('Failed to create log:', error);
}
