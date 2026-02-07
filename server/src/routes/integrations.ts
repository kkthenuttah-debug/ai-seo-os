import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { env } from "../lib/config.js";
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

/** GSC property URL: either URL prefix (https://example.com/) or domain property (sc-domain:example.com) */
const gscSiteUrlSchema = z
  .string()
  .min(1, "Site URL is required")
  .refine(
    (v) => {
      if (v.startsWith("sc-domain:")) return /^sc-domain:[a-zA-Z0-9][-a-zA-Z0-9.]*\.[a-zA-Z]{2,}$/.test(v);
      try {
        new URL(v);
        return true;
      } catch {
        return false;
      }
    },
    { message: "Use a full URL (e.g. https://example.com/) or domain property (e.g. sc-domain:example.com)" }
  );

export async function integrationsRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  app.get(
    "/projects/:projectId/integrations",
    { preHandler: [verifyProjectOwnership] },
    async (request) => {
      const { projectId } = request.params as { projectId: string };
      const { data, error } = await supabaseAdmin
        .from("integrations")
        .select("type, status, last_sync_at, data")
        .eq("project_id", projectId);

      if (error) {
        request.log.warn({ err: error, projectId }, "Integrations list failed");
        throw new ValidationError(error.message || "Failed to load integrations");
      }
      return data ?? [];
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
        request.log.info({ projectId, integrationId: existing.id }, "WordPress: updating existing integration");
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

        if (error) {
          request.log.error({ err: error, projectId }, "WordPress: integration update failed");
          throw error;
        }
      } else {
        request.log.info({ projectId }, "WordPress: inserting new integration");
        const { data: inserted, error } = await supabaseAdmin
          .from("integrations")
          .insert({
            project_id: projectId,
            type: "wordpress",
            access_token_encrypted: encryptedPassword,
            status: "active",
            data: {
              site_url: body.siteUrl,
              username: body.username,
            },
          })
          .select("id")
          .single();
        if (error) {
          request.log.error({ err: error, projectId }, "WordPress: integration insert failed");
          throw error;
        }
        request.log.info({ projectId, integrationId: inserted?.id }, "WordPress: integration saved");
      }

      return { success: true };
    },
  );

  app.post(
    "/projects/:projectId/integrations/gsc",
    { preHandler: verifyProjectOwnership },
    async (request) => {
      const { projectId } = request.params as { projectId: string };
      try {
        const url = getGSCAuthUrl(projectId);
        if (!url?.trim()) {
          throw new ValidationError(
            "Google OAuth is not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and GOOGLE_REDIRECT_URI in the server .env (in the server/ folder or project root)."
          );
        }
        return { url };
      } catch (err) {
        if (err instanceof ValidationError) throw err;
        const msg = err instanceof Error ? err.message : String(err);
        throw new ValidationError(
          `Could not generate Google auth URL: ${msg}. Ensure GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and GOOGLE_REDIRECT_URI are set in server .env.`
        );
      }
    },
  );

  app.patch(
    "/projects/:projectId/integrations/gsc",
    { preHandler: verifyProjectOwnership },
    async (request) => {
      const { projectId } = request.params as { projectId: string };
      const body = z.object({ siteUrl: gscSiteUrlSchema }).parse(request.body);
      const { data: row, error: findError } = await supabaseAdmin
        .from("integrations")
        .select("id, data")
        .eq("project_id", projectId)
        .eq("type", "gsc")
        .maybeSingle();
      if (findError) throw findError;
      if (!row) {
        throw new ValidationError("Google Search Console integration not found. Connect GSC first.");
      }
      const { error: updateError } = await supabaseAdmin
        .from("integrations")
        .update({ data: { ...(row.data as object), site_url: body.siteUrl } })
        .eq("id", row.id);
      if (updateError) throw updateError;
      return { success: true, siteUrl: body.siteUrl };
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
        request.log.info({ projectId, integrationId: existing.id }, "GSC (auth): updating existing integration");
        const { error } = await supabaseAdmin
          .from("integrations")
          .update({
            access_token_encrypted: encryptedAccess,
            refresh_token_encrypted: encryptedRefresh,
            expires_at: tokenExpiry,
            status: "active",
            data: {
              ...(existing.data as object),
              ...dataPayload,
            },
          })
          .eq("id", existing.id);

        if (error) {
          request.log.error({ err: error, projectId }, "GSC (auth): integration update failed");
          throw error;
        }
      } else {
        request.log.info({ projectId }, "GSC (auth): inserting new integration");
        const { data: inserted, error } = await supabaseAdmin
          .from("integrations")
          .insert({
            project_id: projectId,
            type: "gsc",
            access_token_encrypted: encryptedAccess,
            refresh_token_encrypted: encryptedRefresh,
            expires_at: tokenExpiry,
            status: "active",
            data: dataPayload,
          })
          .select("id")
          .single();
        if (error) {
          request.log.error({ err: error, projectId }, "GSC (auth): integration insert failed");
          throw error;
        }
        request.log.info({ projectId, integrationId: inserted?.id }, "GSC (auth): integration saved");
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
