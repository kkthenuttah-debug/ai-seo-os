import { z } from 'zod';
import { BaseAgent } from './base.js';
import { contentBuilderAgent } from './content-builder.js';
import { elementorBuilderAgent } from './elementor-builder.js';
import { nanoid } from 'nanoid';
import type { PageBuilderInput, PageBuilderOutput } from './types/agents.js';

const inputSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1),
  targetKeyword: z.string().min(1),
  contentType: z.string(),
  tone: z.string(),
  wordCount: z.number().min(300),
  outline: z.array(z.string()).optional(),
  internalLinkSlugs: z.array(z.string()).optional(),
  leadCapture: z.object({
    webhookUrl: z.string().url(),
    projectId: z.string(),
    pageId: z.string(),
    sourceUrl: z.string(),
  }).optional(),
});

const outputSchema = z.object({
  pageId: z.string(),
  title: z.string(),
  slug: z.string(),
  content: z.string(),
  metaTitle: z.string(),
  metaDescription: z.string(),
  elementorData: z.record(z.unknown()),
  internalLinks: z.array(z.string()),
  readyToPublish: z.boolean(),
});

const SYSTEM_PROMPT = `You are an expert page assembly coordinator that orchestrates content and layout generation.

Your role is to coordinate the creation of complete, publish-ready pages by combining content and Elementor layouts.

CRITICAL RULES:
1. Output ONLY valid JSON - no markdown, no explanations
2. Ensure all page elements are properly assembled
3. Validate that content is complete and SEO-optimized
4. Confirm Elementor layout matches the content
5. Mark as ready to publish only if all elements are present

Output JSON structure:
{
  "pageId": "unique-page-id",
  "title": "Page Title",
  "slug": "page-slug",
  "content": "Full HTML content",
  "metaTitle": "SEO Meta Title",
  "metaDescription": "SEO Meta Description",
  "elementorData": {},
  "internalLinks": ["/page-1", "/page-2"],
  "readyToPublish": true
}`;

export class PageBuilderAgent extends BaseAgent<PageBuilderInput, PageBuilderOutput> {
  constructor() {
    super({
      type: 'page_builder',
      name: 'Page Builder Agent',
      description: 'Assembles complete pages with content and Elementor layout',
      systemPrompt: SYSTEM_PROMPT,
      inputSchema,
      outputSchema,
      maxTokens: 1000,
      temperature: 0.3,
    });
  }

  protected buildUserPrompt(input: PageBuilderInput): string {
    return `Assemble a complete page with the following specifications:

TITLE: ${input.title}
SLUG: ${input.slug}
TARGET KEYWORD: ${input.targetKeyword}
CONTENT TYPE: ${input.contentType}
TONE: ${input.tone}
WORD COUNT: ${input.wordCount}

Confirm all elements are present and the page is ready to publish.
Respond with JSON only.`;
  }

  async run(projectId: string, input: PageBuilderInput): Promise<PageBuilderOutput> {
    // Spec flow: Elementor Builder first (layout), then Content Builder (copy)
    const layoutContext = `Page: ${input.title}. Target keyword: ${input.targetKeyword}. Content type: ${input.contentType}. Generate layout with hero, sections, and CTA. Full content will be added in the next step.`;
    const elementorInput = {
      pageTitle: input.title,
      content: layoutContext,
      keywords: [input.targetKeyword],
      contentType: input.contentType,
    };
    const elementorOutput = await elementorBuilderAgent.run(projectId, elementorInput);

    const contentInput = {
      page_title: input.title,
      target_keyword: input.targetKeyword,
      content_type: input.contentType,
      tone: input.tone,
      word_count: input.wordCount,
      outline: input.outline,
      internal_links: input.internalLinkSlugs,
      lead_capture: input.leadCapture
        ? {
            webhook_url: input.leadCapture.webhookUrl,
            project_id: input.leadCapture.projectId,
            page_id: input.leadCapture.pageId,
            source_url: input.leadCapture.sourceUrl,
          }
        : undefined,
    };
    const contentOutput = await contentBuilderAgent.run(projectId, contentInput);

    const pageId = nanoid();
    return {
      pageId,
      title: contentOutput.title,
      slug: input.slug,
      content: contentOutput.content,
      metaTitle: contentOutput.meta_title,
      metaDescription: contentOutput.meta_description,
      elementorData: elementorOutput.elementorData,
      internalLinks: contentOutput.suggested_internal_links,
      readyToPublish: true,
    };
  }
}

export const pageBuilderAgent = new PageBuilderAgent();
