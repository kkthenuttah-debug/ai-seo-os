import { z } from 'zod';
import { BaseAgent } from './base.js';

interface MonitorInput {
  project_id: string;
  gsc_snapshots: Array<{
    date: string;
    total_clicks: number;
    total_impressions: number;
    average_ctr: number;
    average_position: number;
  }>;
  pages: Array<{
    slug: string;
    title: string;
    status: string;
    published_at: string | null;
  }>;
  recent_rankings: Array<{
    keyword: string;
    position: number;
    previous_position: number | null;
    url: string;
  }>;
}

interface MonitorOutput {
  health_score: number;
  summary: string;
  trends: {
    clicks_trend: 'up' | 'down' | 'stable';
    impressions_trend: 'up' | 'down' | 'stable';
    ctr_trend: 'up' | 'down' | 'stable';
    position_trend: 'up' | 'down' | 'stable';
  };
  alerts: Array<{
    type: 'warning' | 'critical' | 'opportunity';
    message: string;
    affected_pages: string[];
    recommended_action: string;
  }>;
  optimization_candidates: Array<{
    page_slug: string;
    reason: string;
    priority: 'low' | 'medium' | 'high';
  }>;
  content_suggestions: string[];
}

const inputSchema = z.object({
  project_id: z.string(),
  gsc_snapshots: z.array(z.object({
    date: z.string(),
    total_clicks: z.number(),
    total_impressions: z.number(),
    average_ctr: z.number(),
    average_position: z.number(),
  })),
  pages: z.array(z.object({
    slug: z.string(),
    title: z.string(),
    status: z.string(),
    published_at: z.string().nullable(),
  })),
  recent_rankings: z.array(z.object({
    keyword: z.string(),
    position: z.number(),
    previous_position: z.number().nullable(),
    url: z.string(),
  })),
});

const outputSchema = z.object({
  health_score: z.number(),
  summary: z.string(),
  trends: z.object({
    clicks_trend: z.enum(['up', 'down', 'stable']),
    impressions_trend: z.enum(['up', 'down', 'stable']),
    ctr_trend: z.enum(['up', 'down', 'stable']),
    position_trend: z.enum(['up', 'down', 'stable']),
  }),
  alerts: z.array(z.object({
    type: z.enum(['warning', 'critical', 'opportunity']),
    message: z.string(),
    affected_pages: z.array(z.string()),
    recommended_action: z.string(),
  })),
  optimization_candidates: z.array(z.object({
    page_slug: z.string(),
    reason: z.string(),
    priority: z.enum(['low', 'medium', 'high']),
  })),
  content_suggestions: z.array(z.string()),
});

const SYSTEM_PROMPT = `You are an expert SEO monitoring analyst specializing in identifying trends, issues, and opportunities from search performance data.

Your role is to analyze project health, identify problems early, and recommend optimization actions.

IMPORTANT RULES:
1. Always respond with valid JSON only
2. Calculate health score objectively (0-100)
3. Identify both problems and opportunities
4. Prioritize actionable recommendations
5. Consider trends over time, not just snapshots

MONITORING FOCUS:
- Traffic trends (clicks, impressions)
- CTR changes (content/snippet issues)
- Ranking movements (algorithm impacts, competition)
- Content gaps (new opportunities)
- Technical issues (drops in performance)

Your output MUST be a valid JSON object matching this structure:
{
  "health_score": 85,
  "summary": "Brief summary of project health",
  "trends": {
    "clicks_trend": "up|down|stable",
    "impressions_trend": "up|down|stable",
    "ctr_trend": "up|down|stable",
    "position_trend": "up|down|stable"
  },
  "alerts": [
    {
      "type": "warning|critical|opportunity",
      "message": "description of alert",
      "affected_pages": ["page-slug-1", "page-slug-2"],
      "recommended_action": "what to do"
    }
  ],
  "optimization_candidates": [
    {
      "page_slug": "page-to-optimize",
      "reason": "why this page needs optimization",
      "priority": "low|medium|high"
    }
  ],
  "content_suggestions": ["new topic idea 1", "new topic idea 2"]
}`;

export class MonitorAgent extends BaseAgent<MonitorInput, MonitorOutput> {
  constructor() {
    super({
      type: 'monitor',
      name: 'Monitor Agent',
      description: 'Monitors project health and identifies optimization opportunities',
      systemPrompt: SYSTEM_PROMPT,
      inputSchema,
      outputSchema,
      maxTokens: 4096,
      temperature: 0.5,
    });
  }

  protected buildUserPrompt(input: MonitorInput): string {
    const snapshotsSummary = input.gsc_snapshots
      .slice(0, 14)
      .map(s => `${s.date}: ${s.total_clicks} clicks, ${s.total_impressions} impr, ${(s.average_ctr * 100).toFixed(2)}% CTR, pos ${s.average_position.toFixed(1)}`)
      .join('\n');

    const rankingSummary = input.recent_rankings
      .slice(0, 20)
      .map(r => {
        const change = r.previous_position ? r.previous_position - r.position : 0;
        const arrow = change > 0 ? '↑' : change < 0 ? '↓' : '→';
        return `"${r.keyword}": pos ${r.position} (${arrow}${Math.abs(change)})`;
      })
      .join('\n');

    return `Analyze the health and performance of this SEO project:

GSC PERFORMANCE (Last 14 days):
${snapshotsSummary}

PUBLISHED PAGES: ${input.pages.filter(p => p.status === 'published').length} of ${input.pages.length}

RANKING MOVEMENTS:
${rankingSummary}

Please provide:
1. Overall health score (0-100)
2. Trend analysis
3. Any alerts or warnings
4. Pages that need optimization
5. New content suggestions

Respond with JSON only.`;
  }
}

export const monitorAgent = new MonitorAgent();
