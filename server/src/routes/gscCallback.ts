import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { env } from "../lib/config.js";
import { supabaseAdmin } from "../lib/supabase.js";
import { exchangeGSCCode, getFirstVerifiedSiteUrl } from "../services/gsc.js";
import { encryptValue } from "../utils/crypto.js";
import { ValidationError } from "../utils/errors.js";

const querySchema = z.object({
  code: z.string().min(1),
  state: z.string().min(1),
  siteUrl: z.string().url().optional(),
});

/**
 * Public GSC OAuth callback (no auth). Google redirects here with code and state.
 * GOOGLE_REDIRECT_URI must be set to this path, e.g. http://localhost:3000/api/integrations/gsc/callback
 */
export async function gscCallbackRoutes(app: FastifyInstance) {
  app.get("/integrations/gsc/callback", async (request, reply) => {
    const parsed = querySchema.safeParse(request.query);
    if (!parsed.success) {
      const msg = "Missing code or state. Please try connecting again.";
      const redirectUrl = `${env.FRONTEND_URL}?gsc=error&message=${encodeURIComponent(msg)}`;
      return reply.redirect(redirectUrl, 302);
    }
    const { code, state: projectId, siteUrl } = parsed.data;

    try {
      const tokens = await exchangeGSCCode(code);
      if (!tokens.access_token || !tokens.refresh_token) {
        throw new ValidationError("Missing tokens from Google");
      }

      const tokenExpiry = new Date(tokens.expiry_date).toISOString();
      const encryptedAccess = encryptValue(tokens.access_token);
      const encryptedRefresh = encryptValue(tokens.refresh_token);
      const dataPayload = siteUrl ? { site_url: siteUrl } : {};

      const { data: existing } = await supabaseAdmin
        .from("integrations")
        .select("*")
        .eq("project_id", projectId)
        .eq("type", "gsc")
        .maybeSingle();

      if (existing) {
        request.log.info({ projectId, integrationId: existing.id }, "GSC callback: updating existing integration");
        const { error } = await supabaseAdmin
          .from("integrations")
          .update({
            access_token_encrypted: encryptedAccess,
            refresh_token_encrypted: encryptedRefresh,
            expires_at: tokenExpiry,
            status: "active",
            data: { ...(existing.data as object), ...dataPayload },
          })
          .eq("id", existing.id);
        if (error) {
          request.log.error({ err: error, projectId }, "GSC callback: integration update failed");
          throw error;
        }
      } else {
        request.log.info({ projectId }, "GSC callback: inserting new GSC integration");
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
          request.log.error({ err: error, projectId }, "GSC callback: integration insert failed");
          throw error;
        }
        request.log.info({ projectId, integrationId: inserted?.id }, "GSC callback: integration saved");
      }

      if (!siteUrl) {
        try {
          const firstSite = await getFirstVerifiedSiteUrl({
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            token_expiry: tokenExpiry,
          });
          if (firstSite) {
            const { data: row } = await supabaseAdmin
              .from("integrations")
              .select("id, data")
              .eq("project_id", projectId)
              .eq("type", "gsc")
              .single();
            if (row) {
              await supabaseAdmin
                .from("integrations")
                .update({ data: { ...(row.data as object), site_url: firstSite } })
                .eq("id", row.id);
            }
          }
        } catch {
          // Non-fatal: user can set site URL later or trigger sync
        }
      }

      const redirectUrl = `${env.FRONTEND_URL}/app/projects/${projectId}/integrations?gsc=success`;
      return reply.redirect(redirectUrl, 302);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Connection failed";
      const redirectUrl = `${env.FRONTEND_URL}/app/projects/${projectId}/integrations?gsc=error&message=${encodeURIComponent(message)}`;
      return reply.redirect(redirectUrl, 302);
    }
  });
}
