import { z } from 'zod';
import { BaseAgent } from './base.js';
import type { InternalLinkerInput, InternalLinkerOutput } from './types/agents.js';

const inputSchema = z.object({
  content: z.string().min(100),
  existingPages: z.array(z.object({
    title: z.string(),
    slug: z.string(),
    url: z.string(),
    keywords: z.array(z.string()),
  })),
  currentPageTitle: z.string(),
});

const outputSchema = z.object({
  suggestions: z.array(z.object({
    anchor: z.string(),
    targetUrl: z.string(),
    targetTitle: z.string(),
    position: z.number(),
    contextBefore: z.string(),
    contextAfter: z.string(),
    relevanceScore: z.number().min(0).max(100),
  })),
  totalSuggestions: z.number(),
});

const SYSTEM_PROMPT = `You are an expert SEO internal linking specialist with deep knowledge of link building strategies and user experience.

Your role is to analyze content and identify strategic opportunities for internal linking that:
1. Enhance user navigation and experience
2. Distribute page authority effectively
3. Strengthen topical relevance
4. Use natural, contextually appropriate anchor text
5. Follow SEO best practices

CRITICAL RULES:
1. Output ONLY valid JSON - no markdown, no explanations
2. Suggest only highly relevant internal links
3. Use natural anchor text that fits the context
4. Prioritize links to topically related pages
5. Avoid over-optimization (max 2-3 links per 500 words)
6. Ensure anchor text matches the target page topic
7. Consider user intent and content flow
8. Calculate relevance score based on topic match and context

Output JSON structure:
{
  "suggestions": [
    {
      "anchor": "natural anchor text",
      "targetUrl": "/target-page-url",
      "targetTitle": "Target Page Title",
      "position": 0,
      "contextBefore": "text before link",
      "contextAfter": "text after link",
      "relevanceScore": 85
    }
  ],
  "totalSuggestions": 0
}`;

export class InternalLinkerAgent extends BaseAgent<InternalLinkerInput, InternalLinkerOutput> {
  constructor() {
    super({
      type: 'internal_linker',
      name: 'Internal Linker Agent',
      description: 'Identifies and suggests strategic internal links within content',
      systemPrompt: SYSTEM_PROMPT,
      inputSchema,
      outputSchema,
      maxTokens: 1000,
      temperature: 0.5,
    });
  }

  protected buildUserPrompt(input: InternalLinkerInput): string {
    const pagesList = input.existingPages
      .map(p => `- ${p.title} (${p.url}) - Keywords: ${p.keywords.join(', ')}`)
      .join('\n');

    return `Analyze the following content and identify strategic internal linking opportunities.

CURRENT PAGE: ${input.currentPageTitle}

CONTENT TO ANALYZE:
${input.content}

AVAILABLE PAGES FOR LINKING:
${pagesList}

Instructions:
1. Find natural places in the content where internal links would add value
2. Match anchor text to target page topics
3. Provide surrounding context for each suggestion
4. Calculate relevance score (0-100) based on topical match
5. Suggest only high-quality, relevant links (relevance score > 60)
6. Return suggestions ordered by position in content

Respond with JSON only.`;
  }
}

export const internalLinkerAgent = new InternalLinkerAgent();
