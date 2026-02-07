import { api } from "@/services/api";

export interface RankingFromApi {
  id: string;
  keyword: string;
  position: number;
  search_volume?: number;
  difficulty?: number;
  url?: string;
  tracked_at: string;
  project_id: string;
}

export interface RankingsListResponse {
  rankings: RankingFromApi[];
  total: number;
  limit: number;
  offset: number;
}

export const rankingsService = {
  list: (
    projectId: string,
    params?: {
      search?: string;
      positionFilter?: string;
      sort?: string;
      limit?: number;
      offset?: number;
    }
  ) => {
    const q = new URLSearchParams();
    if (params?.search) q.set("search", params.search);
    if (params?.positionFilter) q.set("positionFilter", params.positionFilter);
    if (params?.sort) q.set("sort", params.sort);
    if (params?.limit != null) q.set("limit", String(params.limit));
    if (params?.offset != null) q.set("offset", String(params.offset));
    const path = q.toString() ? `/projects/${projectId}/rankings?${q}` : `/projects/${projectId}/rankings`;
    return api.get<RankingsListResponse>(path);
  },
};
