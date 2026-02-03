import pino from 'pino';
import { env } from './config.js';

export const logger = pino({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  transport: env.NODE_ENV === 'development'
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          ignore: 'pid,hostname',
          translateTime: 'SYS:standard',
        },
      }
    : undefined,
  base: {
    service: 'ai-seo-os',
  },
});

export function createChildLogger(context: Record<string, unknown>) {
  return logger.child(context);
}

export default logger;
