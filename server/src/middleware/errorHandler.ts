import type { FastifyReply, FastifyRequest } from 'fastify';
import { AppError, ValidationError } from '../utils/errors.js';
import { logger } from '../lib/logger.js';
import { ZodError } from 'zod';
import { errorTracker } from '../services/errorTracking.js';

interface ErrorResponse {
  code: string;
  message: string;
  statusCode: number;
  details?: any;
  correlationId?: string;
}

export function errorHandler(
  error: Error,
  request: FastifyRequest,
  reply: FastifyReply
) {
  const correlationId = request.correlationId || request.id;

  let statusCode = 500;
  let code = 'INTERNAL_SERVER_ERROR';
  let message = 'An unexpected error occurred';
  let details: any = undefined;

  if (error instanceof AppError) {
    statusCode = error.statusCode;
    code = error.code;
    message = error.message;

    if (error instanceof ValidationError) {
      details = error.details;
    }
  } else if (error instanceof ZodError) {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Request validation failed';
    details = error.errors;
  }

  logger.error({
    error: error.message,
    statusCode,
    code,
    correlationId,
    method: request.method,
    url: request.url,
  }, `[${request.method} ${request.url}] Error occurred`);

  // Track error in error tracking service (excluding 404s and validation errors)
  if (statusCode >= 500 && !(error instanceof ValidationError)) {
    try {
      const projectId = (request.params as { projectId?: string })?.projectId;
      errorTracker.trackError(error, {
        route: request.url,
        method: request.method,
        projectId,
        correlationId,
      });
    } catch (trackError) {
      console.error('Failed to track error:', trackError);
    }
  }

  const response: ErrorResponse = {
    code,
    message,
    statusCode,
    correlationId,
  };

  if (details) {
    response.details = details;
  }

  reply.status(statusCode).send(response);
}
