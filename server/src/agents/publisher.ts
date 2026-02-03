import { z } from 'zod';
import { BaseAgent } from './base.js';

interface PublisherInput {
  page_title: string;
  page_slug: string;
  content_html: string;
  meta_title: string;
  meta_description: string;
  target_keyword: string;
}

interface PublisherOutput {
  publish_ready: boolean;
  seo_checklist: Array<{
    item: string;
    passed: boolean;
    recommendation?: string;
  }>;
  final_meta_title: string;
  final_meta_description: string;
  focus_keyword: string;
  secondary_keywords: string[];
  estimated_reading_time: number;
  content_quality_score: number;
}

const inputSchema = z.object({
  page_title: z.string(),
  page_slug: z.string(),
  content_html: z.string(),
  meta_title: z.string(),
  meta_description: z.string(),
  target_keyword: z.string(),
});

const outputSchema = z.object({
  publish_ready: z.boolean(),
  seo_checklist: z.array(z.object({
    item: z.string(),
    passed: z.boolean(),
    recommendation: z.string().optional(),
  })),
  final_meta_title: z.string(),
  final_meta_description: z.string(),
  focus_keyword: z.string(),
  secondary_keywords: z.array(z.string()),
  estimated_reading_time: z.number(),
  content_quality_score: z.number(),
});

const SYSTEM_PROMPT = `You are an expert SEO quality assurance specialist preparing content for publication.

Your role is to perform final checks, optimize meta tags, and ensure content meets SEO best practices before publishing.

IMPORTANT RULES:
1. Always respond with valid JSON only
2. Perform comprehensive SEO checklist
3. Optimize meta title and description for CTR
4. Verify keyword optimization
5. Calculate content quality score (0-100)
6. Only mark as publish-ready if all critical items pass

SEO CHECKLIST ITEMS:
- Keyword in title
- Keyword in meta description
- Keyword in first 100 words
- Keyword in at least one H2
- Meta title under 60 characters
- Meta description under 160 characters
- Content has proper heading structure (H1, H2, H3)
- Content is at least 300 words
- Content has internal links
- Content has external links (optional)
- Images have alt text (if applicable)
- No duplicate content signals
- Readable content (short paragraphs, bullets)

Your output MUST be a valid JSON object matching this structure:
{
  "publish_ready": true,
  "seo_checklist": [
    { "item": "Keyword in title", "passed": true },
    { "item": "Meta title under 60 chars", "passed": false, "recommendation": "Shorten to..." }
  ],
  "final_meta_title": "Optimized meta title",
  "final_meta_description": "Optimized meta description with call to action",
  "focus_keyword": "main keyword",
  "secondary_keywords": ["related1", "related2"],
  "estimated_reading_time": 5,
  "content_quality_score": 85
}`;

export class PublisherAgent extends BaseAgent<PublisherInput, PublisherOutput> {
  constructor() {
    super({
      type: 'publisher',
      name: 'Publisher Agent',
      description: 'Performs final SEO checks before publishing',
      systemPrompt: SYSTEM_PROMPT,
      inputSchema,
      outputSchema,
      maxTokens: 4096,
      temperature: 0.3,
    });
  }

  protected buildUserPrompt(input: PublisherInput): string {
    return `Perform final SEO checks on this page before publishing:

PAGE TITLE: ${input.page_title}
PAGE SLUG: ${input.page_slug}
TARGET KEYWORD: ${input.target_keyword}

META TITLE: ${input.meta_title}
META DESCRIPTION: ${input.meta_description}

CONTENT:
${input.content_html}

Please:
1. Run through the complete SEO checklist
2. Optimize meta title and description for CTR
3. Identify focus and secondary keywords
4. Calculate content quality score
5. Determine if page is ready to publish

Respond with JSON only.`;
  }
}

export const publisherAgent = new PublisherAgent();
