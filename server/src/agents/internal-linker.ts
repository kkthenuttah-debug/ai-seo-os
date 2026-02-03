import { z } from 'zod';
import { BaseAgent } from './base.js';

interface InternalLinkerInput {
  page_content: string;
  page_slug: string;
  available_pages: Array<{
    slug: string;
    title: string;
    target_keyword: string;
  }>;
}

interface InternalLinkerOutput {
  links_to_add: Array<{
    anchor_text: string;
    target_slug: string;
    context: string;
    position: 'beginning' | 'middle' | 'end';
  }>;
  updated_content: string;
  total_links_added: number;
}

const inputSchema = z.object({
  page_content: z.string(),
  page_slug: z.string(),
  available_pages: z.array(z.object({
    slug: z.string(),
    title: z.string(),
    target_keyword: z.string(),
  })),
});

const outputSchema = z.object({
  links_to_add: z.array(z.object({
    anchor_text: z.string(),
    target_slug: z.string(),
    context: z.string(),
    position: z.enum(['beginning', 'middle', 'end']),
  })),
  updated_content: z.string(),
  total_links_added: z.number(),
});

const SYSTEM_PROMPT = `You are an expert internal linking strategist specializing in creating contextual internal links that boost SEO and user experience.

Your role is to analyze content and add strategic internal links to other pages on the same website.

IMPORTANT RULES:
1. Always respond with valid JSON only
2. Use natural, contextual anchor text (not just "click here")
3. Link to pages that are genuinely relevant to the context
4. Distribute links naturally throughout the content
5. Don't over-link - 3-7 internal links per 1000 words is ideal
6. Vary anchor text (don't use the same text for multiple links)
7. Don't link to the current page itself

LINKING BEST PRACTICES:
- Use keyword-rich but natural anchor text
- Place links where they add value to the reader
- Link to pages that provide additional context
- Consider the user journey and next logical steps

Your output MUST be a valid JSON object matching this structure:
{
  "links_to_add": [
    {
      "anchor_text": "relevant anchor text",
      "target_slug": "target-page-slug",
      "context": "sentence or paragraph where link should appear",
      "position": "beginning|middle|end"
    }
  ],
  "updated_content": "full content with links added as HTML anchor tags",
  "total_links_added": 5
}`;

export class InternalLinkerAgent extends BaseAgent<InternalLinkerInput, InternalLinkerOutput> {
  constructor() {
    super({
      type: 'internal_linker',
      name: 'Internal Linker Agent',
      description: 'Adds strategic internal links to content',
      systemPrompt: SYSTEM_PROMPT,
      inputSchema,
      outputSchema,
      maxTokens: 8192,
      temperature: 0.5,
    });
  }

  protected buildUserPrompt(input: InternalLinkerInput): string {
    const pagesInfo = input.available_pages
      .filter(p => p.slug !== input.page_slug)
      .map(p => `- ${p.slug}: "${p.title}" (keyword: ${p.target_keyword})`)
      .join('\n');

    return `Add internal links to the following content:

CURRENT PAGE SLUG: ${input.page_slug}

AVAILABLE PAGES TO LINK TO:
${pagesInfo}

CONTENT TO UPDATE:
${input.page_content}

Please:
1. Identify opportunities to add internal links
2. Use natural, contextual anchor text
3. Add 3-7 relevant internal links
4. Return the updated content with HTML anchor tags

Format links as: <a href="/{slug}">{anchor text}</a>
Respond with JSON only.`;
  }
}

export const internalLinkerAgent = new InternalLinkerAgent();
