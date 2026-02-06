import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { supabaseAdmin } from '../lib/supabase.js';
import { createWordPressService } from '../services/wordpress.js';
import { createGSCService, exchangeGSCCode, getGSCAuthUrl } from '../services/gsc.js';
import { IntegrationRecoveryService } from '../services/integrationRecovery.js';
import { encryptValue, decryptValue } from '../utils/crypto.js';
import { AuthError, NotFoundError, ValidationError } from '../utils/errors.js';

const recovery = new IntegrationRecoveryService({ service: 'integration-routes' });

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
  app.post('/projects/:projectId/integrations/wordpress', async (request) => {
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
      throw new AuthError('Failed to validate WordPress credentials');
    }

    const encryptedPassword = encryptValue(body.applicationPassword);

    const { data: existing } = await supabaseAdmin
      .from('integrations')
      .select('*')
      .eq('project_id', projectId)
      .eq('type', 'wordpress')
      .maybeSingle();

    if (existing) {
      const { error } = await supabaseAdmin
        .from('integrations')
        .update({
          access_token_encrypted: encryptedPassword,
          refresh_token_encrypted: null,
          expires_at: null,
          status: 'active',
          data: {
            site_url: body.siteUrl,
            username: body.username,
          },
        })
        .eq('id', existing.id);

      if (error) throw error;
    } else {
      const { error } = await supabaseAdmin.from('integrations').insert({
        project_id: projectId,
        type: 'wordpress',
        access_token_encrypted: encryptedPassword,
        status: 'active',
        data: {
          site_url: body.siteUrl,
          username: body.username,
        },
      });

      if (error) throw error;
    }

    return { success: true };
  });

  app.post('/projects/:projectId/integrations/wordpress/disconnect', async (request) => {
    const { projectId } = request.params as { projectId: string };

    const { error } = await supabaseAdmin
      .from('integrations')
      .update({
        access_token_encrypted: null,
        refresh_token_encrypted: null,
        expires_at: null,
        status: 'inactive',
        data: {},
      })
      .eq('project_id', projectId)
      .eq('type', 'wordpress');

    if (error) throw error;

    return { success: true };
  });

  app.get('/projects/:projectId/integrations/gsc/auth-url', async () => {
    return { url: getGSCAuthUrl() };
  });

  app.get('/projects/:projectId/integrations/gsc/callback', async (request) => {
    const { projectId } = request.params as { projectId: string };
    const query = gscCallbackSchema.parse(request.query);

    const tokens = await exchangeGSCCode(query.code);
    if (!tokens.access_token || !tokens.refresh_token) {
      throw new ValidationError('Missing tokens from Google OAuth response');
    }

    const tokenExpiry = new Date(tokens.expiry_date).toISOString();
    const tempService = createGSCService(
      {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expiry: tokenExpiry,
        site_url: query.siteUrl ?? '',
      },
      projectId
    );

    const connected = await tempService.testConnection();
    if (!connected) {
      throw new AuthError('Failed to validate Google Search Console connection');
    }

    const encryptedAccess = encryptValue(tokens.access_token);
    const encryptedRefresh = encryptValue(tokens.refresh_token);

    const { data: existing } = await supabaseAdmin
      .from('integrations')
      .select('*')
      .eq('project_id', projectId)
      .eq('type', 'gsc')
      .maybeSingle();

    const dataPayload = query.siteUrl ? { site_url: query.siteUrl } : {};

    if (existing) {
      const { error } = await supabaseAdmin
        .from('integrations')
        .update({
          access_token_encrypted: encryptedAccess,
          refresh_token_encrypted: encryptedRefresh,
          expires_at: tokenExpiry,
          status: 'active',
          data: {
            ...existing.data,
            ...dataPayload,
          },
        })
        .eq('id', existing.id);

      if (error) throw error;
    } else {
      const { error } = await supabaseAdmin.from('integrations').insert({
        project_id: projectId,
        type: 'gsc',
        access_token_encrypted: encryptedAccess,
        refresh_token_encrypted: encryptedRefresh,
        expires_at: tokenExpiry,
        status: 'active',
        data: dataPayload,
      });

      if (error) throw error;
    }

    return { success: true };
  });

  app.post('/projects/:projectId/integrations/gsc/sync', async (request) => {
    const { projectId } = request.params as { projectId: string };

    const { data: integration } = await supabaseAdmin
      .from('integrations')
      .select('*')
      .eq('project_id', projectId)
      .eq('type', 'gsc')
      .maybeSingle();

    if (!integration?.access_token_encrypted || !integration.refresh_token_encrypted || !integration.data?.site_url) {
      throw new NotFoundError('GSC integration not configured');
    }

    const gscService = createGSCService(
      {
        access_token: decryptValue(integration.access_token_encrypted),
        refresh_token: decryptValue(integration.refresh_token_encrypted),
        token_expiry: integration.expires_at ?? new Date().toISOString(),
        site_url: integration.data.site_url as string,
      },
      integration.id
    );

    const snapshotCount = await recovery.executeWithRetry(() =>
      gscService.fetchAndStoreSnapshots(projectId)
    );

    return { success: true, snapshotCount };
  });

  app.get('/projects/:projectId/integrations/gsc/status', async (request) => {
    const { projectId } = request.params as { projectId: string };

    const { data: integration } = await supabaseAdmin
      .from('integrations')
      .select('status,last_sync_at,data')
      .eq('project_id', projectId)
      .eq('type', 'gsc')
      .maybeSingle();

    if (!integration) {
      throw new NotFoundError('GSC integration not found');
    }

    return {
      status: integration.status,
      lastSyncAt: integration.last_sync_at,
      siteUrl: integration.data?.site_url ?? null,
    };
  });
}
