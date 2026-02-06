import { z } from 'zod';
import { BaseAgent } from './base.js';
import type { FixerInput, FixerOutput } from './types/agents.js';

const inputSchema = z.object({
  errorType: z.enum(['content', 'technical', 'api', 'validation']),
  errorMessage: z.string(),
  context: z.object({
    pageId: z.string().optional(),
    agentType: z.enum([
      'market_research',
      'site_architect',
      'internal_linker',
      'elementor_builder',
      'content_builder',
      'page_builder',
      'fixer',
      'technical_seo',
      'monitor',
      'optimizer',
      'publisher',
    ]).optional(),
    failedInput: z.unknown().optional(),
    failedOutput: z.unknown().optional(),
  }),
  previousAttempts: z.number().optional(),
});

const outputSchema = z.object({
  fixed: z.boolean(),
  changes: z.array(z.object({
    type: z.string(),
    description: z.string(),
    appliedFix: z.string(),
  })),
  newContent: z.string().optional(),
  recommendations: z.array(z.string()),
  requiresManualReview: z.boolean(),
});

const SYSTEM_PROMPT = `You are an expert error diagnosis and recovery specialist for AI-powered SEO systems.

Your role is to analyze errors, identify root causes, and implement automated fixes when possible.

ERROR TYPES YOU HANDLE:
1. Content errors (malformed, incomplete, or invalid content)
2. Technical errors (API failures, timeouts, rate limits)
3. API errors (integration failures, authentication issues)
4. Validation errors (schema violations, data format issues)

CRITICAL RULES:
1. Output ONLY valid JSON - no markdown, no explanations
2. Diagnose the root cause accurately
3. Provide actionable fixes when possible
4. Flag issues requiring manual review
5. Document all changes made
6. Consider retry strategies for transient errors
7. Preserve original intent when fixing content
8. Suggest preventive measures

Fix Priority:
- Critical: System-blocking errors (fix immediately)
- High: Content quality issues (fix with caution)
- Medium: Optimization opportunities (suggest improvements)
- Low: Minor formatting issues (fix automatically)

Output JSON structure:
{
  "fixed": true,
  "changes": [
    {
      "type": "content_repair",
      "description": "Fixed malformed JSON in content",
      "appliedFix": "Escaped special characters"
    }
  ],
  "newContent": "fixed content if applicable",
  "recommendations": [
    "Add validation before content generation",
    "Implement rate limiting"
  ],
  "requiresManualReview": false
}`;

export class FixerAgent extends BaseAgent<FixerInput, FixerOutput> {
  constructor() {
    super({
      type: 'fixer',
      name: 'Fixer Agent',
      description: 'Diagnoses and fixes errors in automated workflows',
      systemPrompt: SYSTEM_PROMPT,
      inputSchema,
      outputSchema,
      maxTokens: 1000,
      temperature: 0.3,
    });
  }

  protected buildUserPrompt(input: FixerInput): string {
    let prompt = `Analyze and fix the following error:

ERROR TYPE: ${input.errorType}
ERROR MESSAGE: ${input.errorMessage}`;

    if (input.previousAttempts) {
      prompt += `\nPREVIOUS ATTEMPTS: ${input.previousAttempts}`;
    }

    if (input.context.agentType) {
      prompt += `\nFAILED AGENT: ${input.context.agentType}`;
    }

    if (input.context.pageId) {
      prompt += `\nAFFECTED PAGE: ${input.context.pageId}`;
    }

    if (input.context.failedInput) {
      prompt += `\n\nFAILED INPUT:\n${JSON.stringify(input.context.failedInput, null, 2)}`;
    }

    if (input.context.failedOutput) {
      prompt += `\n\nFAILED OUTPUT:\n${JSON.stringify(input.context.failedOutput, null, 2)}`;
    }

    prompt += `

Instructions:
1. Diagnose the root cause of the error
2. Determine if the error is fixable automatically
3. If fixable, provide the corrected version
4. Document all changes made
5. Provide recommendations to prevent similar errors
6. Flag if manual review is needed

Consider:
- Is this a transient error that should be retried?
- Is the input data valid?
- Is the error caused by external dependencies?
- Can the error be prevented with better validation?
- What's the impact of this error on the overall workflow?

Respond with JSON only.`;

    return prompt;
  }
}

export const fixerAgent = new FixerAgent();
