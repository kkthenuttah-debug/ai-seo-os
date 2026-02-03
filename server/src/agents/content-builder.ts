import { z } from 'zod';
import { BaseAgent } from './base.js';
import type { ContentBuilderInput, ContentBuilderOutput } from '../types/index.js';

const inputSchema = z.object({
  page_title: z.string(),
  target_keyword: z.string(),
  content_type: z.string(),
  tone: z.string(),
  word_count: z.number().min(300).max(10000),
  outline: z.array(z.string()).optional(),
  internal_links: z.array(z.string()).optional(),
});

const outputSchema = z.object({
  title: z.string(),
  meta_title: z.string(),
  meta_description: z.string(),
  content: z.string(),
  headings: z.array(z.object({
    level: z.number(),
    text: z.string(),
  })),
  word_count: z.number(),
  reading_time: z.number(),
  suggested_internal_links: z.array(z.string()),
});

const SYSTEM_PROMPT = `You are an expert SEO content writer with deep expertise in creating high-ranking, engaging content.

Your role is to write comprehensive, well-structured content that ranks well in search engines while providing genuine value to readers.

IMPORTANT RULES:
1. Always respond with valid JSON only - no markdown, no explanations outside JSON
2. Write content that matches search intent
3. Use natural keyword placement (avoid keyword stuffing)
4. Structure content with clear headings (H2, H3, H4)
5. Include actionable insights and practical advice
6. Write for humans first, search engines second
7. Use short paragraphs and bullet points for readability
8. Include a compelling introduction and strong conclusion

SEO BEST PRACTICES:
- Target keyword in first 100 words
- Target keyword in at least one H2
- Related keywords throughout content
- Meta title under 60 characters
- Meta description under 160 characters
- Include internal link opportunities

Your output MUST be a valid JSON object matching this structure:
{
  "title": "H1 title for the page",
  "meta_title": "SEO meta title (under 60 chars)",
  "meta_description": "Compelling meta description (under 160 chars)",
  "content": "Full HTML content with proper heading tags",
  "headings": [
    { "level": 2, "text": "Heading text" }
  ],
  "word_count": 1500,
  "reading_time": 7,
  "suggested_internal_links": ["related-topic-slug", "another-topic-slug"]
}`;

export class ContentBuilderAgent extends BaseAgent<ContentBuilderInput, ContentBuilderOutput> {
  constructor() {
    super({
      type: 'content_builder',
      name: 'Content Builder Agent',
      description: 'Creates SEO-optimized content for pages',
      systemPrompt: SYSTEM_PROMPT,
      inputSchema,
      outputSchema,
      maxTokens: 8192,
      temperature: 0.8,
    });
  }

  protected buildUserPrompt(input: ContentBuilderInput): string {
    let prompt = `Write comprehensive SEO content for the following:

PAGE TITLE: ${input.page_title}
TARGET KEYWORD: ${input.target_keyword}
CONTENT TYPE: ${input.content_type}
TONE: ${input.tone}
TARGET WORD COUNT: ${input.word_count} words`;

    if (input.outline && input.outline.length > 0) {
      prompt += `\n\nSUGGESTED OUTLINE:\n${input.outline.map((item, i) => `${i + 1}. ${item}`).join('\n')}`;
    }

    if (input.internal_links && input.internal_links.length > 0) {
      prompt += `\n\nAVAILABLE INTERNAL LINKS:\n${input.internal_links.map(link => `- ${link}`).join('\n')}`;
    }

    prompt += `

Create the content with:
1. Engaging H1 title
2. SEO-optimized meta title and description
3. Well-structured content with H2, H3 headings
4. Natural keyword usage
5. Actionable insights
6. Internal link suggestions

The content field should contain properly formatted HTML with heading tags, paragraphs, lists, etc.
Respond with JSON only.`;

    return prompt;
  }
}

export const contentBuilderAgent = new ContentBuilderAgent();
