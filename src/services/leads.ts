import { api } from "@/services/api";

export interface LeadFromApi {
  id: string;
  project_id: string;
  email: string;
  name?: string;
  phone?: string;
  message?: string;
  source_page?: string;
  source_url?: string;
  status?: string;
  captured_at: string;
  created_at: string;
}

export interface LeadsListResponse {
  leads: LeadFromApi[];
  total: number;
  limit: number;
  offset: number;
}

export const leadsService = {
  list: (
    projectId: string,
    params?: {
      search?: string;
      dateRange?: string;
      status?: string;
      sort?: string;
      limit?: number;
      offset?: number;
    }
  ) => {
    const q = new URLSearchParams();
    if (params?.search) q.set("search", params.search);
    if (params?.dateRange) q.set("dateRange", params.dateRange);
    if (params?.status) q.set("status", params.status);
    if (params?.sort) q.set("sort", params.sort);
    if (params?.limit != null) q.set("limit", String(params.limit));
    if (params?.offset != null) q.set("offset", String(params.offset));
    const path = q.toString() ? `/projects/${projectId}/leads?${q}` : `/projects/${projectId}/leads`;
    return api.get<LeadsListResponse>(path);
  },
};
