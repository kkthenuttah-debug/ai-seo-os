import { logger } from '../lib/logger.js';
import { geminiRouter, type GeminiRouterRequest } from './geminiRouter.js';
import type { AgentType } from '../types/index.js';

const JSON_ENFORCEMENT_PROMPT = `
CRITICAL: Your response MUST be valid JSON only. No markdown, no explanations, no code blocks.

Rules:
1. Start your response with { and end with }
2. Use double quotes for all strings
3. Escape special characters properly
4. No trailing commas
5. No comments
6. Return ONLY the JSON object, nothing else

Example of CORRECT response:
{"field": "value", "array": [1, 2, 3], "nested": {"key": "value"}}

Example of INCORRECT response:
\`\`\`json
{"field": "value"}
\`\`\`

DO NOT wrap the JSON in markdown code blocks.
`;

export interface JsonEnforcerOptions {
  agentType: AgentType;
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
  maxRetries?: number;
}

export class JsonEnforcer {
  async enforceJson<T>(options: JsonEnforcerOptions): Promise<T> {
    const { maxRetries = 3, ...requestOptions } = options;
    const log = logger.child({ agent: options.agentType, enforcer: true });

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const enhancedSystemPrompt = this.enhancePromptWithJsonInstructions(
          options.systemPrompt,
          attempt,
        );

        const request: GeminiRouterRequest = {
          agentType: requestOptions.agentType,
          systemPrompt: enhancedSystemPrompt,
          userPrompt: requestOptions.userPrompt,
          temperature: requestOptions.temperature,
          maxTokens: requestOptions.maxTokens,
        };

        const response = await geminiRouter.callWithRetry(request);
        const parsed = this.parseJsonResponse<T>(response.content);

        log.info({ attempt }, 'JSON successfully parsed');
        return parsed;
      } catch (error) {
        lastError = error as Error;
        
        log.warn({
          attempt,
          error: lastError.message,
        }, 'JSON parsing failed, will retry with stricter prompt');

        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    }

    log.error({ attempts: maxRetries }, 'JSON enforcement failed after all retries');
    throw lastError || new Error('Failed to enforce JSON response');
  }

  private enhancePromptWithJsonInstructions(
    originalPrompt: string,
    attemptNumber: number,
  ): string {
    if (attemptNumber === 0) {
      return originalPrompt + '\n\n' + JSON_ENFORCEMENT_PROMPT;
    }

    const stricterPrompt = `
${JSON_ENFORCEMENT_PROMPT}

EXTRA STRICT MODE (Attempt ${attemptNumber + 1}):
This is retry attempt ${attemptNumber + 1}. Previous attempts failed to produce valid JSON.

DO NOT include:
- Markdown code blocks (\`\`\`json or \`\`\`)
- Any text before the opening {
- Any text after the closing }
- Comments or explanations
- Escape characters except for \\n, \\t, \\", \\\\

Start typing the { character immediately.
`;

    return originalPrompt + '\n\n' + stricterPrompt;
  }

  parseJsonResponse<T>(content: string): T {
    const cleaned = this.cleanJsonResponse(content);
    
    try {
      return JSON.parse(cleaned) as T;
    } catch (error) {
      logger.error({
        content: content.substring(0, 500),
        cleaned: cleaned.substring(0, 500),
        error: error instanceof Error ? error.message : String(error),
      }, 'Failed to parse JSON response');
      
      throw new Error(`Invalid JSON response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private cleanJsonResponse(content: string): string {
    let cleaned = content.trim();

    const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)```/;
    const match = cleaned.match(codeBlockRegex);
    if (match) {
      cleaned = match[1].trim();
    }

    const jsonStartIndex = cleaned.indexOf('{');
    const jsonArrayStartIndex = cleaned.indexOf('[');
    
    let startIndex = -1;
    if (jsonStartIndex !== -1 && jsonArrayStartIndex !== -1) {
      startIndex = Math.min(jsonStartIndex, jsonArrayStartIndex);
    } else if (jsonStartIndex !== -1) {
      startIndex = jsonStartIndex;
    } else if (jsonArrayStartIndex !== -1) {
      startIndex = jsonArrayStartIndex;
    }

    if (startIndex > 0) {
      cleaned = cleaned.substring(startIndex);
    }

    const jsonEndIndex = cleaned.lastIndexOf('}');
    const jsonArrayEndIndex = cleaned.lastIndexOf(']');
    
    let endIndex = -1;
    if (jsonEndIndex !== -1 && jsonArrayEndIndex !== -1) {
      endIndex = Math.max(jsonEndIndex, jsonArrayEndIndex);
    } else if (jsonEndIndex !== -1) {
      endIndex = jsonEndIndex;
    } else if (jsonArrayEndIndex !== -1) {
      endIndex = jsonArrayEndIndex;
    }

    if (endIndex > 0 && endIndex < cleaned.length - 1) {
      cleaned = cleaned.substring(0, endIndex + 1);
    }

    return cleaned;
  }

  async streamJsonResponse<T>(
    options: JsonEnforcerOptions,
  ): Promise<AsyncGenerator<string>> {
    const enhancedSystemPrompt = this.enhancePromptWithJsonInstructions(
      options.systemPrompt,
      0,
    );

    const request: GeminiRouterRequest = {
      agentType: options.agentType,
      systemPrompt: enhancedSystemPrompt,
      userPrompt: options.userPrompt,
      temperature: options.temperature,
      maxTokens: options.maxTokens,
      stream: true,
    };

    return this.streamWithJsonCleaning(geminiRouter.stream(request));
  }

  private async *streamWithJsonCleaning(
    stream: AsyncGenerator<{ content: string; done: boolean }>,
  ): AsyncGenerator<string> {
    let buffer = '';
    let jsonStarted = false;

    for await (const chunk of stream) {
      if (chunk.done) {
        if (buffer) {
          yield buffer;
        }
        break;
      }

      buffer += chunk.content;

      if (!jsonStarted) {
        const startIndex = Math.max(
          buffer.indexOf('{'),
          buffer.indexOf('['),
        );
        if (startIndex !== -1) {
          jsonStarted = true;
          const cleaned = buffer.substring(startIndex);
          if (cleaned) {
            yield cleaned;
          }
          buffer = '';
        }
      } else {
        yield chunk.content;
      }
    }
  }
}

export const jsonEnforcer = new JsonEnforcer();
