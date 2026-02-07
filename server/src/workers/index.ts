import { startAgentTaskWorker } from './agent-task.worker.js';
import { startBuildWorker } from './build-worker.js';
import { startPublishWorker } from './publish-worker.js';
import { startIndexWorker } from './index-worker.js';
import { startMonitorWorker } from './monitor-worker.js';
import { startOptimizeWorker } from './optimize-worker.js';
import { registerWorker } from '../services/queueManager.js';
import { logger } from '../lib/logger.js';

const log = logger.child({ component: 'workers' });

type WorkerInstance = ReturnType<typeof startAgentTaskWorker | typeof startBuildWorker | typeof startPublishWorker | typeof startIndexWorker | typeof startMonitorWorker | typeof startOptimizeWorker>;
const workers: WorkerInstance[] = [];

// Start all workers
export async function startAllWorkers() {
  log.info('Starting all workers...');

  try {
    // Start agent task worker
    const agentTaskWorker = startAgentTaskWorker();
    registerWorker('agent-tasks', agentTaskWorker);
    workers.push(agentTaskWorker);

    // Start build worker
    const buildWorker = startBuildWorker();
    registerWorker('build', buildWorker);
    workers.push(buildWorker);

    // Start publish worker
    const publishWorker = startPublishWorker();
    registerWorker('publish', publishWorker);
    workers.push(publishWorker);

    // Start index worker (sitemap pings after publish)
    const indexWorker = startIndexWorker();
    registerWorker('index', indexWorker);
    workers.push(indexWorker);

    // Start monitor worker
    const monitorWorker = startMonitorWorker();
    registerWorker('monitor', monitorWorker);
    workers.push(monitorWorker);

    // Start optimize worker
    const optimizeWorker = startOptimizeWorker();
    registerWorker('optimize', optimizeWorker);
    workers.push(optimizeWorker);

    log.info({ workerCount: workers.length }, 'All workers started successfully');
  } catch (error) {
    log.error({ error }, 'Failed to start workers');
    throw error;
  }
}

// Stop all workers
export async function stopAllWorkers() {
  log.info('Stopping all workers...');

  for (const worker of workers) {
    try {
      await worker.close();
      log.info({ worker: worker.name }, 'Worker stopped');
    } catch (error) {
      log.error({ error }, 'Error stopping worker');
    }
  }

  workers.length = 0;
  log.info('All workers stopped');
}

// Get worker status
export function getWorkersStatus() {
  return {
    count: workers.length,
    workers: workers.map(w => ({
      name: w.name,
      isRunning: !w.isClosing(),
    })),
  };
}

// Start individual worker (for testing or selective worker startup)
export function startWorker(workerName: string) {
  log.info({ workerName }, 'Starting worker');

  switch (workerName) {
    case 'agent-tasks':
      return startAgentTaskWorker();
    case 'build':
      return startBuildWorker();
    case 'publish':
      return startPublishWorker();
    case 'index':
      return startIndexWorker();
    case 'monitor':
      return startMonitorWorker();
    case 'optimize':
      return startOptimizeWorker();
    default:
      throw new Error(`Unknown worker: ${workerName}`);
  }
}

// Main entry point for running workers
if (import.meta.url === `file://${process.argv[1]}`) {
  startAllWorkers()
    .then(() => {
      log.info('Worker process started');
    })
    .catch((error) => {
      log.error({ error }, 'Failed to start worker process');
      process.exit(1);
    });

  // Handle graceful shutdown
  const shutdown = async (signal: string) => {
    log.info({ signal }, 'Received shutdown signal');
    await stopAllWorkers();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}
