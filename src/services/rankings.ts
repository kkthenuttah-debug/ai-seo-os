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
  previous_position?: number;
  position_change?: number;
  clicks?: number;
  impressions?: number;
  ctr?: number;
}

export interface RankingsListResponse {
  rankings: RankingFromApi[];
  total: number;
  limit: number;
  offset: number;
}

export interface RankingHistoryItem {
  date: string;
  position: number;
  clicks: number;
  impressions: number;
  ctr: number;
}

export interface RankingHistoryResponse {
  keyword: string;
  keywordId: string;
  history: RankingHistoryItem[];
  startDate: string;
  endDate: string;
}

export interface SyncResponse {
  success: boolean;
  snapshotCount: number;
  syncedAt: string;
}

export interface RankingInsightItem {
  keyword: string;
  position: number;
  change?: number;
  url?: string;
  volume?: number;
  createdAt?: string;
  potentialTraffic?: number;
}

export interface RankingsInsightsResponse {
  gaining: RankingInsightItem[];
  losing: RankingInsightItem[];
  newKeywords: RankingInsightItem[];
  opportunities: RankingInsightItem[];
  summary: {
    totalGaining: number;
    totalLosing: number;
    totalNew: number;
    totalOpportunities: number;
  };
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
  // Get keyword history for trend chart
  history: (projectId: string, keywordId: string) =>
    api.get<RankingHistoryResponse>(`/projects/${projectId}/rankings/${keywordId}/history`),
  // Sync rankings with Google Search Console
  sync: (projectId: string) =>
    api.post<SyncResponse>(`/projects/${projectId}/rankings/sync`),
  // Get insights (gainers, losers, opportunities)
  insights: (projectId: string) =>
    api.get<RankingsInsightsResponse>(`/projects/${projectId}/rankings/insights`),
  // Export rankings to CSV
  export: (projectId: string, rankingIds?: string[]) => {
    const path = rankingIds?.length
      ? `/projects/${projectId}/rankings/export?ids=${rankingIds.join(',')}`
      : `/projects/${projectId}/rankings/export`;
    return api.get<{ csv: string; filename: string }>(path);
  },
};
