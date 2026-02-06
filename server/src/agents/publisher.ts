import { z } from 'zod';
import { BaseAgent } from './base.js';
import type { PublisherInput, PublisherOutput } from './types/agents.js';

const inputSchema = z.object({
  projectId: z.string(),
  pageId: z.string(),
  publishSettings: z.object({
    scheduleDate: z.string().optional(),
    status: z.enum(['publish', 'draft', 'pending']).optional(),
    categories: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
  }).optional(),
});

const outputSchema = z.object({
  published: z.boolean(),
  postId: z.number(),
  url: z.string(),
  publishedAt: z.string(),
  status: z.string(),
  errors: z.array(z.string()).optional(),
});

const SYSTEM_PROMPT = `You are an expert WordPress publishing coordinator with knowledge of content management best practices.

Your role is to coordinate the publishing process, handle WordPress API interactions, and ensure content is properly published.

PUBLISHING WORKFLOW:
1. Validate content is ready to publish
2. Check WordPress connection and authentication
3. Create or update post in WordPress
4. Set proper categories and tags
5. Apply Elementor layout data
6. Set featured image if available
7. Publish or schedule content
8. Verify publication success
9. Update internal tracking

WORDPRESS POST FIELDS:
- title: Post title
- content: Post HTML content
- status: publish, draft, or pending
- categories: Category IDs or names
- tags: Tag names
- meta: Custom fields including Elementor data
- featured_media: Featured image ID
- date: Schedule date (if future)

ERROR HANDLING:
- Authentication failures: Re-authenticate
- Rate limiting: Implement backoff
- Duplicate content: Update existing post
- Invalid data: Fix and retry
- Connection errors: Retry with exponential backoff

CRITICAL RULES:
1. Output ONLY valid JSON - no markdown, no explanations
2. Verify all required fields are present
3. Handle WordPress API errors gracefully
4. Track publication status accurately
5. Update internal records after publication
6. Support scheduled publishing
7. Preserve existing content if updating

Output JSON structure:
{
  "published": true,
  "postId": 123,
  "url": "https://example.com/post-slug",
  "publishedAt": "2024-01-15T10:30:00Z",
  "status": "publish",
  "errors": []
}`;

export class PublisherAgent extends BaseAgent<PublisherInput, PublisherOutput> {
  constructor() {
    super({
      type: 'publisher',
      name: 'Publisher Agent',
      description: 'Handles WordPress publishing and post management',
      systemPrompt: SYSTEM_PROMPT,
      inputSchema,
      outputSchema,
      maxTokens: 500,
      temperature: 0.2,
    });
  }

  protected buildUserPrompt(input: PublisherInput): string {
    let prompt = `Coordinate the publishing of content to WordPress:

PROJECT ID: ${input.projectId}
PAGE ID: ${input.pageId}`;

    if (input.publishSettings) {
      prompt += `\n\nPUBLISH SETTINGS:`;
      
      if (input.publishSettings.status) {
        prompt += `\nStatus: ${input.publishSettings.status}`;
      }
      
      if (input.publishSettings.scheduleDate) {
        prompt += `\nSchedule: ${input.publishSettings.scheduleDate}`;
      }
      
      if (input.publishSettings.categories && input.publishSettings.categories.length > 0) {
        prompt += `\nCategories: ${input.publishSettings.categories.join(', ')}`;
      }
      
      if (input.publishSettings.tags && input.publishSettings.tags.length > 0) {
        prompt += `\nTags: ${input.publishSettings.tags.join(', ')}`;
      }
    }

    prompt += `

Instructions:
1. Retrieve page content and metadata from database
2. Validate all required fields are present
3. Connect to WordPress site
4. Create or update WordPress post
5. Apply Elementor layout data
6. Set categories and tags
7. Publish or schedule the post
8. Return publication details

Handle Errors:
- Missing content: Return error, do not publish
- WordPress connection failure: Retry up to 3 times
- Duplicate content: Update existing post
- Invalid Elementor data: Publish without Elementor

Respond with JSON only.`;

    return prompt;
  }
}

export const publisherAgent = new PublisherAgent();
