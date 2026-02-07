import { z } from 'zod';
import { BaseAgent } from './base.js';
import type { MarketResearchInput, MarketResearchOutput } from '../types/index.js';

const inputSchema = z.object({
  niche: z.string().min(1, 'Niche is required').or(z.literal('').transform(() => 'General')),
  target_audience: z.string().min(1, 'Target audience is required').or(z.literal('').transform(() => 'General audience')),
  competitors: z.array(z.string()).optional(),
});

const outputSchema = z.object({
  market_analysis: z.object({
    market_size: z.string(),
    trends: z.array(z.string()),
    opportunities: z.array(z.string()),
    challenges: z.array(z.string()),
  }),
  competitor_analysis: z.object({
    competitors: z.array(z.object({
      name: z.string(),
      url: z.string(),
      strengths: z.array(z.string()),
      weaknesses: z.array(z.string()),
    })),
  }),
  keyword_opportunities: z.array(z.object({
    keyword: z.string(),
    intent: z.enum(['informational', 'transactional', 'navigational', 'commercial']),
    difficulty: z.enum(['low', 'medium', 'high']),
    potential: z.enum(['low', 'medium', 'high']),
  })),
  content_gaps: z.array(z.string()),
  recommended_topics: z.array(z.string()),
});

const SYSTEM_PROMPT = `You are an expert SEO market research analyst with deep expertise in competitive analysis, keyword research, and content strategy.

Your role is to analyze markets, identify opportunities, and provide actionable insights for building high-ranking websites.

IMPORTANT RULES:
1. Always respond with valid JSON only - no markdown, no explanations
2. Be specific and actionable in your recommendations
3. Focus on realistic, achievable opportunities
4. Prioritize low-competition, high-value keywords
5. Consider search intent in all recommendations

Your output MUST be a valid JSON object matching this structure:
{
  "market_analysis": {
    "market_size": "description of market size and potential",
    "trends": ["trend1", "trend2", ...],
    "opportunities": ["opportunity1", "opportunity2", ...],
    "challenges": ["challenge1", "challenge2", ...]
  },
  "competitor_analysis": {
    "competitors": [
      {
        "name": "competitor name",
        "url": "competitor url",
        "strengths": ["strength1", "strength2"],
        "weaknesses": ["weakness1", "weakness2"]
      }
    ]
  },
  "keyword_opportunities": [
    {
      "keyword": "keyword phrase",
      "intent": "informational|transactional|navigational|commercial",
      "difficulty": "low|medium|high",
      "potential": "low|medium|high"
    }
  ],
  "content_gaps": ["gap1", "gap2", ...],
  "recommended_topics": ["topic1", "topic2", ...]
}`;

export class MarketResearchAgent extends BaseAgent<MarketResearchInput, MarketResearchOutput> {
  constructor() {
    super({
      type: 'market_research',
      name: 'Market Research Agent',
      description: 'Analyzes markets, competitors, and identifies keyword opportunities',
      systemPrompt: SYSTEM_PROMPT,
      inputSchema,
      outputSchema,
      maxTokens: 4096,
      temperature: 0.7,
    });
  }

  protected buildUserPrompt(input: MarketResearchInput): string {
    let prompt = `Analyze the following market and provide comprehensive research:

NICHE: ${input.niche}
TARGET AUDIENCE: ${input.target_audience}`;

    if (input.competitors && input.competitors.length > 0) {
      prompt += `\n\nKNOWN COMPETITORS:\n${input.competitors.map(c => `- ${c}`).join('\n')}`;
    }

    prompt += `

Please provide:
1. Market analysis with size estimation, trends, opportunities, and challenges
2. Competitor analysis (analyze at least 3-5 competitors)
3. At least 20 keyword opportunities with intent, difficulty, and potential
4. Content gaps in the market
5. Recommended topics for content creation

Respond with JSON only.`;

    return prompt;
  }
}

export const marketResearchAgent = new MarketResearchAgent();
