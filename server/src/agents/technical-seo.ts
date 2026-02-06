import { z } from 'zod';
import { BaseAgent } from './base.js';
import type { TechnicalSEOInput, TechnicalSEOOutput } from './types/agents.js';

const inputSchema = z.object({
  domain: z.string().min(1),
  pages: z.array(z.object({
    url: z.string(),
    title: z.string(),
    meta_description: z.string(),
    h1: z.string(),
    wordCount: z.number(),
    loadTime: z.number(),
  })),
  siteAudit: z.object({
    crawlErrors: z.array(z.string()),
    brokenLinks: z.array(z.string()),
    missingMeta: z.array(z.string()),
    slowPages: z.array(z.string()),
  }).optional(),
});

const outputSchema = z.object({
  issues: z.array(z.object({
    type: z.enum(['critical', 'warning', 'info']),
    category: z.string(),
    description: z.string(),
    affectedPages: z.array(z.string()),
    impact: z.enum(['high', 'medium', 'low']),
  })),
  recommendations: z.array(z.object({
    title: z.string(),
    description: z.string(),
    priority: z.enum(['high', 'medium', 'low']),
    effort: z.enum(['high', 'medium', 'low']),
    impact: z.string(),
    implementation: z.string(),
  })),
  prioritizedFixes: z.array(z.object({
    issue: z.string(),
    fix: z.string(),
    priority: z.number(),
  })),
  score: z.number().min(0).max(100),
});

const SYSTEM_PROMPT = `You are an expert technical SEO auditor with comprehensive knowledge of Core Web Vitals, crawlability, indexation, and site architecture.

Your role is to audit websites, identify technical SEO issues, and provide actionable recommendations for improvement.

AUDIT AREAS:
1. On-Page SEO (titles, meta descriptions, headers, content)
2. Technical Performance (page speed, Core Web Vitals)
3. Crawlability & Indexation (robots.txt, sitemaps, canonical tags)
4. Site Architecture (URL structure, internal linking)
5. Mobile Optimization (responsive design, mobile usability)
6. Schema Markup (structured data implementation)
7. Security (HTTPS, security headers)

ISSUE SEVERITY:
- Critical: Blocks indexing or severely impacts rankings (404s, no-index, duplicate content)
- Warning: Negatively impacts SEO performance (slow load, missing meta, poor structure)
- Info: Optimization opportunities (minor improvements, best practices)

IMPACT LEVELS:
- High: Directly affects rankings and visibility
- Medium: Affects user experience and indirect ranking factors
- Low: Minor optimizations with marginal benefit

CRITICAL RULES:
1. Output ONLY valid JSON - no markdown, no explanations
2. Prioritize issues by impact and effort
3. Provide specific, actionable recommendations
4. Include implementation steps for each fix
5. Calculate overall technical SEO score (0-100)
6. Focus on quick wins and high-impact fixes first

Output JSON structure:
{
  "issues": [
    {
      "type": "critical",
      "category": "Indexation",
      "description": "Missing meta descriptions on 15 pages",
      "affectedPages": ["/page-1", "/page-2"],
      "impact": "high"
    }
  ],
  "recommendations": [
    {
      "title": "Add Meta Descriptions",
      "description": "Write unique meta descriptions for all pages",
      "priority": "high",
      "effort": "medium",
      "impact": "Improves click-through rate by 10-15%",
      "implementation": "Update page metadata in WordPress"
    }
  ],
  "prioritizedFixes": [
    {
      "issue": "Missing meta descriptions",
      "fix": "Add unique 150-160 character descriptions",
      "priority": 1
    }
  ],
  "score": 75
}`;

export class TechnicalSEOAgent extends BaseAgent<TechnicalSEOInput, TechnicalSEOOutput> {
  constructor() {
    super({
      type: 'technical_seo',
      name: 'Technical SEO Agent',
      description: 'Audits technical SEO and provides optimization recommendations',
      systemPrompt: SYSTEM_PROMPT,
      inputSchema,
      outputSchema,
      maxTokens: 2000,
      temperature: 0.5,
    });
  }

  protected buildUserPrompt(input: TechnicalSEOInput): string {
    let prompt = `Perform a comprehensive technical SEO audit for the following site:

DOMAIN: ${input.domain}

PAGES ANALYZED: ${input.pages.length}

PAGE DETAILS:
${input.pages.slice(0, 10).map(p => `
- URL: ${p.url}
  Title: ${p.title}
  Meta: ${p.meta_description}
  H1: ${p.h1}
  Words: ${p.wordCount}
  Load Time: ${p.loadTime}ms`).join('\n')}
${input.pages.length > 10 ? `\n... and ${input.pages.length - 10} more pages` : ''}`;

    if (input.siteAudit) {
      prompt += `\n\nSITE AUDIT DATA:`;
      
      if (input.siteAudit.crawlErrors.length > 0) {
        prompt += `\n\nCRAWL ERRORS:\n${input.siteAudit.crawlErrors.join('\n')}`;
      }
      
      if (input.siteAudit.brokenLinks.length > 0) {
        prompt += `\n\nBROKEN LINKS:\n${input.siteAudit.brokenLinks.join('\n')}`;
      }
      
      if (input.siteAudit.missingMeta.length > 0) {
        prompt += `\n\nMISSING META TAGS:\n${input.siteAudit.missingMeta.join('\n')}`;
      }
      
      if (input.siteAudit.slowPages.length > 0) {
        prompt += `\n\nSLOW PAGES (>3s):\n${input.siteAudit.slowPages.join('\n')}`;
      }
    }

    prompt += `

Instructions:
1. Analyze all technical SEO factors
2. Identify critical issues that need immediate attention
3. Provide specific, actionable recommendations
4. Prioritize fixes by impact and effort
5. Calculate an overall technical SEO score (0-100)
6. Focus on Core Web Vitals, mobile optimization, and indexation
7. Consider scalability and maintenance effort

Evaluation Criteria:
- On-page optimization (titles, meta, headers)
- Page speed and performance
- Mobile responsiveness
- Internal linking structure
- Schema markup implementation
- Crawlability and indexation
- URL structure and redirects

Respond with JSON only.`;

    return prompt;
  }
}

export const technicalSEOAgent = new TechnicalSEOAgent();
