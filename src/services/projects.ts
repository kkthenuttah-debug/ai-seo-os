import { api } from "@/services/api";
import type { ApiResponse } from "@/types/api";
import type { Project } from "@/types/models";

export const projectsService = {
  list: () => api.get<ApiResponse<Project[]>>("/projects"),
  get: (projectId: string) => api.get<ApiResponse<Project>>(`/projects/${projectId}`),
  create: (payload: Partial<Project>) => api.post<ApiResponse<Project>>("/projects", payload),
  update: (projectId: string, payload: Partial<Project>) =>
    api.patch<ApiResponse<Project>>(`/projects/${projectId}`, payload),
  delete: (projectId: string) => api.delete<ApiResponse<null>>(`/projects/${projectId}`),
};
