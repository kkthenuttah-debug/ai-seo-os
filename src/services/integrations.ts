import { api } from "@/services/api";

export interface IntegrationFromApi {
  type: string;
  status: string;
  last_sync_at: string | null;
  data: Record<string, unknown>;
}

export const integrationsService = {
  list: (projectId: string) =>
    api.get<IntegrationFromApi[]>(`/projects/${projectId}/integrations`),
  connectWordPress: (projectId: string, payload: { siteUrl: string; username: string; applicationPassword: string }) =>
    api.post<{ success: boolean }>(`/projects/${projectId}/integrations/wordpress`, payload),
  connectGsc: (projectId: string) =>
    api.post<{ url: string }>(`/projects/${projectId}/integrations/gsc`, {}),
  syncGsc: (projectId: string) =>
    api.post<{ success: boolean; snapshotCount?: number; syncedAt?: string }>(
      `/projects/${projectId}/rankings/sync`,
      {}
    ),
};
