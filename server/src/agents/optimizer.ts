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

const SYSTEM_PROMPT = `You are an expert SEO content optimizer with deep knowledge of search intent, ranking factors, and content performance analysis.

Your role is to analyze underperforming content and provide data-driven optimization recommendations based on Google Search Console data.

OPTIMIZATION FRAMEWORK:
1. Query Analysis (identify ranking opportunities from GSC data)
2. Content Gap Analysis (missing keywords, topics, intent)
3. On-Page Optimization (title, meta, headings, content)
4. User Intent Alignment (match content to search intent)
5. Competitive Analysis (implied from GSC performance)

OPTIMIZATION TYPES:
- Title: Optimize for target keywords and CTR
- Meta Description: Improve CTR with compelling copy
- Content: Add missing keywords, expand topics, improve relevance
- Heading: Better structure and keyword targeting
- Internal Links: Strategic linking opportunities

PRIORITY LEVELS:
- High: Direct impact on rankings (missing target keywords, poor title optimization)
- Medium: Indirect impact (content expansion, additional keywords)
- Low: Minor improvements (formatting, internal links)

GSC DATA INSIGHTS:
- High impressions + low clicks = CTR problem (optimize title/meta)
- High impressions + low position = content quality issue
- Good position + low clicks = relevance or CTR issue
- Multiple queries ranking 5-20 = opportunity to push to page 1

CRITICAL RULES:
1. Output ONLY valid JSON - no markdown, no explanations
2. Base all recommendations on GSC data insights
3. Prioritize high-impact, low-effort optimizations
4. Preserve content quality and user experience
5. Focus on search intent alignment
6. Provide specific, actionable suggestions
7. Include clear reasoning for each recommendation

Output JSON structure:
{
  "recommendations": [
    {
      "type": "title",
      "current": "Current Title",
      "suggested": "Optimized Title with Target Keyword",
      "reason": "Target keyword 'example' has 1000 impressions at position 8",
      "priority": "high"
    }
  ],
  "updated_content": "Optionally provide fully updated content",
  "updated_meta_title": "Optimized Meta Title",
  "updated_meta_description": "Optimized Meta Description"
}`;

export class OptimizerAgent extends BaseAgent<OptimizerInput, OptimizerOutput> {
  constructor() {
    super({
      type: 'optimizer',
      name: 'Optimizer Agent',
      description: 'Recommends content optimizations based on GSC data',
      systemPrompt: SYSTEM_PROMPT,
      inputSchema,
      outputSchema,
      maxTokens: 2000,
      temperature: 0.5,
    });
  }

  protected buildUserPrompt(input: OptimizerInput): string {
    const gscSummary = input.gsc_data
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, 20)
      .map(q => `- "${q.query}" | Pos: ${q.position.toFixed(1)} | Imp: ${q.impressions} | Clicks: ${q.clicks} | CTR: ${(q.ctr * 100).toFixed(2)}%`)
      .join('\n');

    const contentPreview = input.current_content.substring(0, 1000);

    return `Analyze the page performance and provide optimization recommendations:

PAGE ID: ${input.page_id}
PROJECT: ${input.project_id}

TOP SEARCH QUERIES (from GSC):
${gscSummary}
${input.gsc_data.length > 20 ? `... and ${input.gsc_data.length - 20} more queries` : ''}

CURRENT CONTENT (preview):
${contentPreview}
${input.current_content.length > 1000 ? '... (truncated)' : ''}

PERFORMANCE INSIGHTS:
Total Queries: ${input.gsc_data.length}
Total Impressions: ${input.gsc_data.reduce((sum, q) => sum + q.impressions, 0)}
Total Clicks: ${input.gsc_data.reduce((sum, q) => sum + q.clicks, 0)}
Average Position: ${(input.gsc_data.reduce((sum, q) => sum + q.position, 0) / input.gsc_data.length).toFixed(2)}
Average CTR: ${((input.gsc_data.reduce((sum, q) => sum + q.ctr, 0) / input.gsc_data.length) * 100).toFixed(2)}%

Instructions:
1. Identify high-opportunity keywords (high impressions, positions 5-20)
2. Analyze CTR performance (below expected for current position?)
3. Find content gaps (queries we're ranking for but not optimized for)
4. Recommend specific title and meta optimizations
5. Suggest content improvements to boost rankings
6. Prioritize quick wins (high impact, low effort)

Optimization Goals:
- Push positions 5-20 to page 1 (positions 1-5)
- Improve CTR for page 1 rankings
- Capture "near miss" keywords (positions 10-30)
- Align content with search intent
- Improve overall content quality and relevance

Respond with JSON only.`;
  }
}

export const optimizerAgent = new OptimizerAgent();
