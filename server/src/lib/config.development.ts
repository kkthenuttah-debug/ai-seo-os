/**
 * Development-specific configuration.
 * Used when NODE_ENV=development.
 * - Increased logging
 * - Relaxed rate limits for local testing
 * - Larger batch sizes for testing
 */
export const developmentConfig = {
  logLevel: 'debug' as const,
  rateLimitMax: 200,
  rateLimitWindowMinutes: 15,
  requestTimeout: 60000,
  /** Batch size for GSC/analytics sync in dev */
  batchSize: 50,
  /** Enable verbose agent logging */
  verboseAgents: true,
};
