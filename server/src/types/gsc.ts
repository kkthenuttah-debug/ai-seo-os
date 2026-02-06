export interface SearchFilter {
  dimension: string;
  operator: 'equals' | 'contains' | 'notContains' | 'notEquals' | 'includingRegex' | 'excludingRegex';
  expression: string;
}

export interface SearchAnalyticsOptions {
  startDate: string;
  endDate: string;
  dimensions?: string[];
  filters?: SearchFilter[];
  rowLimit?: number;
  searchType?: 'web' | 'image' | 'video' | 'discover' | 'news';
}

export interface SearchAnalyticsRow {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface SearchAnalyticsData {
  startDate: string;
  endDate: string;
  rows: SearchAnalyticsRow[];
  totalClicks: number;
  totalImpressions: number;
  averageCtr: number;
  averagePosition: number;
}

export interface GSCSnapshot {
  projectId: string;
  query: string;
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  snapshotDate: Date;
}

export interface Page {
  url: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface QueryData {
  query: string;
  rows: SearchAnalyticsRow[];
}

export interface PageData {
  page: string;
  rows: SearchAnalyticsRow[];
}
