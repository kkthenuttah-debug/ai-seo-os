import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import Fastify, { type FastifyInstance } from "fastify";
import { v4 as uuidv4 } from "uuid";
import { env } from "./lib/config.js";
import { logger } from "./lib/logger.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { registerRoutes } from "./routes/index.js";

export async function createApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: env.NODE_ENV === "development",
    requestTimeout: 30000,
    requestIdLogLabel: "correlationId",
    requestIdHeader: "x-correlation-id",
    genReqId: () => uuidv4(),
  });

  await app.register(cors, {
    origin: env.FRONTEND_URL,
    credentials: true,
  });

  await app.register(helmet, {
    contentSecurityPolicy: false,
  });

  await app.register(rateLimit, {
    max: 100,
    timeWindow: "15 minutes",
  });

  await registerRoutes(app);

  app.addHook("onRequest", async (request, reply) => {
    logger.debug(
      {
        method: request.method,
        url: request.url,
        correlationId: request.id,
      },
      `${request.method} ${request.url}`,
    );

    reply.header("X-Correlation-ID", request.id);
  });

  app.addHook("onResponse", async (request, reply) => {
    logger.info(
      {
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode,
        correlationId: request.id,
      },
      `${request.method} ${request.url}`,
    );
  });

  app.get("/health", async (request, reply) => {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
    };
  });

  app.setNotFoundHandler((request, reply) => {
    reply.status(404).send({
      code: "NOT_FOUND",
      message: "Route not found",
      statusCode: 404,
    });
  });

  app.setErrorHandler(errorHandler);

  logger.info("Fastify app created successfully");
  return app;
}
