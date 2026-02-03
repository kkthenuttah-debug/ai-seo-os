import * as winston from "winston";
import { config } from "../config.js";

interface LogContext {
  correlationId?: string;
  userId?: string;
  projectId?: string;
  [key: string]: unknown;
}

type LogMeta = Record<string, unknown>;

class Logger {
  private logger: winston.Logger;
  private context: LogContext = {};

  constructor() {
    this.logger = winston.createLogger({
      level: config.logLevel,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
      ),
      defaultMeta: { service: "api-seo-os" },
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            config.isDevelopment()
              ? winston.format.colorize()
              : winston.format.json(),
            config.isDevelopment()
              ? winston.format.combine(
                  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
                  winston.format.printf(
                    ({ timestamp, level, message, ...meta }) => {
                      return `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ""}`;
                    },
                  ),
                )
              : winston.format.json(),
          ),
        }),
      ],
    });
  }

  setContext(context: Partial<LogContext>) {
    this.context = { ...this.context, ...context };
  }

  clearContext() {
    this.context = {};
  }

  private getMeta() {
    return this.context;
  }

  debug(message: string, meta?: LogMeta) {
    this.logger.debug(message, { ...this.getMeta(), ...meta });
  }

  info(message: string, meta?: LogMeta) {
    this.logger.info(message, { ...this.getMeta(), ...meta });
  }

  warn(message: string, meta?: LogMeta) {
    this.logger.warn(message, { ...this.getMeta(), ...meta });
  }

  error(message: string, error?: Error | unknown, meta?: LogMeta) {
    this.logger.error(message, {
      ...this.getMeta(),
      ...meta,
      error:
        error instanceof Error
          ? { message: error.message, stack: error.stack }
          : error,
    });
  }

  child(context: LogContext) {
    const childLogger = this.logger.child(context);
    return {
      debug: (message: string, meta?: LogMeta) =>
        childLogger.debug(message, meta),
      info: (message: string, meta?: LogMeta) =>
        childLogger.info(message, meta),
      warn: (message: string, meta?: LogMeta) =>
        childLogger.warn(message, meta),
      error: (message: string, error?: Error | unknown, meta?: LogMeta) => {
        childLogger.error(message, {
          ...meta,
          error:
            error instanceof Error
              ? { message: error.message, stack: error.stack }
              : error,
        });
      },
    };
  }
}

export const logger = new Logger();
