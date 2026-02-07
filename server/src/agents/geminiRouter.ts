import { GoogleGenerativeAI, GenerationConfig } from '@google/generative-ai';
import { env } from '../lib/config.js';
import { logger } from '../lib/logger.js';
import type { AgentType } from '../types/index.js';

const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);

export type AgentCategory = 'strategy' | 'execution';

const AGENT_CATEGORIES: Record<AgentType, AgentCategory> = {
  market_research: 'strategy',
  site_architect: 'strategy',
  optimizer: 'strategy',
  technical_seo: 'strategy',
  content_builder: 'strategy',
  
  monitor: 'execution',
  elementor_builder: 'execution',
  page_builder: 'execution',
  internal_linker: 'execution',
  publisher: 'execution',
  fixer: 'execution',
};

const GEMINI_PRO_PREVIEW = 'gemini-3-pro-preview';
const GEMINI_FLASH_PREVIEW = 'gemini-3-flash-preview';
const GEMINI_25_PRO = 'gemini-2.5-pro';

const MODEL_CONFIG = {
  strategy: {
    primary: GEMINI_PRO_PREVIEW,
    fallback: GEMINI_25_PRO,
    maxOutputTokens: 2000,
    timeout: 60000,
    temperature: 0.7,
  },
  execution: {
    primary: GEMINI_PRO_PREVIEW,
    fallback: GEMINI_FLASH_PREVIEW,
    maxOutputTokens: 1000,
    timeout: 30000,
    temperature: 0.5,
  },
};

export interface GeminiRouterRequest {
  agentType: AgentType;
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
  /** Override API timeout in milliseconds (e.g. for heavy agents like elementor_builder). */
  timeoutMs?: number;
  stream?: boolean;
}

export interface GeminiRouterResponse {
  content: string;
  model: string;
  tokensUsed: number;
  finishReason: string;
  cost: number;
  duration: number;
}

export interface GeminiStreamChunk {
  content: string;
  done: boolean;
}

class GeminiRouter {
  private costTracker = {
    totalTokens: 0,
    totalCost: 0,
    callCount: 0,
  };

  getModelForAgent(agentType: AgentType, useFallback = false): string {
    const category = AGENT_CATEGORIES[agentType];
    const config = MODEL_CONFIG[category];
    return useFallback ? config.fallback : config.primary;
  }

  getConfigForAgent(agentType: AgentType): typeof MODEL_CONFIG.strategy {
    const category = AGENT_CATEGORIES[agentType];
    return MODEL_CONFIG[category];
  }

  async callWithRetry(
    request: GeminiRouterRequest,
    maxRetries = 3,
  ): Promise<GeminiRouterResponse> {
    let lastError: Error | null = null;
    let useFallback = false;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await this.call(request, useFallback);
      } catch (error) {
        lastError = error as Error;
        const category = AGENT_CATEGORIES[request.agentType];
        const fallbackModel = MODEL_CONFIG[category].fallback;

        if (attempt < maxRetries - 1) {
          if (!useFallback) {
            useFallback = true;
            logger.warn({
              agentType: request.agentType,
              error: lastError.message,
              fallbackModel,
            }, 'Switching to fallback model');
          } else {
            logger.warn({
              agentType: request.agentType,
              attempt,
              error: lastError.message,
            }, 'Gemini call failed, retrying');
          }

          const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          logger.warn({
            agentType: request.agentType,
            error: lastError.message,
            usedFallback: useFallback,
          }, 'Gemini call failed after retries');
        }
      }
    }

    throw lastError;
  }

  async call(
    request: GeminiRouterRequest,
    useFallback = false,
  ): Promise<GeminiRouterResponse> {
    const modelName = this.getModelForAgent(request.agentType, useFallback);
    const config = this.getConfigForAgent(request.agentType);
    
    const log = logger.child({
      agent: request.agentType,
      model: modelName,
      fallback: useFallback,
    });

    log.debug('Calling Gemini API');

    const generationConfig: GenerationConfig = {
      temperature: request.temperature ?? config.temperature,
      maxOutputTokens: request.maxTokens ?? config.maxOutputTokens,
      topP: 0.95,
      topK: 40,
    };

    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig,
      systemInstruction: request.systemPrompt,
    });

    const startTime = Date.now();
    const timeoutMs = request.timeoutMs ?? config.timeout;
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Gemini API timeout')), timeoutMs);
    });

    try {
      const result = await Promise.race([
        model.generateContent({
          contents: [
            {
              role: 'user',
              parts: [{ text: request.userPrompt }],
            },
          ],
        }),
        timeoutPromise,
      ]);

      const response = result.response;
      const text = response.text();
      const duration = Date.now() - startTime;

      const tokensUsed = this.estimateTokens(text);
      const cost = this.calculateCost(modelName, tokensUsed);

      this.costTracker.totalTokens += tokensUsed;
      this.costTracker.totalCost += cost;
      this.costTracker.callCount += 1;

      log.info({
        duration,
        tokensUsed,
        cost: cost.toFixed(6),
        totalCost: this.costTracker.totalCost.toFixed(6),
      }, 'Gemini response received');

      return {
        content: text,
        model: modelName,
        tokensUsed,
        finishReason: response.candidates?.[0]?.finishReason || 'STOP',
        cost,
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      log.error({ error, duration }, 'Gemini API error');
      throw error;
    }
  }

  async *stream(request: GeminiRouterRequest): AsyncGenerator<GeminiStreamChunk> {
    const modelName = this.getModelForAgent(request.agentType);
    const config = this.getConfigForAgent(request.agentType);

    const log = logger.child({
      agent: request.agentType,
      model: modelName,
      streaming: true,
    });

    log.debug('Starting Gemini stream');

    const generationConfig: GenerationConfig = {
      temperature: request.temperature ?? config.temperature,
      maxOutputTokens: request.maxTokens ?? config.maxOutputTokens,
      topP: 0.95,
      topK: 40,
    };

    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig,
      systemInstruction: request.systemPrompt,
    });

    try {
      const result = await model.generateContentStream({
        contents: [
          {
            role: 'user',
            parts: [{ text: request.userPrompt }],
          },
        ],
      });

      for await (const chunk of result.stream) {
        const text = chunk.text();
        yield {
          content: text,
          done: false,
        };
      }

      yield {
        content: '',
        done: true,
      };

      log.info('Gemini stream completed');
    } catch (error) {
      log.error({ error }, 'Gemini stream error');
      throw error;
    }
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  private calculateCost(model: string, tokens: number): number {
    const PRICING: Record<string, number> = {
      'gemini-3-pro-preview': 0.000002,
      'gemini-3-flash-preview': 0.000001,
      'gemini-2.5-pro': 0.000002,
      'gemini-2.0-flash-exp': 0.000001,
      'gemini-2.0-flash': 0.000001,
      'gemini-2.0-flash-lite': 0.0000005,
    };
    const rate = PRICING[model] ?? 0.000002;
    return tokens * rate;
  }

  getCostStats() {
    return { ...this.costTracker };
  }

  resetCostStats() {
    this.costTracker = {
      totalTokens: 0,
      totalCost: 0,
      callCount: 0,
    };
  }
}

export const geminiRouter = new GeminiRouter();
