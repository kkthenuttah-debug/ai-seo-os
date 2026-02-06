import type { FastifyRequest, FastifyReply } from 'fastify';
import { metricsCollector } from '../services/metricsCollector.js';

export function metricsRecorder(request: FastifyRequest, reply: FastifyReply, done: () => void) {
  const startTime = Date.now();

  reply.addHook('onSend', async () => {
    const duration = Date.now() - startTime;
    const route = request.routeOptions.url || request.url;
    const method = request.method;

    try {
      metricsCollector.recordApiCall(route, method, reply.statusCode, duration);
    } catch (error) {
      console.error('Failed to record metrics:', error);
    }
  });

  done();
}
