import type { FastifyInstance } from "fastify";
import { authRoutes } from "./auth.js";
import { gscCallbackRoutes } from "./gscCallback.js";
import { integrationsRoutes } from "./integrations.js";
import { projectsRoutes } from "./projects.js";
import { webhooksRoutes } from "./webhooks.js";
import { pagesRoutes } from "./pages.js";
import { agentsRoutes } from "./agents.js";
import { rankingsRoutes } from "./rankings.js";
import { leadsRoutes } from "./leads.js";
import { analyticsRoutes } from "./analytics.js";
import { healthRoutes } from "./health.js";

export async function registerRoutes(app: FastifyInstance) {
  await app.register(authRoutes, { prefix: "/api" });
  await app.register(gscCallbackRoutes, { prefix: "/api" });
  await app.register(projectsRoutes, { prefix: "/api" });
  await app.register(integrationsRoutes, { prefix: "/api" });
  await app.register(webhooksRoutes, { prefix: "/api" });
  await app.register(pagesRoutes, { prefix: "/api" });
  await app.register(agentsRoutes, { prefix: "/api" });
  await app.register(rankingsRoutes, { prefix: "/api" });
  await app.register(leadsRoutes, { prefix: "/api" });
  await app.register(analyticsRoutes, { prefix: "/api" });
  await app.register(healthRoutes);
}
