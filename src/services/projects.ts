import { api } from "@/services/api";
import type { Project } from "@/types/models";

export interface ProjectsListResponse {
  projects: Array<{ id: string; name: string; domain: string; status: string; updated_at: string }>;
  total: number;
  page: number;
  limit: number;
}

/** Full project as returned by API (includes settings) */
export interface ProjectFull extends Project {
  settings?: Record<string, unknown>;
}

function toProject(p: ProjectsListResponse["projects"][0]): Project {
  return {
    id: p.id,
    name: p.name,
    domain: p.domain,
    status: p.status === "active" || p.status === "paused" ? p.status : "active",
    updatedAt: p.updated_at,
  };
}

export const projectsService = {
  list: async (params?: { page?: number; limit?: number; status?: string }) => {
    const q = new URLSearchParams();
    if (params?.page != null) q.set("page", String(params.page));
    if (params?.limit != null) q.set("limit", String(params.limit));
    if (params?.status) q.set("status", params.status);
    const path = q.toString() ? `/projects?${q}` : "/projects";
    const res = await api.get<ProjectsListResponse>(path);
    return { ...res, projects: res.projects.map(toProject) };
  },
  get: (projectId: string) => api.get<Project & { updated_at?: string }>(`/projects/${projectId}`).then((p) => toProject({ ...p, updated_at: p.updated_at ?? p.updatedAt ?? "" })),
  /** Get full project including settings (for Settings page) */
  getFull: (projectId: string) =>
    api.get<ProjectFull & { updated_at?: string }>(`/projects/${projectId}`).then((p) => ({
      ...toProject({ ...p, updated_at: p.updated_at ?? p.updatedAt ?? "" }),
      settings: p.settings ?? {},
    })) as Promise<ProjectFull>,
  create: (payload: { name: string; domain: string; description?: string; settings?: Record<string, unknown> }) =>
    api.post<Project & { updated_at?: string }>("/projects", payload).then((p) => toProject({ ...p, updated_at: p.updated_at ?? p.updatedAt ?? "" })),
  update: (projectId: string, payload: Partial<Project> & { settings?: Record<string, unknown> }) =>
    api.patch<Project & { updated_at?: string }>(`/projects/${projectId}`, payload).then((p) => toProject({ ...p, updated_at: p.updated_at ?? p.updatedAt ?? "" })),
  delete: (projectId: string) => api.delete<null>(`/projects/${projectId}`),
  startLoop: (projectId: string) => api.post<{ success: boolean }>(`/projects/${projectId}/start-loop`, {}),
  pause: (projectId: string) => api.post<{ success: boolean }>(`/projects/${projectId}/pause`, {}),
  /** Schedule publish jobs for all pages with status "ready" */
  publishReady: (projectId: string) =>
    api.post<{ success: boolean; message: string; scheduled: number }>(`/projects/${projectId}/publish-ready`, {}),
};
