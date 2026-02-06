import { api } from "@/services/api";
import type { ApiResponse } from "@/types/api";

export const integrationsService = {
  connectWordPress: (payload: { domain: string; username: string; password: string }) =>
    api.post<ApiResponse<null>>("/integrations/wordpress", payload),
  connectGsc: (payload: { siteUrl: string; code: string }) =>
    api.post<ApiResponse<null>>("/integrations/gsc", payload),
  getStatus: () => api.get<ApiResponse<Record<string, unknown>>>("/integrations/status"),
};
