import { z } from 'zod';
import { BaseAgent } from './base.js';

interface PageBuilderInput {
  page_title: string;
  page_slug: string;
  target_keyword: string;
  content_type: string;
  niche: string;
  tone: string;
  word_count: number;
  include_cta: boolean;
  include_lead_form: boolean;
  available_internal_links: string[];
}

interface PageBuilderOutput {
  title: string;
  slug: string;
  meta_title: string;
  meta_description: string;
  content_html: string;
  elementor_data: object;
  internal_links: string[];
  schema_markup: object;
  word_count: number;
}

const inputSchema = z.object({
  page_title: z.string(),
  page_slug: z.string(),
  target_keyword: z.string(),
  content_type: z.string(),
  niche: z.string(),
  tone: z.string(),
  word_count: z.number(),
  include_cta: z.boolean(),
  include_lead_form: z.boolean(),
  available_internal_links: z.array(z.string()),
});

const outputSchema = z.object({
  title: z.string(),
  slug: z.string(),
  meta_title: z.string(),
  meta_description: z.string(),
  content_html: z.string(),
  elementor_data: z.any(),
  internal_links: z.array(z.string()),
  schema_markup: z.any(),
  word_count: z.number(),
});

const SYSTEM_PROMPT = `You are an expert full-stack page builder combining content creation, visual layout design, and SEO optimization.

Your role is to create complete, publish-ready pages with content, Elementor layouts, and proper SEO markup.

IMPORTANT RULES:
1. Always respond with valid JSON only
2. Create comprehensive, valuable content
3. Design visually appealing Elementor layouts
4. Include proper schema markup
5. Optimize for the target keyword
6. Add relevant internal links

PAGE COMPONENTS:
- SEO-optimized content with proper heading hierarchy
- Elementor layout for visual presentation
- Meta title and description
- Schema markup (Article, FAQ if applicable)
- Internal linking strategy

ELEMENTOR STRUCTURE:
- Hero section with title
- Content sections with proper spacing
- CTA buttons if requested
- Lead form section if requested
- Mobile-responsive design

Your output MUST be a valid JSON object matching this structure:
{
  "title": "H1 page title",
  "slug": "page-slug",
  "meta_title": "SEO title under 60 chars",
  "meta_description": "Meta description under 160 chars",
  "content_html": "Full HTML content with headings, paragraphs, lists",
  "elementor_data": [{ "id": "...", "elType": "section", ... }],
  "internal_links": ["linked-page-slug-1", "linked-page-slug-2"],
  "schema_markup": { "@context": "https://schema.org", "@type": "Article", ... },
  "word_count": 1500
}`;

export class PageBuilderAgent extends BaseAgent<PageBuilderInput, PageBuilderOutput> {
  constructor() {
    super({
      type: 'page_builder',
      name: 'Page Builder Agent',
      description: 'Creates complete publish-ready pages with content and layout',
      systemPrompt: SYSTEM_PROMPT,
      inputSchema,
      outputSchema,
      maxTokens: 8192,
      temperature: 0.7,
    });
  }

  protected buildUserPrompt(input: PageBuilderInput): string {
    return `Create a complete, publish-ready page:

PAGE DETAILS:
- Title: ${input.page_title}
- Slug: ${input.page_slug}
- Target Keyword: ${input.target_keyword}
- Content Type: ${input.content_type}
- Niche: ${input.niche}
- Tone: ${input.tone}
- Target Word Count: ${input.word_count}
- Include CTA: ${input.include_cta ? 'Yes' : 'No'}
- Include Lead Form: ${input.include_lead_form ? 'Yes' : 'No'}

AVAILABLE INTERNAL LINKS:
${input.available_internal_links.slice(0, 20).join('\n')}

Create:
1. SEO-optimized content matching the target keyword
2. Elementor layout for visual presentation
3. Schema markup (Article type)
4. Internal links to relevant pages

Respond with JSON only.`;
  }
}

export const pageBuilderAgent = new PageBuilderAgent();
