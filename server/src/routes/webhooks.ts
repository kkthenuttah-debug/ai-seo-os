import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { supabaseAdmin } from '../lib/supabase.js';
import { AuthError, RateLimitError, ValidationError } from '../utils/errors.js';
import { WebhookService } from '../services/webhooks.js';
import { authenticate, verifyProjectOwnership } from '../middleware/auth.js';

const webhookService = new WebhookService();

const leadSchema = z.object({
  projectId: z.string().min(1),
  pageId: z.string().optional(),
  email: z.string().email(),
  name: z.string().optional(),
  message: z.string().optional(),
  phone: z.string().optional(),
  sourceUrl: z.string().url().optional(),
  data: z.record(z.unknown()).optional(),
});

const pagePublishSchema = z.object({
  projectId: z.string().min(1),
  pageId: z.string().optional(),
  slug: z.string().optional(),
  url: z.string().url().optional(),
  status: z.enum(['draft', 'published']).optional(),
  publishedAt: z.string().optional(),
});

const registerWebhookSchema = z.object({
  url: z.string().url(),
  events: z.array(z.enum(['lead.created', 'page.published', 'agent.failed', 'ranking.changed'])),
  secret: z.string().optional(),
  active: z.boolean().default(true),
});

const updateWebhookSchema = z.object({
  url: z.string().url().optional(),
  events: z.array(z.enum(['lead.created', 'page.published', 'agent.failed', 'ranking.changed'])).optional(),
  active: z.boolean().optional(),
  secret: z.string().optional(),
});

function validateWebhook(request: { headers: Record<string, string | string[] | undefined>; ip: string; body: unknown; url: string }) {
  const signatureHeader = request.headers['x-webhook-signature'];
  const signature = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader;

  if (!webhookService.isAllowedIp(request.ip)) {
    throw new AuthError('IP not allowed for webhook');
  }

  if (!webhookService.validateSignature(request.body, signature)) {
    throw new AuthError('Invalid webhook signature');
  }

  const rateKey = `${request.ip}:${request.url}`;
  if (!webhookService.checkRateLimit(rateKey)) {
    throw new RateLimitError('Webhook rate limit exceeded');
  }
}

export async function webhooksRoutes(app: FastifyInstance) {
  // Public webhook endpoints (no authentication required)
  app.post('/webhooks/leads', async (request) => {
    validateWebhook({
      headers: request.headers as Record<string, string | string[] | undefined>,
      ip: request.ip,
      body: request.body,
      url: request.url,
    });

    const payload = leadSchema.parse(request.body);

    if (!payload.email) {
      throw new ValidationError('Lead email is required');
    }

    return webhookService.handleLeadWebhook(payload);
  });

  app.post('/webhooks/page-publish', async (request) => {
    validateWebhook({
      headers: request.headers as Record<string, string | string[] | undefined>,
      ip: request.ip,
      body: request.body,
      url: request.url,
    });

    const payload = pagePublishSchema.parse(request.body);

    if (!payload.pageId && !payload.slug) {
      throw new ValidationError('Either pageId or slug is required');
    }

    return webhookService.handlePagePublishWebhook(payload);
  });

  // Project webhook endpoints (require authentication)
  app.addHook('preHandler', authenticate);

  app.post(
    '/projects/:projectId/webhooks',
    { preHandler: [verifyProjectOwnership] },
    async (request) => {
      const { projectId } = request.params as { projectId: string };
      const body = registerWebhookSchema.parse(request.body);

      // Validate webhook URL is accessible
      try {
        const response = await fetch(body.url, { method: 'HEAD' });
        if (response.status >= 400) {
          throw new ValidationError('Webhook URL is not accessible');
        }
      } catch (error) {
        throw new ValidationError('Failed to verify webhook URL');
      }

      const { data, error } = await supabaseAdmin
        .from('webhooks')
        .insert({
          project_id: projectId,
          url: body.url,
          events: body.events,
          secret: body.secret || crypto.randomUUID(),
          active: body.active,
          last_triggered_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        url: data.url,
        events: data.events,
        active: data.active,
        createdAt: data.created_at,
      };
    }
  );

  app.get(
    '/projects/:projectId/webhooks',
    { preHandler: [verifyProjectOwnership] },
    async (request) => {
      const { projectId } = request.params as { projectId: string };

      const { data: webhooks, error } = await supabaseAdmin
        .from('webhooks')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return {
        webhooks: webhooks?.map(w => ({
          id: w.id,
          url: w.url,
          events: w.events,
          active: w.active,
          lastTriggeredAt: w.last_triggered_at,
          createdAt: w.created_at,
          updatedAt: w.updated_at,
        })) || [],
      };
    }
  );

  app.patch(
    '/projects/:projectId/webhooks/:webhookId',
    { preHandler: [verifyProjectOwnership] },
    async (request) => {
      const { projectId, webhookId } = request.params as { projectId: string; webhookId: string };
      const body = updateWebhookSchema.parse(request.body);

      const updateData: Record<string, unknown> = {};
      if (body.url !== undefined) updateData.url = body.url;
      if (body.events !== undefined) updateData.events = body.events;
      if (body.active !== undefined) updateData.active = body.active;
      if (body.secret !== undefined) updateData.secret = body.secret;
      updateData.updated_at = new Date().toISOString();

      const { data, error } = await supabaseAdmin
        .from('webhooks')
        .update(updateData)
        .eq('id', webhookId)
        .eq('project_id', projectId)
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new ValidationError('Webhook not found');

      return {
        id: data.id,
        url: data.url,
        events: data.events,
        active: data.active,
        lastTriggeredAt: data.last_triggered_at,
        updatedAt: data.updated_at,
      };
    }
  );

  app.delete(
    '/projects/:projectId/webhooks/:webhookId',
    { preHandler: [verifyProjectOwnership] },
    async (request) => {
      const { projectId, webhookId } = request.params as { projectId: string; webhookId: string };

      const { error } = await supabaseAdmin
        .from('webhooks')
        .delete()
        .eq('id', webhookId)
        .eq('project_id', projectId);

      if (error) throw error;

      return { success: true };
    }
  );

  app.get(
    '/projects/:projectId/webhooks/:webhookId/logs',
    { preHandler: [verifyProjectOwnership] },
    async (request) => {
      const { projectId, webhookId } = request.params as { projectId: string; webhookId: string };
      const { status, limit, offset } = z.object({
        status: z.enum(['success', 'failed', 'pending']).optional(),
        limit: z.coerce.number().int().positive().max(100).default(50),
        offset: z.coerce.number().int().min(0).default(0),
      }).parse(request.query);

      // In a real implementation, you'd have a webhook_logs table
      // For now, return mock data
      const mockLogs = Array.from({ length: 10 }, (_, i) => ({
        id: crypto.randomUUID(),
        webhookId,
        event: ['lead.created', 'page.published', 'agent.failed', 'ranking.changed'][i % 4],
        status: ['success', 'success', 'failed', 'success'][i % 4] as 'success' | 'failed' | 'pending',
        statusCode: [200, 200, 500, 200][i % 4],
        responseTime: Math.floor(Math.random() * 500) + 50,
        errorMessage: i % 4 === 2 ? 'Connection timeout' : null,
        payload: {},
        triggeredAt: new Date(Date.now() - i * 3600000).toISOString(),
      }));

      let filteredLogs = mockLogs;
      if (status) {
        filteredLogs = mockLogs.filter(log => log.status === status);
      }

      return {
        logs: filteredLogs.slice(offset, offset + limit),
        total: filteredLogs.length,
        limit,
        offset,
      };
    }
  );
}
