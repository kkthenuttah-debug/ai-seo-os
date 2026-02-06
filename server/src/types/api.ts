import type { User } from "@supabase/supabase-js";

declare module "fastify" {
  interface FastifyRequest {
    user?: User;
  }
}

export interface ApiResponse<T> {
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  statusCode: number;
}

export interface ProjectResponse {
  id: string;
  name: string;
  domain: string;
  description?: string;
  status: string;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  integrations?: {
    type: string;
    status: string;
  }[];
  last_agent_run?: Record<string, unknown> | null;
}

export interface ProjectListResponse {
  projects: ProjectResponse[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateProjectRequest {
  name: string;
  domain: string;
  description?: string;
}

export interface UpdateProjectRequest {
  name?: string;
  domain?: string;
  description?: string;
  status?: string;
  settings?: Record<string, unknown>;
}

export interface IntegrationCredentials {
  type: "wordpress" | "gsc";
  data: Record<string, unknown>;
}

export interface AuthResponse {
  session: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    token_type: string;
  };
  user: {
    id: string;
    email: string;
  };
}

export interface UserProfile {
  id: string;
  email: string;
  company_name?: string;
  created_at: string;
  updated_at: string;
}
