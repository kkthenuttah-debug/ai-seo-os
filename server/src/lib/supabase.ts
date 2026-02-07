import { createClient } from '@supabase/supabase-js';
import { env } from './config.js';
import type { Database } from '../types/database.js';

// Public client for user operations (e.g. browser; do not use for auth in Node)
export const supabase = createClient<Database>(
  env.SUPABASE_URL,
  env.SUPABASE_ANON_KEY
);

// Server-side anon client for sign-in only (no localStorage); use for login/signup session
export const supabaseAnonServer = createClient<Database>(
  env.SUPABASE_URL,
  env.SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
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
    .maybeSingle();

  if (error) throw error;
  if (data === null) throw new Error(`Project not found: ${projectId}`);
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

export async function getPagesByProjectId(projectId: string): Promise<Page[]> {
  const { data, error } = await supabaseAdmin
    .from('pages')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as Page[];
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
  error_message?: string;
  tokens_used?: number;
  duration_ms?: number;
  completed_at?: string;
}) {
  const dbUpdates = { ...updates } as Record<string, unknown>;
  if ('error' in dbUpdates && dbUpdates.error !== undefined) {
    dbUpdates.error_message = dbUpdates.error;
    delete dbUpdates.error;
  }
  const { data, error } = await supabaseAdmin
    .from('agent_runs')
    .update(dbUpdates)
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
  service?: string;
}) {
  const row = {
    project_id: log.project_id ?? null,
    agent_run_id: log.agent_run_id ?? null,
    level: log.level,
    service: log.service ?? 'ai-seo-os',
    message: log.message,
    metadata: log.data ?? {},
  };
  const { error } = await supabaseAdmin
    .from('logs')
    .insert(row);

  if (error) console.error('Failed to create log:', error);
}

/** Resolve app user id: by auth id, or by email if same email already has a users row. */
export async function getAppUserId(authUser: { id: string; email?: string | null }): Promise<string> {
  const { data: byId } = await supabaseAdmin.from('users').select('id').eq('id', authUser.id).maybeSingle();
  if (byId) return byId.id;

  const email = authUser.email?.trim();
  if (email) {
    const { data: byEmail } = await supabaseAdmin.from('users').select('id').eq('email', email).maybeSingle();
    if (byEmail) return byEmail.id;
  }

  const { error: insertErr } = await supabaseAdmin.from('users').insert({
    id: authUser.id,
    email: email ?? '',
    auth_id: authUser.id,
    company_name: null,
  });
  if (!insertErr) return authUser.id;

  if (insertErr.code === '23505' || String(insertErr.message).includes('users_email_key')) {
    const { data: byEmail } = await supabaseAdmin.from('users').select('id').eq('email', email ?? '').maybeSingle();
    if (byEmail) return byEmail.id;
  }
  throw new AppError(
    insertErr?.message ?? 'Failed to resolve user',
    503,
    'SERVICE_UNAVAILABLE'
  );
}
