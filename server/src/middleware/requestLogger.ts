import type { FastifyRequest, FastifyReply } from 'fastify';
import { logger } from '../lib/logger.js';

declare module 'fastify' {
  interface FastifyRequest {
    correlationId?: string;
    startTime?: number;
  }
}

export function requestLogger(request: FastifyRequest, reply: FastifyReply, done: () => void) {
  const correlationId = request.headers['x-correlation-id'] as string || crypto.randomUUID();
  request.correlationId = correlationId;
  request.startTime = Date.now();

  logger.setContext({
    correlationId,
    method: request.method,
    url: request.url,
    ip: request.ip,
  });

  logger.info('Incoming request', {
    method: request.method,
    url: request.url,
    userAgent: request.headers['user-agent'],
  });

  reply.addHook('onSend', async () => {
    const duration = request.startTime ? Date.now() - request.startTime : 0;
    
    logger.info('Request completed', {
      statusCode: reply.statusCode,
      duration: `${duration}ms`,
    });
    
    reply.header('x-correlation-id', correlationId);
  });

  done();
}
