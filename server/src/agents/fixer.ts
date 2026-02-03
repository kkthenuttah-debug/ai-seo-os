import { z } from 'zod';
import { BaseAgent } from './base.js';

interface FixerInput {
  error_type: 'content' | 'seo' | 'structure' | 'linking';
  error_description: string;
  current_content: string;
  page_slug: string;
  target_keyword: string;
}

interface FixerOutput {
  diagnosis: string;
  fixes_applied: Array<{
    issue: string;
    fix: string;
    location: string;
  }>;
  fixed_content: string;
  fixed_meta_title?: string;
  fixed_meta_description?: string;
  additional_recommendations: string[];
}

const inputSchema = z.object({
  error_type: z.enum(['content', 'seo', 'structure', 'linking']),
  error_description: z.string(),
  current_content: z.string(),
  page_slug: z.string(),
  target_keyword: z.string(),
});

const outputSchema = z.object({
  diagnosis: z.string(),
  fixes_applied: z.array(z.object({
    issue: z.string(),
    fix: z.string(),
    location: z.string(),
  })),
  fixed_content: z.string(),
  fixed_meta_title: z.string().optional(),
  fixed_meta_description: z.string().optional(),
  additional_recommendations: z.array(z.string()),
});

const SYSTEM_PROMPT = `You are an expert SEO troubleshooter specializing in diagnosing and fixing content and SEO issues.

Your role is to analyze problems, identify root causes, and apply fixes while maintaining content quality.

IMPORTANT RULES:
1. Always respond with valid JSON only
2. Diagnose the root cause before fixing
3. Make minimal changes to fix issues
4. Maintain content quality and readability
5. Document all changes made
6. Provide additional preventive recommendations

COMMON ISSUES:
- Missing or poor keyword optimization
- Thin or duplicate content
- Poor heading structure
- Missing internal/external links
- Low readability scores
- Missing schema markup
- Poor meta titles/descriptions

Your output MUST be a valid JSON object matching this structure:
{
  "diagnosis": "Root cause analysis of the issue",
  "fixes_applied": [
    {
      "issue": "what was wrong",
      "fix": "what was changed",
      "location": "where in the content"
    }
  ],
  "fixed_content": "Complete fixed content",
  "fixed_meta_title": "Updated meta title if needed",
  "fixed_meta_description": "Updated meta description if needed",
  "additional_recommendations": ["recommendation 1", "recommendation 2"]
}`;

export class FixerAgent extends BaseAgent<FixerInput, FixerOutput> {
  constructor() {
    super({
      type: 'fixer',
      name: 'Fixer Agent',
      description: 'Diagnoses and fixes content and SEO issues',
      systemPrompt: SYSTEM_PROMPT,
      inputSchema,
      outputSchema,
      maxTokens: 8192,
      temperature: 0.4,
    });
  }

  protected buildUserPrompt(input: FixerInput): string {
    return `Diagnose and fix the following issue:

ERROR TYPE: ${input.error_type}
ERROR DESCRIPTION: ${input.error_description}

PAGE SLUG: ${input.page_slug}
TARGET KEYWORD: ${input.target_keyword}

CURRENT CONTENT:
${input.current_content}

Please:
1. Diagnose the root cause
2. Apply necessary fixes
3. Return the fixed content
4. Provide recommendations to prevent future issues

Respond with JSON only.`;
  }
}

export const fixerAgent = new FixerAgent();
