import { GoogleGenerativeAI, GenerativeModel, GenerationConfig } from '@google/generative-ai';
import { env } from './config.js';
import { logger } from './logger.js';
import type { AgentType } from '../types/index.js';

const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);

// All agents use Gemini 3 Pro Preview
const GEMINI_PRO_PREVIEW = 'gemini-3-pro-preview';
const MODEL_ROUTING: Record<AgentType, string> = {
  market_research: GEMINI_PRO_PREVIEW,
  site_architect: GEMINI_PRO_PREVIEW,
  optimizer: GEMINI_PRO_PREVIEW,
  technical_seo: GEMINI_PRO_PREVIEW,
  content_builder: GEMINI_PRO_PREVIEW,
  monitor: GEMINI_PRO_PREVIEW,
  elementor_builder: GEMINI_PRO_PREVIEW,
  page_builder: GEMINI_PRO_PREVIEW,
  internal_linker: GEMINI_PRO_PREVIEW,
  publisher: GEMINI_PRO_PREVIEW,
  fixer: GEMINI_PRO_PREVIEW,
};

const DEFAULT_GENERATION_CONFIG: GenerationConfig = {
  temperature: 0.7,
  topP: 0.95,
  topK: 40,
  maxOutputTokens: 8192,
};

export interface GeminiRequest {
  agentType: AgentType;
  systemPrompt: string;
  userPrompt: string;
  jsonSchema?: object;
  maxTokens?: number;
  temperature?: number;
}

export interface GeminiResponse {
  content: string;
  model: string;
  tokensUsed: number;
  finishReason: string;
}

export async function callGemini(request: GeminiRequest): Promise<GeminiResponse> {
  const modelName = MODEL_ROUTING[request.agentType];
  const log = logger.child({ agent: request.agentType, model: modelName });

  log.debug('Calling Gemini API');

  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      ...DEFAULT_GENERATION_CONFIG,
      maxOutputTokens: request.maxTokens || DEFAULT_GENERATION_CONFIG.maxOutputTokens,
      temperature: request.temperature ?? DEFAULT_GENERATION_CONFIG.temperature,
    },
    systemInstruction: request.systemPrompt,
  });

  const startTime = Date.now();

  try {
    const result = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [{ text: request.userPrompt }],
        },
      ],
    });

    const response = result.response;
    const text = response.text();
    const duration = Date.now() - startTime;

    log.info({ duration, tokensUsed: text.length / 4 }, 'Gemini response received');

    return {
      content: text,
      model: modelName,
      tokensUsed: Math.ceil(text.length / 4), // Approximate token count
      finishReason: response.candidates?.[0]?.finishReason || 'STOP',
    };
  } catch (error) {
    log.error({ error }, 'Gemini API error');
    throw error;
  }
}

export async function callGeminiWithRetry(
  request: GeminiRequest,
  maxRetries = 3,
  baseDelay = 1000
): Promise<GeminiResponse> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await callGemini(request);
    } catch (error) {
      lastError = error as Error;
      const delay = baseDelay * Math.pow(2, attempt);
      logger.warn({ attempt, delay, error: lastError.message }, 'Retrying Gemini call');
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

export function parseJsonResponse<T>(content: string): T {
  // Extract JSON from markdown code blocks if present
  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonStr = jsonMatch ? jsonMatch[1].trim() : content.trim();

  try {
    return JSON.parse(jsonStr) as T;
  } catch (error) {
    logger.error({ content: content.substring(0, 500) }, 'Failed to parse JSON response');
    throw new Error('Invalid JSON response from AI');
  }
}

export function getModelForAgent(agentType: AgentType): string {
  return MODEL_ROUTING[agentType];
}
