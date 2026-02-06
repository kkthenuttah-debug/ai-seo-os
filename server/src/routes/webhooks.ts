import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { AuthError, RateLimitError, ValidationError } from '../utils/errors.js';
import { WebhookService } from '../services/webhooks.js';

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
}
