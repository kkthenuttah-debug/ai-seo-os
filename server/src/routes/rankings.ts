import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { supabaseAdmin } from '../lib/supabase.js';
import { authenticate, verifyProjectOwnership } from '../middleware/auth.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import { createGSCService } from '../services/gsc.js';

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

      // Trigger GSC sync (simplified - in real implementation would use GSC service)
      try {
        // Get GSC integration credentials
        const gscService = createGSCService(
          {
            access_token: gscIntegration.access_token_encrypted || '',
            refresh_token: gscIntegration.refresh_token_encrypted || '',
            token_expiry: gscIntegration.expires_at || '',
            site_url: (gscIntegration.data?.site_url as string) || '',
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

            if (existingRanking) {
              // Update existing ranking
              const newPosition = snapshot.position || 0;
              const previousPosition = existingRanking.position;
              const positionChange = previousPosition ? newPosition - previousPosition : null;

              await supabaseAdmin
                .from('rankings')
                .update({
                  position: newPosition,
                  previous_position: previousPosition,
                  position_change: positionChange,
                  url: snapshot.page,
                  search_volume: snapshot.impressions, // Using impressions as proxy for volume
                  tracked_at: new Date().toISOString(),
                })
                .eq('id', existingRanking.id);
            } else {
              // Insert new ranking
              await supabaseAdmin
                .from('rankings')
                .insert({
                  project_id: projectId,
                  keyword: snapshot.query,
                  page_id: null,
                  position: snapshot.position || 0,
                  previous_position: null,
                  position_change: null,
                  url: snapshot.page,
                  search_volume: snapshot.impressions,
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
      } catch (error) {
        throw new ValidationError('Failed to sync GSC data');
      }
    }
  );

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
