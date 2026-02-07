/**
 * Production configuration.
 * Used when NODE_ENV=production.
 * - Optimized logging (warn/error)
 * - Strict rate limiting
 * - Performance-optimized batch sizes
 */
export const productionConfig = {
  logLevel: 'warn' as const,
  rateLimitMax: 100,
  rateLimitWindowMinutes: 15,
  requestTimeout: 30000,
  /** Batch size for GSC/analytics sync in production */
  batchSize: 25,
  /** Disable verbose agent logging */
  verboseAgents: false,
};
