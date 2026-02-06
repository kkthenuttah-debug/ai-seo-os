import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { supabaseAdmin } from "../lib/supabase.js";
import { authenticate, verifyProjectOwnership } from "../middleware/auth.js";
import { exchangeGSCCode, getGSCAuthUrl } from "../services/gsc.js";
import { createWordPressService } from "../services/wordpress.js";
import { encryptValue } from "../utils/crypto.js";
import { AuthError, ValidationError } from "../utils/errors.js";

const wordpressSchema = z.object({
  siteUrl: z.string().url(),
  username: z.string().min(1),
  applicationPassword: z.string().min(1),
});

const gscCallbackSchema = z.object({
  code: z.string().min(1),
  siteUrl: z.string().url().optional(),
});

export async function integrationsRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  app.get(
    "/projects/:projectId/integrations",
    { preHandler: verifyProjectOwnership },
    async (request) => {
      const { projectId } = request.params as { projectId: string };
      const { data, error } = await supabaseAdmin
        .from("integrations")
        .select("type, status, last_sync_at, data")
        .eq("project_id", projectId);

      if (error) throw error;
      return data;
    },
  );

  app.post(
    "/projects/:projectId/integrations/wordpress",
    { preHandler: verifyProjectOwnership },
    async (request) => {
      const { projectId } = request.params as { projectId: string };
      const body = wordpressSchema.parse(request.body);

      const credentials = {
        site_url: body.siteUrl,
        username: body.username,
        application_password: body.applicationPassword,
      };

      const wpService = createWordPressService(credentials);
      const connected = await wpService.testConnection();
      if (!connected) {
        throw new AuthError("Failed to validate WordPress credentials");
      }

      const encryptedPassword = encryptValue(body.applicationPassword);

      const { data: existing } = await supabaseAdmin
        .from("integrations")
        .select("*")
        .eq("project_id", projectId)
        .eq("type", "wordpress")
        .maybeSingle();

      if (existing) {
        const { error } = await supabaseAdmin
          .from("integrations")
          .update({
            access_token_encrypted: encryptedPassword,
            status: "active",
            data: {
              site_url: body.siteUrl,
              username: body.username,
            },
          })
          .eq("id", existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabaseAdmin.from("integrations").insert({
          project_id: projectId,
          type: "wordpress",
          access_token_encrypted: encryptedPassword,
          status: "active",
          data: {
            site_url: body.siteUrl,
            username: body.username,
          },
        });

        if (error) throw error;
      }

      return { success: true };
    },
  );

  app.post(
    "/projects/:projectId/integrations/gsc",
    { preHandler: verifyProjectOwnership },
    async () => {
      return { url: getGSCAuthUrl() };
    },
  );

  app.get(
    "/projects/:projectId/integrations/gsc/callback",
    { preHandler: verifyProjectOwnership },
    async (request) => {
      const { projectId } = request.params as { projectId: string };
      const query = gscCallbackSchema.parse(request.query);

      const tokens = await exchangeGSCCode(query.code);
      if (!tokens.access_token || !tokens.refresh_token) {
        throw new ValidationError("Missing tokens from Google OAuth response");
      }

      const tokenExpiry = new Date(tokens.expiry_date).toISOString();
      const encryptedAccess = encryptValue(tokens.access_token);
      const encryptedRefresh = encryptValue(tokens.refresh_token);

      const { data: existing } = await supabaseAdmin
        .from("integrations")
        .select("*")
        .eq("project_id", projectId)
        .eq("type", "gsc")
        .maybeSingle();

      const dataPayload = query.siteUrl ? { site_url: query.siteUrl } : {};

      if (existing) {
        const { error } = await supabaseAdmin
          .from("integrations")
          .update({
            access_token_encrypted: encryptedAccess,
            refresh_token_encrypted: encryptedRefresh,
            expires_at: tokenExpiry,
            status: "active",
            data: {
              ...existing.data,
              ...dataPayload,
            },
          })
          .eq("id", existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabaseAdmin.from("integrations").insert({
          project_id: projectId,
          type: "gsc",
          access_token_encrypted: encryptedAccess,
          refresh_token_encrypted: encryptedRefresh,
          expires_at: tokenExpiry,
          status: "active",
          data: dataPayload,
        });

        if (error) throw error;
      }

      return { success: true };
    },
  );

  app.delete(
    "/projects/:projectId/integrations/:integrationType",
    { preHandler: verifyProjectOwnership },
    async (request) => {
      const { projectId, integrationType } = request.params as {
        projectId: string;
        integrationType: string;
      };

      const { error } = await supabaseAdmin
        .from("integrations")
        .delete()
        .eq("project_id", projectId)
        .eq("type", integrationType);

      if (error) throw error;
      return { success: true };
    },
  );
}
