export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Project {
  id: string;
  name: string;
  domain: string;
  status: "active" | "paused";
  updatedAt: string;
}

export interface Page {
  id: string;
  title: string;
  slug: string;
  status: "draft" | "published";
  publishedAt?: string;
  createdAt: string;
}

export interface AgentRun {
  id: string;
  agent: string;
  status: "running" | "queued" | "failed" | "completed";
  duration: string;
  summary: string;
}

export interface KeywordRanking {
  id: string;
  keyword: string;
  position: number;
  change: string;
  volume: number;
  difficulty: string;
}

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  source: string;
  capturedAt: string;
}
