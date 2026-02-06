import { z } from 'zod';
import { BaseAgent } from './base.js';
import type { MonitorInput, MonitorOutput } from './types/agents.js';

const inputSchema = z.object({
  projectId: z.string(),
  gscSnapshots: z.array(z.object({
    date: z.string(),
    totalClicks: z.number(),
    totalImpressions: z.number(),
    averageCtr: z.number(),
    averagePosition: z.number(),
  })),
  pages: z.array(z.object({
    pageId: z.string(),
    url: z.string(),
    targetKeyword: z.string(),
  })),
});

const outputSchema = z.object({
  rankings: z.array(z.object({
    keyword: z.string(),
    position: z.number(),
    previousPosition: z.number().nullable(),
    change: z.number(),
    url: z.string(),
    pageId: z.string(),
  })),
  trends: z.array(z.object({
    metric: z.string(),
    direction: z.enum(['up', 'down', 'stable']),
    changePercentage: z.number(),
    analysis: z.string(),
  })),
  alerts: z.array(z.object({
    type: z.enum(['warning', 'critical', 'info']),
    message: z.string(),
    pageId: z.string().optional(),
    keyword: z.string().optional(),
    actionRequired: z.boolean(),
  })),
  recommendations: z.array(z.object({
    type: z.string(),
    pageId: z.string().optional(),
    suggestion: z.string(),
    priority: z.enum(['high', 'medium', 'low']),
  })),
});

const SYSTEM_PROMPT = `You are an expert SEO performance analyst with deep expertise in Google Search Console data analysis and ranking optimization.

Your role is to monitor search performance, identify trends, detect issues, and provide actionable recommendations.

MONITORING AREAS:
1. Keyword Rankings (position changes, opportunities, threats)
2. Traffic Trends (clicks, impressions, CTR, position)
3. Page Performance (individual page metrics)
4. Anomaly Detection (sudden drops, spikes, unusual patterns)
5. Competitive Analysis (visibility changes, new competitors)

ALERT TYPES:
- Critical: Urgent issues requiring immediate action (major ranking drops, indexation errors)
- Warning: Issues that need attention (declining CTR, slow position drops)
- Info: Positive developments or minor observations (ranking improvements, new keywords)

TREND ANALYSIS:
- Compare current vs. previous period (day, week, month)
- Identify patterns and seasonality
- Detect anomalies and outliers
- Project future performance

CRITICAL RULES:
1. Output ONLY valid JSON - no markdown, no explanations
2. Analyze trends over time, not just point-in-time data
3. Provide context for all alerts and recommendations
4. Prioritize actionable insights
5. Calculate percentage changes accurately
6. Flag issues before they become critical
7. Suggest specific optimization actions

THRESHOLDS FOR ALERTS:
- Critical: >30% drop in clicks or >10 position drop
- Warning: 15-30% drop in clicks or 5-10 position drop
- Info: Positive trends or <15% changes

Output JSON structure:
{
  "rankings": [
    {
      "keyword": "target keyword",
      "position": 5.2,
      "previousPosition": 7.8,
      "change": -2.6,
      "url": "/page-url",
      "pageId": "page-id"
    }
  ],
  "trends": [
    {
      "metric": "clicks",
      "direction": "up",
      "changePercentage": 15.5,
      "analysis": "Traffic increased by 15.5% compared to last period"
    }
  ],
  "alerts": [
    {
      "type": "warning",
      "message": "CTR declined by 20% for 'target keyword'",
      "pageId": "page-id",
      "keyword": "target keyword",
      "actionRequired": true
    }
  ],
  "recommendations": [
    {
      "type": "optimization",
      "pageId": "page-id",
      "suggestion": "Update meta description to improve CTR",
      "priority": "high"
    }
  ]
}`;

export class MonitorAgent extends BaseAgent<MonitorInput, MonitorOutput> {
  constructor() {
    super({
      type: 'monitor',
      name: 'Monitor Agent',
      description: 'Tracks rankings, analyzes GSC data, and generates alerts',
      systemPrompt: SYSTEM_PROMPT,
      inputSchema,
      outputSchema,
      maxTokens: 1000,
      temperature: 0.3,
    });
  }

  protected buildUserPrompt(input: MonitorInput): string {
    const snapshotSummary = input.gscSnapshots
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 7)
      .map(s => `${s.date}: ${s.totalClicks} clicks, ${s.totalImpressions} impressions, ${s.averageCtr.toFixed(2)}% CTR, pos ${s.averagePosition.toFixed(1)}`)
      .join('\n');

    const pagesList = input.pages
      .slice(0, 20)
      .map(p => `- ${p.url} (${p.targetKeyword})`)
      .join('\n');

    return `Analyze search performance and provide monitoring insights:

PROJECT: ${input.projectId}

RECENT PERFORMANCE (last 7 days):
${snapshotSummary}

TRACKED PAGES (${input.pages.length} total):
${pagesList}
${input.pages.length > 20 ? `... and ${input.pages.length - 20} more pages` : ''}

Instructions:
1. Analyze trends in clicks, impressions, CTR, and position
2. Compare recent performance to previous periods
3. Identify significant changes (>15% increase or decrease)
4. Generate alerts for concerning trends
5. Provide specific recommendations for optimization
6. Prioritize actions by impact and urgency

Analysis Focus:
- Are rankings improving or declining?
- Is CTR above or below expected levels?
- Are there new ranking opportunities?
- Are any pages underperforming?
- What optimization actions should be taken?

Respond with JSON only.`;
  }
}

export const monitorAgent = new MonitorAgent();
