import crypto from 'node:crypto';
import { env } from '../lib/config.js';
import { logger } from '../lib/logger.js';
import { supabaseAdmin } from '../lib/supabase.js';
import { decryptValue } from '../utils/crypto.js';
import { IntegrationRecoveryService } from './integrationRecovery.js';
import { createGSCService } from './gsc.js';
import type { LeadWebhookPayload, PagePublishWebhookPayload, WebhookResult } from '../types/webhooks.js';

const log = logger.child({ service: 'webhooks' });
const recovery = new IntegrationRecoveryService({ service: 'webhooks' });

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export class WebhookService {
  private rateLimitStore = new Map<string, RateLimitEntry>();

  constructor(
    private rateLimitConfig = { limit: 60, windowMs: 60_000 },
    private ipWhitelist = env.WEBHOOK_IP_WHITELIST?.split(',').map(ip => ip.trim()).filter(Boolean) ?? []
  ) {}

  validateSignature(payload: unknown, signature?: string) {
    if (!env.WEBHOOK_SECRET) {
      return true;
    }

    if (!signature) {
      return false;
    }

    const payloadString = JSON.stringify(payload ?? {});
    const hmac = crypto.createHmac('sha256', env.WEBHOOK_SECRET).update(payloadString).digest('hex');

    if (signature.length !== hmac.length) {
      return false;
    }

    return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(signature));
  }

  isAllowedIp(ip: string) {
    if (this.ipWhitelist.length === 0) {
      return true;
    }
    return this.ipWhitelist.includes(ip);
  }

  checkRateLimit(key: string) {
    const now = Date.now();
    const entry = this.rateLimitStore.get(key);

    if (!entry || entry.resetAt <= now) {
      this.rateLimitStore.set(key, { count: 1, resetAt: now + this.rateLimitConfig.windowMs });
      return true;
    }

    if (entry.count >= this.rateLimitConfig.limit) {
      return false;
    }

    entry.count += 1;
    return true;
  }

  async handleLeadWebhook(payload: LeadWebhookPayload): Promise<WebhookResult> {
    const lead = {
      project_id: payload.projectId,
      email: payload.email,
      phone: payload.phone ?? null,
      name: payload.name ?? null,
      message: payload.message ?? null,
      source_page_id: payload.pageId ?? null,
      source_url: payload.sourceUrl ?? null,
      data: payload.data ?? {},
      captured_at: new Date().toISOString(),
    };

    await recovery.executeWithRetry(async () => {
      const { error } = await supabaseAdmin.from('leads').insert(lead);
      if (error) throw error;
    });

    log.info({ projectId: payload.projectId, email: payload.email }, 'Lead captured via webhook');

    return { success: true };
  }

  async handlePagePublishWebhook(payload: PagePublishWebhookPayload): Promise<WebhookResult> {
    const updates = {
      publish_status: payload.status === 'published' ? 'published' : 'pending',
      status: payload.status === 'published' ? 'published' : 'draft',
      published_at: payload.publishedAt ?? new Date().toISOString(),
    };

    const query = supabaseAdmin.from('pages').update(updates).eq('project_id', payload.projectId);
    if (payload.pageId) {
      query.eq('id', payload.pageId);
    } else if (payload.slug) {
      query.eq('slug', payload.slug);
    }

    await recovery.executeWithRetry(async () => {
      const { error } = await query;
      if (error) throw error;
    });

    if (payload.url) {
      await this.triggerIndexingCheck(payload.projectId, payload.url);
    }

    log.info({ projectId: payload.projectId, pageId: payload.pageId }, 'Page publish webhook processed');

    return { success: true };
  }

  private async triggerIndexingCheck(projectId: string, url: string) {
    const { data: integration } = await supabaseAdmin
      .from('integrations')
      .select('*')
      .eq('project_id', projectId)
      .eq('type', 'gsc')
      .maybeSingle();

    if (!integration?.access_token_encrypted || !integration.refresh_token_encrypted || !integration.data?.site_url) {
      return;
    }

    const service = createGSCService(
      {
        access_token: decryptValue(integration.access_token_encrypted),
        refresh_token: decryptValue(integration.refresh_token_encrypted),
        token_expiry: integration.expires_at ?? new Date().toISOString(),
        site_url: integration.data.site_url as string,
      },
      integration.id
    );

    await service.submitUrlForIndexing(url);
  }
}
