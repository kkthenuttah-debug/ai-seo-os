import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { getAppUserId, supabaseAdmin } from "../lib/supabase.js";
import { authenticate, verifyProjectOwnership } from "../middleware/auth.js";
import { getPagesByProjectId } from "../lib/supabase.js";
import { startAutomationLoop, schedulePublishing } from "../services/jobOrchestrator.js";
import { AuthError, NotFoundError } from "../utils/errors.js";

const createProjectSchema = z.object({
  name: z.string().min(1),
  domain: z.string().min(1),
  description: z.string().optional(),
  settings: z.record(z.unknown()).optional(),
});

const updateProjectSchema = z.object({
  name: z.string().optional(),
  domain: z.string().optional(),
  description: z.string().optional(),
  status: z.string().optional(),
  settings: z.record(z.unknown()).optional(),
});

const listProjectsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().default(10),
  status: z.string().optional(),
});

export async function projectsRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  app.get("/projects", async (request) => {
    const { page, limit, status } = listProjectsSchema.parse(request.query);
    const user = request.user;
    if (!user) throw new AuthError();

    const appUserId = await getAppUserId(user);

    let query = supabaseAdmin
      .from("projects")
      .select("*", { count: "exact" })
      .eq("user_id", appUserId)
      .range((page - 1) * limit, page * limit - 1)
      .order("created_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

    const { data, count, error } = await query;
    if (error) throw error;

    return {
      projects: data ?? [],
      total: count ?? 0,
      page,
      limit,
    };
  });

  app.post("/projects", async (request) => {
    const body = createProjectSchema.parse(request.body);
    const user = request.user;
    if (!user) throw new AuthError();

    const appUserId = await getAppUserId(user);

    const defaultSettings = {
      auto_optimize: true,
      publish_frequency: "weekly",
      ...(body.settings && typeof body.settings === "object" ? body.settings : {}),
    };
    const { data, error } = await supabaseAdmin
      .from("projects")
      .insert({
        user_id: appUserId,
        name: body.name,
        domain: body.domain ?? null,
        status: "active",
        settings: defaultSettings,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  });

  app.get(
    "/projects/:projectId",
    { preHandler: [authenticate, verifyProjectOwnership] },
    async (request) => {
      const { projectId } = request.params as { projectId: string };

      const { data: project, error } = await supabaseAdmin
        .from("projects")
        .select(`
        *,
        integrations (type, status),
        agent_runs (agent_type, status, created_at)
      `)
        .eq("id", projectId)
        .order("created_at", { foreignTable: "agent_runs", ascending: false })
        .limit(1, { foreignTable: "agent_runs" })
        .single();

      if (error) throw error;
      if (!project) throw new NotFoundError("Project not found");

      return {
        ...project,
        last_agent_run: project.agent_runs?.[0] || null,
      };
    },
  );

  app.patch(
    "/projects/:projectId",
    { preHandler: [authenticate, verifyProjectOwnership] },
    async (request) => {
      const { projectId } = request.params as { projectId: string };
      const body = updateProjectSchema.parse(request.body);

      const { data, error } = await supabaseAdmin
        .from("projects")
        .update(body)
        .eq("id", projectId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
  );

  app.delete(
    "/projects/:projectId",
    { preHandler: [authenticate, verifyProjectOwnership] },
    async (request) => {
      const { projectId } = request.params as { projectId: string };

      const { error } = await supabaseAdmin
        .from("projects")
        .update({ status: "archived" })
        .eq("id", projectId);

      if (error) throw error;
      return { success: true };
    },
  );

  app.post(
    "/projects/:projectId/publish-ready",
    { preHandler: [authenticate, verifyProjectOwnership] },
    async (request) => {
      const { projectId } = request.params as { projectId: string };

      const pages = await getPagesByProjectId(projectId);
      const readyPages = pages.filter((p) => p.status === "ready");
      const pageIds = readyPages.map((p) => p.id);

      if (pageIds.length === 0) {
        return { success: true, message: "No ready pages to publish", scheduled: 0 };
      }

      await schedulePublishing(projectId, pageIds);
      return { success: true, message: `Scheduled publish for ${pageIds.length} page(s)`, scheduled: pageIds.length };
    },
  );

  app.post(
    "/projects/:projectId/start-loop",
    { preHandler: [authenticate, verifyProjectOwnership] },
    async (request) => {
      const { projectId } = request.params as { projectId: string };

      await startAutomationLoop(projectId);

      return { success: true };
    },
  );

  app.post(
    "/projects/:projectId/pause",
    { preHandler: [authenticate, verifyProjectOwnership] },
    async (request) => {
      const { projectId } = request.params as { projectId: string };

      const { error } = await supabaseAdmin
        .from("projects")
        .update({ status: "paused" })
        .eq("id", projectId);

      if (error) throw error;
      return { success: true };
    },
  );

  app.get(
    "/projects/:projectId/overview",
    { preHandler: [authenticate, verifyProjectOwnership] },
    async (request) => {
      const { projectId } = request.params as { projectId: string };

      const [
        { count: pageCount },
        { data: rankings },
        { data: agentRuns },
        { count: leadCount },
      ] = await Promise.all([
        supabaseAdmin
          .from("pages")
          .select("*", { count: "exact", head: true })
          .eq("project_id", projectId),
        supabaseAdmin
          .from("rankings")
          .select("*")
          .eq("project_id", projectId)
          .order("tracked_at", { ascending: false })
          .limit(5),
        supabaseAdmin
          .from("agent_runs")
          .select("*")
          .eq("project_id", projectId)
          .order("created_at", { ascending: false })
          .limit(5),
        supabaseAdmin
          .from("leads")
          .select("*", { count: "exact", head: true })
          .eq("project_id", projectId),
      ]);

      return {
        pageCount: pageCount || 0,
        rankings: rankings || [],
        recentAgentRuns: agentRuns || [],
        leadCount: leadCount || 0,
      };
    },
  );
}
