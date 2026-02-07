import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { supabaseAdmin } from '../lib/supabase.js';
import { authenticate, verifyProjectOwnership } from '../middleware/auth.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import { addSiteToSearchConsole, createGSCService, getFirstVerifiedSiteUrl, getVerifiedSiteUrlMatchingDomain } from '../services/gsc.js';
import { decryptValue } from '../utils/crypto.js';

/** Derive GSC property URL from project domain or wordpress_url. */
function deriveGscSiteUrlFromProject(project: {
  domain?: string | null;
  wordpress_url?: string | null;
}): string | null {
  const raw = (project.wordpress_url ?? project.domain ?? '').toString().trim();
  if (!raw) return null;
  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    return raw.endsWith('/') ? raw : `${raw}/`;
  }
  const domain = raw.replace(/^\/+|\/+$/g, '');
  return domain ? `https://${domain}/` : null;
}

const listRankingsSchema = z.object({
  search: z.string().optional(),
  positionFilter: z.enum(['top3', 'top10', 'top20', 'page1', 'page2plus', 'all']).default('all'),
  sort: z.enum(['position', 'volume', 'difficulty', 'tracked_at']).default('position'),
  limit: z.coerce.number().int().positive().max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export async function rankingsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);

  app.get(
    '/projects/:projectId/rankings',
    { preHandler: [verifyProjectOwnership] },
    async (request) => {
      const { projectId } = request.params as { projectId: string };
      const { search, positionFilter, sort, limit, offset } = listRankingsSchema.parse(request.query);

      let query = supabaseAdmin
        .from('rankings')
        .select('*', { count: 'exact' })
        .eq('project_id', projectId)
        .range(offset, offset + limit - 1);

      // Apply position filter
      switch (positionFilter) {
        case 'top3':
          query = query.lte('position', 3);
          break;
        case 'top10':
          query = query.lte('position', 10);
          break;
        case 'top20':
          query = query.lte('position', 20);
          break;
        case 'page1':
          query = query.lte('position', 10);
          break;
        case 'page2plus':
          query = query.gt('position', 10);
          break;
      }

      // Apply search filter
      if (search) {
        query = query.ilike('keyword', `%${search}%`);
      }

      // Apply sorting
      const ascending = sort === 'volume' || sort === 'difficulty';
      query = query.order(sort, { ascending });

      const { data, count, error } = await query;
      if (error) throw error;

      return {
        rankings: data,
        total: count || 0,
        limit,
        offset,
      };
    }
  );

  app.get(
    '/projects/:projectId/rankings/top',
    { preHandler: [verifyProjectOwnership] },
    async (request) => {
      const { projectId } = request.params as { projectId: string };

      const { data, error } = await supabaseAdmin
        .from('rankings')
        .select('*')
        .eq('project_id', projectId)
        .order('position', { ascending: true })
        .order('search_volume', { ascending: false })
        .limit(10);

      if (error) throw error;

      // Calculate score for ranking (position + volume)
      const topKeywords = (data || []).map(ranking => ({
        ...ranking,
        score: calculateKeywordScore(ranking),
      })).sort((a, b) => b.score - a.score);

      return {
        topKeywords: topKeywords.slice(0, 10),
      };
    }
  );

  app.get(
    '/projects/:projectId/rankings/:keywordId/history',
    { preHandler: [verifyProjectOwnership] },
    async (request) => {
      const { projectId, keywordId } = request.params as { projectId: string; keywordId: string };

      // Get the ranking to get the keyword
      const { data: ranking, error: fetchError } = await supabaseAdmin
        .from('rankings')
        .select('keyword')
        .eq('id', keywordId)
        .eq('project_id', projectId)
        .single();

      if (fetchError) throw fetchError;
      if (!ranking) throw new NotFoundError('Keyword not found');

      // Get GSC snapshots for this keyword (last 90 days)
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const { data: snapshots, error } = await supabaseAdmin
        .from('gsc_snapshots')
        .select('*')
        .eq('project_id', projectId)
        .ilike('query', `%${ranking.keyword}%`)
        .gte('snapshot_date', ninetyDaysAgo.toISOString().split('T')[0])
        .order('snapshot_date', { ascending: true });

      if (error) throw error;

      // Group by date and take average position
      const historyData = groupSnapshotsByDate(snapshots || []);

      return {
        keyword: ranking.keyword,
        keywordId,
        history: historyData,
        startDate: ninetyDaysAgo.toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
      };
    }
  );

  app.post(
    '/projects/:projectId/rankings/sync',
    { preHandler: [verifyProjectOwnership] },
    async (request) => {
      try {
        return await runRankingsSync(request);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Sync failed';
        if (err instanceof ValidationError) throw err;
        request.log.warn({ err, projectId: (request.params as { projectId: string }).projectId }, 'Rankings sync error');
        throw new ValidationError(msg);
      }
    }
  );

  async function runRankingsSync(request: Parameters<Parameters<typeof app.post>[1]>[0]) {
      const { projectId } = request.params as { projectId: string };

      // Get GSC integration
      const { data: gscIntegration, error: integrationError } = await supabaseAdmin
        .from('integrations')
        .select('*')
        .eq('project_id', projectId)
        .eq('type', 'gsc')
        .single();

      if (integrationError || !gscIntegration) {
        throw new ValidationError('Google Search Console integration not configured');
      }

      if (gscIntegration.status !== 'active') {
        throw new ValidationError('Google Search Console integration is not active');
      }

      if (!gscIntegration.access_token_encrypted || !gscIntegration.refresh_token_encrypted) {
        throw new ValidationError('GSC integration is missing credentials. Disconnect and reconnect Google Search Console in Integrations.');
      }

      const { data: project } = await supabaseAdmin
        .from('projects')
        .select('domain, wordpress_url')
        .eq('id', projectId)
        .single();

      const creds = {
        access_token: decryptValue(gscIntegration.access_token_encrypted || ''),
        refresh_token: decryptValue(gscIntegration.refresh_token_encrypted || ''),
        token_expiry: gscIntegration.expires_at || new Date().toISOString(),
      };
      let siteUrl = (gscIntegration.data?.site_url as string) || '';
      if (!siteUrl) {
        siteUrl = deriveGscSiteUrlFromProject(project ?? {}) ?? '';
      }
      if (!siteUrl) {
        const firstSite = await getFirstVerifiedSiteUrl(creds);
        if (!firstSite) {
          throw new ValidationError(
            'No GSC property URL. Set your project domain in Project Settings (or add and verify your site in Google Search Console).'
          );
        }
        siteUrl = firstSite;
      }
      const addResult = await addSiteToSearchConsole(creds, siteUrl);
      if (!addResult.added && (addResult.error?.includes('scope') || addResult.error?.includes('403'))) {
        request.log.info({ projectId }, 'GSC add-site skipped (reconnect with full scope to add property via API)');
      }
      const matchResult = await getVerifiedSiteUrlMatchingDomain(creds, siteUrl);
      if (matchResult.matchedUrl) {
        siteUrl = matchResult.matchedUrl;
      } else {
        const accountHint =
          matchResult.verifiedCount === 0
            ? ' The Google account connected here has no verified properties in Search Console. Use the same Google account that verified your site in Search Console: disconnect GSC in Integrations and reconnect with that account.'
            : ' The Google account connected here has verified properties, but none match your project domain. Use the same Google account that verified this site in Search Console: disconnect GSC in Integrations and reconnect with that account.';
        throw new ValidationError(
          `No verified Search Console property found for your project domain.${accountHint}`
        );
      }
      const hadStoredSiteUrl = !!(gscIntegration.data?.site_url as string);
      if (!hadStoredSiteUrl || (gscIntegration.data?.site_url as string) !== siteUrl) {
        const dataObj = gscIntegration.data && typeof gscIntegration.data === 'object' && !Array.isArray(gscIntegration.data)
          ? gscIntegration.data as Record<string, unknown>
          : {};
        const { error: updateErr } = await supabaseAdmin
          .from('integrations')
          .update({ data: { ...dataObj, site_url: siteUrl } })
          .eq('id', gscIntegration.id);
        if (updateErr) {
          request.log.warn({ err: updateErr, projectId }, 'Failed to store GSC site_url');
          throw new ValidationError(updateErr.message || 'Failed to save integration');
        }
      }

      try {
        const gscService = createGSCService(
          {
            ...creds,
            site_url: siteUrl,
          },
          gscIntegration.id
        );

        await gscService.fetchAndStoreSnapshots(projectId);

        // Update rankings table from GSC snapshots
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data: recentSnapshots } = await supabaseAdmin
          .from('gsc_snapshots')
          .select('*')
          .eq('project_id', projectId)
          .gte('snapshot_date', thirtyDaysAgo.toISOString().split('T')[0]);

        // Update or insert rankings
        if (recentSnapshots) {
          for (const snapshot of recentSnapshots) {
            if (!snapshot.query || !snapshot.page) continue;

            // Check if ranking exists
            const { data: existingRanking } = await supabaseAdmin
              .from('rankings')
              .select('*')
              .eq('project_id', projectId)
              .eq('keyword', snapshot.query)
              .single();

            // rankings.position has CHECK (position > 0); use null when 0 or missing
            const pos = snapshot.position && snapshot.position > 0 ? snapshot.position : null;
            if (existingRanking) {
              const previousPosition = existingRanking.position;
              const positionChange = previousPosition != null && pos != null ? pos - previousPosition : null;

              await supabaseAdmin
                .from('rankings')
                .update({
                  position: pos ?? existingRanking.position,
                  previous_position: previousPosition,
                  position_change: positionChange,
                  url: snapshot.page,
                  search_volume: snapshot.impressions ?? null,
                  tracked_at: new Date().toISOString(),
                })
                .eq('id', existingRanking.id);
            } else if (pos != null) {
              await supabaseAdmin
                .from('rankings')
                .insert({
                  project_id: projectId,
                  keyword: snapshot.query,
                  page_id: null,
                  position: pos,
                  previous_position: null,
                  position_change: null,
                  url: snapshot.page ?? null,
                  search_volume: snapshot.impressions ?? null,
                  difficulty: null,
                  tracked_at: new Date().toISOString(),
                });
            }
          }
        }

        return {
          success: true,
          snapshotCount: recentSnapshots?.length || 0,
          syncedAt: new Date().toISOString(),
        };
      } catch (error: unknown) {
        const message = getSyncErrorMessage(error);
        request.log.warn({ err: error, projectId }, 'GSC sync failed');
        throw new ValidationError(message);
      }
  }

  function getSyncErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (error && typeof error === 'object') {
      const o = error as Record<string, unknown>;
      if (typeof o.message === 'string') return o.message;
      const data = o.response?.data;
      if (data && typeof data === 'object') {
        const d = data as Record<string, unknown>;
        const err = d.error;
        if (err && typeof err === 'object' && typeof (err as { message?: string }).message === 'string') {
          return (err as { message: string }).message;
        }
        if (typeof d.message === 'string') return d.message;
      }
      if (typeof o.statusMessage === 'string') return o.statusMessage;
    }
    return 'Failed to sync GSC data. Check server logs for details.';
  }

  app.get(
    '/projects/:projectId/rankings/insights',
    { preHandler: [verifyProjectOwnership] },
    async (request) => {
      const { projectId } = request.params as { projectId: string };

      // Get all rankings
      const { data: rankings, error } = await supabaseAdmin
        .from('rankings')
        .select('*')
        .eq('project_id', projectId);

      if (error) throw error;

      // Calculate insights
      const gaining = (rankings || []).filter(r => 
        r.position_change && r.position_change < 0 && r.position <= 20
      ).sort((a, b) => (a.position_change || 0) - (b.position_change || 0));

      const losing = (rankings || []).filter(r => 
        r.position_change && r.position_change > 0
      ).sort((a, b) => (b.position_change || 0) - (a.position_change || 0));

      // Get new keywords (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const newKeywords = (rankings || []).filter(r => 
        new Date(r.created_at) >= sevenDaysAgo
      );

      // Get opportunities (high volume, low position)
      const opportunities = (rankings || [])
        .filter(r => r.search_volume && r.search_volume > 100 && r.position > 20)
        .sort((a, b) => (b.search_volume || 0) - (a.search_volume || 0))
        .slice(0, 10);

      return {
        gaining: gaining.slice(0, 10).map(r => ({
          keyword: r.keyword,
          position: r.position,
          change: r.position_change,
          url: r.url,
        })),
        losing: losing.slice(0, 10).map(r => ({
          keyword: r.keyword,
          position: r.position,
          change: r.position_change,
          url: r.url,
        })),
        newKeywords: newKeywords.slice(0, 10).map(r => ({
          keyword: r.keyword,
          position: r.position,
          volume: r.search_volume,
          createdAt: r.created_at,
        })),
        opportunities: opportunities.map(r => ({
          keyword: r.keyword,
          position: r.position,
          volume: r.search_volume,
          url: r.url,
          potentialTraffic: Math.round((r.search_volume || 0) * 0.1),
        })),
        summary: {
          totalGaining: gaining.length,
          totalLosing: losing.length,
          totalNew: newKeywords.length,
          totalOpportunities: opportunities.length,
        },
      };
    }
  );
}

function calculateKeywordScore(ranking: any): number {
  // Score = (volume * 0.3) + ((21 - position) * 100 * 0.7)
  const volumeScore = (ranking.search_volume || 0) * 0.3;
  const positionScore = Math.max(0, 21 - (ranking.position || 0)) * 100 * 0.7;
  return volumeScore + positionScore;
}

function groupSnapshotsByDate(snapshots: any[]): Array<{
  date: string;
  position: number;
  clicks: number;
  impressions: number;
  ctr: number;
}> {
  const grouped = new Map<string, {
    positions: number[];
    clicks: number[];
    impressions: number[];
  }>();

  for (const snapshot of snapshots) {
    const date = snapshot.snapshot_date;
    if (!grouped.has(date)) {
      grouped.set(date, {
        positions: [],
        clicks: [],
        impressions: [],
      });
    }

    const group = grouped.get(date)!;
    if (snapshot.position) group.positions.push(snapshot.position);
    group.clicks.push(snapshot.clicks);
    group.impressions.push(snapshot.impressions);
  }

  return Array.from(grouped.entries())
    .map(([date, data]) => {
      const avgPosition = data.positions.length > 0
        ? data.positions.reduce((sum, p) => sum + p, 0) / data.positions.length
        : 0;
      const totalClicks = data.clicks.reduce((sum, c) => sum + c, 0);
      const totalImpressions = data.impressions.reduce((sum, i) => sum + i, 0);
      const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

      return {
        date,
        position: Math.round(avgPosition),
        clicks: totalClicks,
        impressions: totalImpressions,
        ctr: Math.round(ctr * 100) / 100,
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}
