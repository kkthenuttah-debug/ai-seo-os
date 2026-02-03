import { createApp } from './app.js';
import { env, validateEnv } from './lib/config.js';
import { logger } from './lib/logger.js';
import { db } from './db/client.js';

const PORT = env.PORT;
const HOST = env.HOST;

async function start() {
  try {
    logger.info('Starting AI SEO OS API Server...');

    validateEnv();

    const dbHealthy = await db.healthCheck();
    if (!dbHealthy) {
      logger.error('Database health check failed');
      process.exit(1);
    }
    logger.info('Database connection verified');

    const app = await createApp();

    await app.listen({ port: PORT, host: HOST });

    logger.info(`Server listening on http://${HOST}:${PORT}`);
  } catch (error) {
    logger.error({ error }, 'Failed to start server');
    process.exit(1);
  }
}

async function shutdown(signal: string) {
  logger.info(`Received ${signal}, shutting down gracefully...`);
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

start();
