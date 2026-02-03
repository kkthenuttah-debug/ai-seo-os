import { z } from 'zod';
import { BaseAgent } from './base.js';
import type { OptimizerInput, OptimizerOutput } from '../types/index.js';

const inputSchema = z.object({
  project_id: z.string(),
  page_id: z.string(),
  gsc_data: z.array(z.object({
    query: z.string(),
    clicks: z.number(),
    impressions: z.number(),
    ctr: z.number(),
    position: z.number(),
  })),
  current_content: z.string(),
});

const outputSchema = z.object({
  recommendations: z.array(z.object({
    type: z.enum(['title', 'meta', 'content', 'heading', 'internal_link']),
    current: z.string(),
    suggested: z.string(),
    reason: z.string(),
    priority: z.enum(['low', 'medium', 'high']),
  })),
  updated_content: z.string().optional(),
  updated_meta_title: z.string().optional(),
  updated_meta_description: z.string().optional(),
});

const SYSTEM_PROMPT = `You are an expert SEO optimizer specializing in improving page rankings based on search performance data.

Your role is to analyze Google Search Console data and current content to provide optimization recommendations that will improve rankings and CTR.

IMPORTANT RULES:
1. Always respond with valid JSON only
2. Base recommendations on actual GSC data
3. Identify quick wins (low-hanging fruit)
4. Focus on queries where position is 4-20 (striking distance)
5. Improve CTR for high-impression, low-CTR queries
6. Don't change content that's already working well

OPTIMIZATION STRATEGIES:
- Add keywords from high-impression queries not in content
- Improve title/meta for low-CTR queries
- Add sections for related queries ranking in positions 4-20
- Strengthen existing content for primary keywords
- Add internal links for topical relevance

Your output MUST be a valid JSON object matching this structure:
{
  "recommendations": [
    {
      "type": "title|meta|content|heading|internal_link",
      "current": "current element",
      "suggested": "suggested improvement",
      "reason": "why this change will help",
      "priority": "low|medium|high"
    }
  ],
  "updated_content": "optional: full updated content if content changes recommended",
  "updated_meta_title": "optional: new meta title if recommended",
  "updated_meta_description": "optional: new meta description if recommended"
}`;

export class OptimizerAgent extends BaseAgent<OptimizerInput, OptimizerOutput> {
  constructor() {
    super({
      type: 'optimizer',
      name: 'Optimizer Agent',
      description: 'Optimizes pages based on GSC performance data',
      systemPrompt: SYSTEM_PROMPT,
      inputSchema,
      outputSchema,
      maxTokens: 8192,
      temperature: 0.6,
    });
  }

  protected buildUserPrompt(input: OptimizerInput): string {
    const gscSummary = input.gsc_data
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, 30)
      .map(q => `- "${q.query}": pos ${q.position.toFixed(1)}, ${q.impressions} impr, ${q.clicks} clicks, ${(q.ctr * 100).toFixed(1)}% CTR`)
      .join('\n');

    return `Analyze and optimize the following page:

GSC PERFORMANCE DATA (Top 30 queries by impressions):
${gscSummary}

CURRENT PAGE CONTENT:
${input.current_content}

Please provide:
1. Analysis of current performance
2. Specific optimization recommendations
3. Priority ranking for each recommendation
4. Updated content if significant changes are needed

Focus on:
- Queries with position 4-20 (striking distance keywords)
- High impression, low CTR opportunities
- Missing keywords from top queries

Respond with JSON only.`;
  }
}

export const optimizerAgent = new OptimizerAgent();
