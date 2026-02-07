import { createApp } from './app.js';
import { env, validateEnv } from './lib/config.js';
import { logger } from './lib/logger.js';
import { db } from './db/client.js';
import { startAllWorkers, stopAllWorkers } from './workers/index.js';

const PORT = env.PORT;
const HOST = env.HOST;

async function start() {
  try {
    logger.info('Starting AI SEO OS API Server...');

    validateEnv();

    const dbHealthy = await db.healthCheck();
    if (!dbHealthy) {
      if (env.NODE_ENV === 'development') {
        logger.warn('Database health check failed (continuing in development). Set SUPABASE_URL and keys in .env for full functionality.');
      } else {
        logger.error('Database health check failed');
        process.exit(1);
      }
    } else {
      logger.info('Database connection verified');
    }

    const app = await createApp();

    await app.listen({ port: PORT, host: HOST });

    logger.info(`Server listening on http://${HOST}:${PORT}`);

    await startAllWorkers();
    logger.info('Workers started (agent-tasks, build, publish, index, monitor, optimize)');
  } catch (error) {
    logger.error({ error }, 'Failed to start server');
    process.exit(1);
  }
}

async function shutdown(signal: string) {
  logger.info(`Received ${signal}, shutting down gracefully...`);
  await stopAllWorkers();
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

start();
