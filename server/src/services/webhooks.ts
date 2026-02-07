import crypto from 'node:crypto';
import { env } from '../lib/config.js';
import { logger } from '../lib/logger.js';
import { supabaseAdmin } from '../lib/supabase.js';
import { decryptValue } from '../utils/crypto.js';
import { IntegrationRecoveryService } from './integrationRecovery.js';
import { createGSCService } from './gsc.js';
import type {
  LeadWebhookPayload,
  PagePublishWebhookPayload,
  MonitorCompletedWebhookPayload,
  WebhookResult,
} from '../types/webhooks.js';

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
      const { error } = await supabaseAdmin.from('leads').insert(lead as never);
      if (error) throw error;
    });

    log.info({ projectId: payload.projectId, email: payload.email }, 'Lead captured via webhook');

    return { success: true };
  }

  async handlePagePublishWebhook(payload: PagePublishWebhookPayload): Promise<WebhookResult> {
    const now = new Date().toISOString();
    const updates: Record<string, unknown> = {
      publish_status: payload.status === 'published' ? 'published' : 'pending',
      status: payload.status === 'published' ? 'published' : 'draft',
      published_at: payload.publishedAt ?? now,
      updated_at: now,
    };
    if (payload.wordpressPostId != null) {
      updates.wordpress_post_id = payload.wordpressPostId;
    }

    const query = supabaseAdmin.from('pages').update(updates as never).eq('project_id', payload.projectId);
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
    const { data } = await supabaseAdmin
      .from('integrations')
      .select('*')
      .eq('project_id', projectId)
      .eq('type', 'gsc')
      .maybeSingle();

    const integration = data as {
      id: string;
      access_token_encrypted: string | null;
      refresh_token_encrypted: string | null;
      expires_at: string | null;
      data: { site_url?: string };
    } | null;

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

  /** Trigger outbound webhooks for monitor.completed (POST to registered URLs). */
  async triggerMonitorCompleted(payload: MonitorCompletedWebhookPayload): Promise<void> {
    const { data: webhooks } = await supabaseAdmin
      .from('webhooks')
      .select('id, url, secret, events')
      .eq('project_id', payload.projectId)
      .eq('active', true);

    const list = (webhooks ?? []) as Array<{ id: string; url: string; secret: string; events: string[] }>;
    const subs = list.filter(w => Array.isArray(w.events) && w.events.includes('monitor.completed'));

    const now = new Date().toISOString();
    for (const w of subs) {
      try {
        const body = JSON.stringify(payload);
        const signature = crypto
          .createHmac('sha256', w.secret)
          .update(body)
          .digest('hex');

        const res = await fetch(w.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': signature,
            'X-Webhook-Event': 'monitor.completed',
          },
          body,
        });

        if (res.ok) {
          await supabaseAdmin
            .from('webhooks')
            .update({ last_triggered_at: now, updated_at: now } as never)
            .eq('id', w.id);
        }

        log.info(
          { webhookId: w.id, url: w.url, status: res.status },
          'Monitor completed webhook triggered'
        );
      } catch (err) {
        log.warn({ webhookId: w.id, url: w.url, error: err }, 'Monitor completed webhook delivery failed');
      }
    }
  }
}
