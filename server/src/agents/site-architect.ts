import { z } from 'zod';
import { BaseAgent } from './base.js';
import type { MarketResearchOutput, SiteArchitectOutput } from '../types/index.js';

interface SiteArchitectInput {
  niche: string;
  target_audience: string;
  market_research: MarketResearchOutput;
  domain: string;
}

const inputSchema = z.object({
  niche: z.string(),
  target_audience: z.string(),
  market_research: z.any(),
  domain: z.string(),
});

const outputSchema = z.object({
  site_structure: z.object({
    homepage: z.object({
      title: z.string(),
      meta_description: z.string(),
      sections: z.array(z.string()),
    }),
    categories: z.array(z.object({
      name: z.string(),
      slug: z.string(),
      description: z.string(),
      pages: z.array(z.object({
        title: z.string(),
        slug: z.string(),
        target_keyword: z.string(),
        content_type: z.string(),
      })),
    })),
  }),
  internal_link_strategy: z.object({
    hub_pages: z.array(z.string()),
    pillar_content: z.array(z.string()),
    link_clusters: z.array(z.object({
      hub: z.string(),
      spokes: z.array(z.string()),
    })),
  }),
  technical_requirements: z.object({
    schema_types: z.array(z.string()),
    required_plugins: z.array(z.string()),
    performance_targets: z.any(),
  }),
});

const SYSTEM_PROMPT = `You are an expert SEO site architect specializing in creating website structures that rank well in search engines.

Your role is to design comprehensive site architectures with optimal internal linking strategies, content hierarchies, and technical SEO foundations.

IMPORTANT RULES:
1. Always respond with valid JSON only - no markdown, no explanations
2. Create a flat site structure (max 3 clicks from homepage)
3. Design for topical authority with hub and spoke models
4. Plan for internal linking from the start
5. Include schema markup recommendations
6. Focus on user experience and crawlability

Your output MUST be a valid JSON object matching this structure:
{
  "site_structure": {
    "homepage": {
      "title": "SEO optimized title",
      "meta_description": "Compelling meta description",
      "sections": ["hero", "features", "testimonials", "cta"]
    },
    "categories": [
      {
        "name": "Category Name",
        "slug": "category-slug",
        "description": "Category description",
        "pages": [
          {
            "title": "Page Title",
            "slug": "page-slug",
            "target_keyword": "target keyword",
            "content_type": "guide|article|comparison|review|tool"
          }
        ]
      }
    ]
  },
  "internal_link_strategy": {
    "hub_pages": ["hub-page-slug-1", "hub-page-slug-2"],
    "pillar_content": ["pillar-1", "pillar-2"],
    "link_clusters": [
      {
        "hub": "hub-page-slug",
        "spokes": ["spoke-1", "spoke-2", "spoke-3"]
      }
    ]
  },
  "technical_requirements": {
    "schema_types": ["Organization", "WebSite", "Article", "FAQPage"],
    "required_plugins": ["RankMath", "WP Rocket"],
    "performance_targets": {
      "lcp": "< 2.5s",
      "fid": "< 100ms",
      "cls": "< 0.1"
    }
  }
}`;

export class SiteArchitectAgent extends BaseAgent<SiteArchitectInput, SiteArchitectOutput> {
  constructor() {
    super({
      type: 'site_architect',
      name: 'Site Architect Agent',
      description: 'Designs website structure and internal linking strategy',
      systemPrompt: SYSTEM_PROMPT,
      inputSchema,
      outputSchema,
      maxTokens: 8192,
      temperature: 0.6,
    });
  }

  protected buildUserPrompt(input: SiteArchitectInput): string {
    return `Design a comprehensive website architecture for the following:

DOMAIN: ${input.domain}
NICHE: ${input.niche}
TARGET AUDIENCE: ${input.target_audience}

MARKET RESEARCH INSIGHTS:
- Keywords: ${input.market_research.keyword_opportunities.slice(0, 10).map(k => k.keyword).join(', ')}
- Content Gaps: ${input.market_research.content_gaps.join(', ')}
- Recommended Topics: ${input.market_research.recommended_topics.join(', ')}

Please design:
1. Complete site structure with homepage and category pages
2. At least 20-30 content pages across categories
3. Internal linking strategy with hub and spoke model
4. Technical SEO requirements

Each page should target a specific keyword from the research.
Respond with JSON only.`;
  }
}

export const siteArchitectAgent = new SiteArchitectAgent();
