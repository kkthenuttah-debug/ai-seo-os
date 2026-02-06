import { logger } from '../lib/logger.js';

export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
}

export class IntegrationRecoveryService {
  private log = logger.child({ service: 'integration-recovery' });

  constructor(private context: Record<string, unknown> = {}) {
    if (Object.keys(context).length > 0) {
      this.log = logger.child({ service: 'integration-recovery', ...context });
    }
  }

  async executeWithRetry<T>(operation: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
    const maxRetries = options.maxRetries ?? 3;
    const baseDelay = options.baseDelay ?? 1000;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        const delay = baseDelay * Math.pow(2, attempt);
        this.log.warn({ attempt, delay, error: lastError.message }, 'Retrying integration operation');
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    this.log.error({ error: lastError?.message }, 'Integration operation failed permanently');
    throw lastError;
  }

  async executeWithFallback<T>(operation: () => Promise<T>, fallback: () => Promise<T>, options?: RetryOptions): Promise<T> {
    try {
      return await this.executeWithRetry(operation, options);
    } catch (error) {
      this.log.warn({ error }, 'Using fallback after integration failure');
      return fallback();
    }
  }

  async manualRetry<T>(operation: () => Promise<T>): Promise<T> {
    return this.executeWithRetry(operation, { maxRetries: 5, baseDelay: 1500 });
  }
}
