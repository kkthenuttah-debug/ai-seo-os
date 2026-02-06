/**
 * Example script demonstrating queue system usage
 *
 * Run with: tsx examples/queue-usage.ts
 */

import {
  scheduleAgentTask,
  scheduleAgentTasks,
  scheduleBuildJob,
  schedulePublishJob,
  scheduleMonitorJob,
  scheduleOptimizeJob,
  scheduleWebhook,
  getAllQueueStats,
  checkQueuesHealth,
} from '../src/queues/index.js';
import {
  startAutomationLoop,
  scheduleContentBuilding,
  schedulePublishing,
  startMonitoringLoop,
} from '../src/services/jobOrchestrator.js';
import {
  getQueueMetrics,
  pauseQueue,
  resumeQueue,
} from '../src/services/queueManager.js';

// Example 1: Start full automation loop for a project
async function example1_startAutomation() {
  console.log('\n=== Example 1: Start Full Automation Loop ===\n');

  const projectId = 'test-project-id-123';

  try {
    await startAutomationLoop(projectId);
    console.log(`✓ Automation loop started for project: ${projectId}`);
    console.log('  - Market Research Agent scheduled');
    console.log('  - Subsequent agents will auto-chain');
  } catch (error) {
    console.error('✗ Failed to start automation:', error);
  }
}

// Example 2: Schedule individual agent task
async function example2_scheduleAgentTask() {
  console.log('\n=== Example 2: Schedule Agent Task ===\n');

  const projectId = 'test-project-id-456';

  try {
    await scheduleAgentTask({
      project_id: projectId,
      agent_type: 'market_research',
      input: {
        niche: 'SaaS for restaurants',
        target_audience: 'Restaurant owners',
      },
      correlation_id: `example-${Date.now()}`,
    });

    console.log('✓ Market Research Agent scheduled');
  } catch (error) {
    console.error('✗ Failed to schedule agent:', error);
  }
}

// Example 3: Schedule multiple agent tasks in bulk
async function example3_scheduleBulkTasks() {
  console.log('\n=== Example 3: Schedule Bulk Agent Tasks ===\n');

  const projectId = 'test-project-id-789';

  try {
    const tasks = [
      {
        project_id: projectId,
        agent_type: 'content_builder' as const,
        input: { page_title: 'About Us' },
        correlation_id: `bulk-1-${Date.now()}`,
      },
      {
        project_id: projectId,
        agent_type: 'content_builder' as const,
        input: { page_title: 'Services' },
        correlation_id: `bulk-2-${Date.now()}`,
      },
      {
        project_id: projectId,
        agent_type: 'content_builder' as const,
        input: { page_title: 'Contact' },
        correlation_id: `bulk-3-${Date.now()}`,
      },
    ];

    await scheduleAgentTasks(tasks);
    console.log('✓ 3 Content Builder Agents scheduled in bulk');
  } catch (error) {
    console.error('✗ Failed to schedule bulk tasks:', error);
  }
}

// Example 4: Schedule build job
async function example4_scheduleBuildJob() {
  console.log('\n=== Example 4: Schedule Build Job ===\n');

  const projectId = 'test-project-id-abc';

  try {
    await scheduleBuildJob({
      project_id: projectId,
      phase: 'architecture',
    });

    console.log('✓ Build job scheduled (architecture phase)');
  } catch (error) {
    console.error('✗ Failed to schedule build job:', error);
  }
}

// Example 5: Schedule content building for multiple pages
async function example5_scheduleContentBuilding() {
  console.log('\n=== Example 5: Schedule Content Building ===\n');

  const projectId = 'test-project-id-def';
  const pageIds = ['page-1', 'page-2', 'page-3'];

  try {
    await scheduleContentBuilding(projectId, pageIds);
    console.log(`✓ Content building scheduled for ${pageIds.length} pages`);
  } catch (error) {
    console.error('✗ Failed to schedule content building:', error);
  }
}

// Example 6: Schedule publishing with delays
async function example6_schedulePublishing() {
  console.log('\n=== Example 6: Schedule Publishing ===\n');

  const projectId = 'test-project-id-ghi';
  const pageIds = ['page-1', 'page-2', 'page-3'];

  try {
    await schedulePublishing(projectId, pageIds);
    console.log(`✓ Publishing scheduled for ${pageIds.length} pages`);
    console.log('  - Jobs staggered by 30s to avoid rate limits');
  } catch (error) {
    console.error('✗ Failed to schedule publishing:', error);
  }
}

// Example 7: Schedule monitoring
async function example7_scheduleMonitoring() {
  console.log('\n=== Example 7: Schedule Monitoring ===\n');

  const projectId = 'test-project-id-jkl';

  try {
    await startMonitoringLoop(projectId);
    console.log('✓ Monitoring loop started');
    console.log('  - Will run every 24 hours');
    console.log('  - GSC data will be collected');
  } catch (error) {
    console.error('✗ Failed to schedule monitoring:', error);
  }
}

// Example 8: Schedule optimization
async function example8_scheduleOptimization() {
  console.log('\n=== Example 8: Schedule Optimization ===\n');

  const projectId = 'test-project-id-mno';
  const pageId = 'page-1';

  try {
    await scheduleOptimizeJob({
      project_id: projectId,
      page_id: pageId,
      reason: 'performance_drop',
    });

    console.log('✓ Optimization scheduled');
    console.log('  - Triggered by performance drop');
    console.log('  - Optimizer agent will analyze GSC data');
  } catch (error) {
    console.error('✗ Failed to schedule optimization:', error);
  }
}

// Example 9: Schedule webhook
async function example9_scheduleWebhook() {
  console.log('\n=== Example 9: Schedule Webhook ===\n');

  const projectId = 'test-project-id-pqr';

  try {
    await scheduleWebhook({
      project_id: projectId,
      webhook_type: 'wordpress_publish',
      url: 'https://example.com/webhook',
      payload: {
        event: 'page_published',
        page_id: 'page-1',
        url: 'https://example.com/page-1',
      },
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': 'secret-key',
      },
      correlation_id: `webhook-${Date.now()}`,
    });

    console.log('✓ Webhook scheduled');
    console.log('  - Will be delivered with retry logic');
  } catch (error) {
    console.error('✗ Failed to schedule webhook:', error);
  }
}

// Example 10: Get queue statistics
async function example10_getQueueStats() {
  console.log('\n=== Example 10: Get Queue Statistics ===\n');

  try {
    const stats = await getAllQueueStats();
    console.log('Queue Statistics:');
    console.table(stats);
  } catch (error) {
    console.error('✗ Failed to get queue stats:', error);
  }
}

// Example 11: Get detailed metrics
async function example11_getMetrics() {
  console.log('\n=== Example 11: Get Detailed Metrics ===\n');

  try {
    const metrics = await getQueueMetrics();
    console.log('System Metrics:');
    console.log(`  Total Queues: ${metrics.queues.total}`);
    console.log(`  Healthy Queues: ${metrics.queues.healthy}`);
    console.log(`  Total Workers: ${metrics.workers.total}`);
    console.log(`  Active Workers: ${metrics.workers.active}`);
    console.log(`\nQueue Details:`);
    console.table(metrics.queues.details);
    console.log(`\nWorker Details:`);
    console.table(metrics.workers.details);
  } catch (error) {
    console.error('✗ Failed to get metrics:', error);
  }
}

// Example 12: Health check
async function example12_healthCheck() {
  console.log('\n=== Example 12: Health Check ===\n');

  try {
    const health = await checkQueuesHealth();
    console.log(`System Healthy: ${health.healthy ? '✓ Yes' : '✗ No'}`);
    console.log('\nQueue Health:');
    console.table(
      health.queues.map(q => ({
        Queue: q.queue_name,
        Waiting: q.waiting,
        Active: q.active,
        Failed: q.failed,
        Paused: q.is_paused ? 'Yes' : 'No',
      }))
    );
  } catch (error) {
    console.error('✗ Failed to check health:', error);
  }
}

// Example 13: Pause and resume queue
async function example13_pauseResumeQueue() {
  console.log('\n=== Example 13: Pause and Resume Queue ===\n');

  try {
    console.log('Pausing build queue...');
    await pauseQueue('build');
    console.log('✓ Build queue paused');

    console.log('\nWaiting 5 seconds...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('Resuming build queue...');
    await resumeQueue('build');
    console.log('✓ Build queue resumed');
  } catch (error) {
    console.error('✗ Failed to pause/resume:', error);
  }
}

// Main: Run all examples
async function main() {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║   BullMQ Queue System - Usage Examples      ║');
  console.log('╚══════════════════════════════════════════╝');

  // Run examples
  await example1_startAutomation();
  await example2_scheduleAgentTask();
  await example3_scheduleBulkTasks();
  await example4_scheduleBuildJob();
  await example5_scheduleContentBuilding();
  await example6_schedulePublishing();
  await example7_scheduleMonitoring();
  await example8_scheduleOptimization();
  await example9_scheduleWebhook();
  await example10_getQueueStats();
  await example11_getMetrics();
  await example12_healthCheck();
  await example13_pauseResumeQueue();

  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║   All examples completed!                     ║');
  console.log('╚══════════════════════════════════════════╝');
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
