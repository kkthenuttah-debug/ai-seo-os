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
  currentPageSlug: z.string().optional(),
});

const suggestionSchema = z.object({
  anchor: z.union([z.string(), z.null()]).optional().transform((s) => s ?? ''),
  targetUrl: z.string(),
  targetTitle: z.union([z.string(), z.null()]).optional().transform((s) => s ?? ''),
  position: z.union([z.number(), z.null()]).optional().transform((n) => (typeof n === 'number' ? n : 0)),
  contextBefore: z.union([z.string(), z.null()]).optional().transform((s) => s ?? ''),
  contextAfter: z.union([z.string(), z.null()]).optional().transform((s) => s ?? ''),
  relevanceScore: z.union([z.number().min(0).max(100), z.null()]).optional().transform((n) => (typeof n === 'number' && n >= 0 && n <= 100 ? n : 50)),
});

const outputObjectSchema = z.object({
  suggestions: z.array(suggestionSchema).default([]),
  totalSuggestions: z.number().optional(),
}).transform((o) => ({
  suggestions: o.suggestions,
  totalSuggestions: typeof o.totalSuggestions === 'number' ? o.totalSuggestions : o.suggestions.length,
}));

// Model sometimes returns a bare array; array elements may be objects or primitives (malformed)
function parseSuggestionsArray(arr: unknown[]): { suggestions: z.infer<typeof suggestionSchema>[]; totalSuggestions: number } {
  const suggestions: z.infer<typeof suggestionSchema>[] = [];
  for (const item of arr) {
    if (item !== null && typeof item === 'object' && !Array.isArray(item)) {
      const parsed = suggestionSchema.safeParse(item);
      if (parsed.success) suggestions.push(parsed.data);
    }
  }
  return { suggestions, totalSuggestions: suggestions.length };
}

// Model sometimes returns JSON as a string (unparsed)
const stringOutputSchema = z.string().transform((s): z.infer<typeof outputObjectSchema> => {
  const trimmed = s.trim();
  if (!trimmed) return { suggestions: [], totalSuggestions: 0 };
  try {
    const v = JSON.parse(trimmed) as unknown;
    if (v !== null && typeof v === 'object' && !Array.isArray(v) && 'suggestions' in v) {
      const obj = v as { suggestions?: unknown[]; totalSuggestions?: number };
      const parsed = parseSuggestionsArray(Array.isArray(obj.suggestions) ? obj.suggestions : []);
      return {
        suggestions: parsed.suggestions,
        totalSuggestions: typeof obj.totalSuggestions === 'number' ? obj.totalSuggestions : parsed.totalSuggestions,
      };
    }
    if (Array.isArray(v)) return parseSuggestionsArray(v);
  } catch {
    // ignore parse error
  }
  return { suggestions: [], totalSuggestions: 0 };
});

const outputSchema = z.union([
  stringOutputSchema,
  outputObjectSchema,
  z.array(z.unknown()).transform((arr) => parseSuggestionsArray(Array.isArray(arr) ? arr : [])),
]);

const SYSTEM_PROMPT = `You are an expert SEO internal linking specialist with deep knowledge of link building strategies and user experience.

Your role is to analyze content and identify strategic opportunities for internal linking that:
1. Enhance user navigation and experience
2. Distribute page authority effectively
3. Strengthen topical relevance
4. Use natural, contextually appropriate anchor text
5. Follow SEO best practices

CRITICAL RULES:
1. Output ONLY valid JSON - no markdown, no explanations
2. Suggest 4-8 internal links for typical long-form content (aim for 4-6 per 1000 words of content)
3. ANCHOR TEXT MUST BE AN EXACT SUBSTRING of the content: copy a short phrase verbatim from the content (e.g. "learn more about X", "our services", "contact us"). If you cannot find a suitable phrase that appears exactly in the content, omit that link
4. Use natural anchor text that fits the context and matches the target page topic
5. Include at least one link to the main page (/) when not on the homepage
6. Prioritize topically related pages; calculate relevance score (0-100) based on topic match
7. Consider user intent and content flow; order suggestions by position in content

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
    const isMainPage = input.currentPageSlug === 'home';
    const mainPageUrl = '/';
    const hubInstruction = isMainPage
      ? `This is the MAIN PAGE (homepage). Suggest links to key topic/subject pages from the list above so the homepage acts as a hub. Use their exact URLs (e.g. /slug).`
      : `This is a topic page. Include at least one link back to the main page (${mainPageUrl}) where natural (e.g. "learn more", "home", or contextually relevant anchor). Also suggest links to other relevant topic pages from the list.`;

    return `Analyze the following content and identify strategic internal linking opportunities.

CURRENT PAGE: ${input.currentPageTitle}${input.currentPageSlug ? ` (slug: ${input.currentPageSlug})` : ''}

CONTENT TO ANALYZE:
${input.content}

AVAILABLE PAGES FOR LINKING:
${pagesList}

HUB-AND-SPOKE: ${hubInstruction}

Instructions:
1. Suggest 4-8 internal links (or more for long content) using the exact URLs from the list
2. For each link, choose anchor text that appears VERBATIM in the content - copy a phrase from the content, do not invent new wording or the link will not be applied
3. Include a link to the main page (/) where natural when this is not the homepage
4. Provide contextBefore/contextAfter and relevance score (0-100); only suggest links with relevance > 50
5. Order suggestions by position in content (earlier in content first)
6. Use the exact URL from the list (e.g. / for main page, /slug for others)

Respond with JSON only.`;
  }
}

export const internalLinkerAgent = new InternalLinkerAgent();
