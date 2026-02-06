import type { FastifyInstance } from "fastify";
import { authRoutes } from "./auth.js";
import { integrationsRoutes } from "./integrations.js";
import { projectsRoutes } from "./projects.js";
import { webhooksRoutes } from "./webhooks.js";

export async function registerRoutes(app: FastifyInstance) {
  await app.register(authRoutes, { prefix: "/api" });
  await app.register(projectsRoutes, { prefix: "/api" });
  await app.register(integrationsRoutes, { prefix: "/api" });
  await app.register(webhooksRoutes, { prefix: "/api" });
}
