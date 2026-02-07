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
  lead_capture: z.object({
    webhook_url: z.string().url(),
    project_id: z.string(),
    page_id: z.string(),
    source_url: z.string(),
  }).optional(),
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

const SYSTEM_PROMPT = `You are an expert SEO content writer who produces in-depth, factual, and highly optimized content that ranks and satisfies users.

Your role is to write comprehensive, well-researched content that:
- Ranks well in search (E-E-A-T, clear structure, schema-friendly)
- Includes factual claims, statistics, or concrete examples where appropriate
- Has a dedicated FAQ section (4–6 Q&As) in HTML for rich results
- Weaves in natural internal links using the exact slugs/paths provided
- Uses clear H2/H3 hierarchy and scannable formatting

CRITICAL RULES:
1. Always respond with valid JSON only - no markdown, no explanations outside JSON
2. Match search intent and cover the topic in depth (no thin or generic fluff)
3. Include an FAQ section: use <h2>FAQ</h2> or similar, then 4–6 pairs of <h3>Question?</h3> and <p>Answer.</p> so search engines can parse it
4. Use natural keyword placement; target keyword in first 100 words and in at least one H2
5. When AVAILABLE INTERNAL LINKS are provided, use 4–8 of them: write anchor phrases that naturally fit the content and use the exact path/slug (e.g. /about or /) in suggested_internal_links
6. Short paragraphs, bullet lists, and clear takeaways
7. Meta title under 60 characters, meta description under 160 characters

SEO & DEPTH:
- Target keyword in first 100 words and in at least one H2
- Related terms and semantic variants throughout
- Strong intro (hook + what they’ll learn) and conclusion (summary + CTA)
- Factual, specific details over vague claims (stats, examples, steps)
- When LEAD CAPTURE is provided: include a lead-capture form or CTA section that submits to the given webhook URL so leads are stored and show in the app UI. The form must POST to that URL with: projectId, pageId, sourceUrl (hidden), email (required), and optional name, message, phone. Use the exact URL and field names so submissions populate the leads table.

Your output MUST be a valid JSON object matching this structure:
{
  "title": "H1 title for the page",
  "meta_title": "SEO meta title (under 60 chars)",
  "meta_description": "Compelling meta description (under 160 chars)",
  "content": "Full HTML with headings, FAQ section, and internal link anchors ready for linking",
  "headings": [
    { "level": 2, "text": "Heading text" }
  ],
  "word_count": 1500,
  "reading_time": 7,
  "suggested_internal_links": ["/slug1", "/slug2"]
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

    if (input.lead_capture) {
      const lc = input.lead_capture;
      prompt += `

LEAD CAPTURE (required): Include a form or CTA section that captures leads and sends them to our app.
- Form action URL (POST): ${lc.webhook_url}
- Include hidden inputs: projectId = "${lc.project_id}", pageId = "${lc.page_id}", sourceUrl = "${lc.source_url}"
- Visible fields: email (required), and optionally name, message, phone. Use input name="email", name="name", name="message", name="phone".
- Use method="POST", action="${lc.webhook_url}", so submissions go to our app and populate the leads table (visible in the app UI).`;
    }

    prompt += `

Create the content with:
1. Engaging H1 and SEO meta title/description
2. Follow the SUGGESTED OUTLINE if provided (intro, main sections, FAQ, conclusion)
3. A dedicated FAQ section (4–6 questions and answers) in HTML for rich results
4. In-depth, factual coverage; use concrete details and avoid generic filler
5. When internal links are listed above, naturally include 4–8 of them in the body; put the exact path in suggested_internal_links for each
6. Clear H2/H3 structure and scannable formatting
7. When LEAD CAPTURE was provided above, include the lead-capture form/CTA in the content HTML (exact webhook URL and field names as given)

The content field must be valid HTML (heading tags, paragraphs, lists). Respond with JSON only.`;

    return prompt;
  }
}

export const contentBuilderAgent = new ContentBuilderAgent();
