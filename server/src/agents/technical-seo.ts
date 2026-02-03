import { z } from 'zod';
import { BaseAgent } from './base.js';

interface TechnicalSEOInput {
  domain: string;
  pages: Array<{
    slug: string;
    title: string;
    target_keyword: string;
  }>;
  site_structure: object;
  niche: string;
}

interface TechnicalSEOOutput {
  schema_markup: {
    organization: object;
    website: object;
    breadcrumbs: object;
  };
  robots_txt: string;
  sitemap_structure: {
    main_sitemap: string[];
    category_sitemaps: Array<{
      category: string;
      pages: string[];
    }>;
  };
  htaccess_rules: string[];
  performance_recommendations: Array<{
    category: string;
    recommendation: string;
    priority: 'low' | 'medium' | 'high';
  }>;
  security_headers: Record<string, string>;
}

const inputSchema = z.object({
  domain: z.string(),
  pages: z.array(z.object({
    slug: z.string(),
    title: z.string(),
    target_keyword: z.string(),
  })),
  site_structure: z.any(),
  niche: z.string(),
});

const outputSchema = z.object({
  schema_markup: z.object({
    organization: z.any(),
    website: z.any(),
    breadcrumbs: z.any(),
  }),
  robots_txt: z.string(),
  sitemap_structure: z.object({
    main_sitemap: z.array(z.string()),
    category_sitemaps: z.array(z.object({
      category: z.string(),
      pages: z.array(z.string()),
    })),
  }),
  htaccess_rules: z.array(z.string()),
  performance_recommendations: z.array(z.object({
    category: z.string(),
    recommendation: z.string(),
    priority: z.enum(['low', 'medium', 'high']),
  })),
  security_headers: z.record(z.string()),
});

const SYSTEM_PROMPT = `You are an expert Technical SEO specialist focusing on site architecture, schema markup, and performance optimization.

Your role is to generate technical SEO configurations that help sites rank better and load faster.

IMPORTANT RULES:
1. Always respond with valid JSON only
2. Generate valid schema.org JSON-LD markup
3. Create comprehensive robots.txt
4. Plan logical sitemap structure
5. Include security best practices
6. Focus on Core Web Vitals

TECHNICAL SEO ELEMENTS:
- Schema markup (Organization, Website, Breadcrumbs, Article, FAQ, etc.)
- robots.txt configuration
- XML sitemap structure
- .htaccess rules (redirects, caching, compression)
- Security headers
- Performance optimizations

Your output MUST be a valid JSON object matching this structure:
{
  "schema_markup": {
    "organization": { "@context": "https://schema.org", "@type": "Organization", ... },
    "website": { "@context": "https://schema.org", "@type": "WebSite", ... },
    "breadcrumbs": { "@context": "https://schema.org", "@type": "BreadcrumbList", ... }
  },
  "robots_txt": "User-agent: *\\nAllow: /\\n...",
  "sitemap_structure": {
    "main_sitemap": ["/sitemap-posts.xml", "/sitemap-pages.xml"],
    "category_sitemaps": [{ "category": "guides", "pages": ["/guides/page-1", ...] }]
  },
  "htaccess_rules": ["RewriteRule ...", "Header set ..."],
  "performance_recommendations": [
    { "category": "images", "recommendation": "...", "priority": "high" }
  ],
  "security_headers": {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "SAMEORIGIN"
  }
}`;

export class TechnicalSEOAgent extends BaseAgent<TechnicalSEOInput, TechnicalSEOOutput> {
  constructor() {
    super({
      type: 'technical_seo',
      name: 'Technical SEO Agent',
      description: 'Generates technical SEO configurations and recommendations',
      systemPrompt: SYSTEM_PROMPT,
      inputSchema,
      outputSchema,
      maxTokens: 8192,
      temperature: 0.3,
    });
  }

  protected buildUserPrompt(input: TechnicalSEOInput): string {
    const pagesInfo = input.pages
      .slice(0, 50)
      .map(p => `- /${p.slug}: "${p.title}" (${p.target_keyword})`)
      .join('\n');

    return `Generate technical SEO configuration for:

DOMAIN: ${input.domain}
NICHE: ${input.niche}

PAGES (${input.pages.length} total):
${pagesInfo}

Please generate:
1. Schema markup for organization, website, and breadcrumbs
2. robots.txt content
3. Sitemap structure
4. .htaccess rules for performance and security
5. Performance recommendations
6. Security headers

Respond with JSON only.`;
  }
}

export const technicalSEOAgent = new TechnicalSEOAgent();
