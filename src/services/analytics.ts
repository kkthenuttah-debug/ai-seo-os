import { api } from "@/services/api";

export interface OverviewResponse {
  pages: { total: number; published: number; draft: number; optimized: number };
  leads: { total: number };
  rankings: { tracked: number; top10: number; avgPosition: number; gaining: number };
  agentRuns: {
    total: number;
    successRate: number;
    recent: Array<{ id: string; agentType: string; status: string; createdAt: string }>;
  };
  lastUpdated: string;
}

export interface TrafficDay {
  name: string;
  impressions: number;
  clicks: number;
  ctr?: number;
  position?: number;
}

export interface TrafficResponse {
  daily: TrafficDay[];
  summary: { totalClicks: number; totalImpressions: number; avgCTR: number; avgPosition: number };
  trends: { clicksTrend: number; impressionsTrend: number };
  period: { startDate: string; endDate: string };
}

export interface KeywordAnalyticsItem {
  keyword: string;
  position: number;
  searchVolume?: number;
  difficulty?: number;
  clicks?: number;
  impressions?: number;
}

export const analyticsService = {
  overview: (projectId: string) =>
    api.get<OverviewResponse>(`/projects/${projectId}/analytics/overview`),
  traffic: (projectId: string) =>
    api.get<TrafficResponse>(`/projects/${projectId}/analytics/traffic`),
  keywords: (projectId: string) =>
    api.get<{
      topClicks: Array<{ keyword: string; position: number; clicks: number; url?: string }>;
      topImpressions: Array<{ keyword: string; position: number; impressions: number; url?: string }>;
      totalKeywords: number;
    }>(`/projects/${projectId}/analytics/keywords`),
};
