import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { supabaseAdmin } from '../lib/supabase.js';
import { authenticate, verifyProjectOwnership } from '../middleware/auth.js';

export async function analyticsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);

  app.get(
    '/projects/:projectId/analytics/overview',
    { preHandler: [verifyProjectOwnership] },
    async (request) => {
      const { projectId } = request.params as { projectId: string };

      // Get data from multiple sources
      const [
        { count: totalPages },
        { data: pages },
        { count: totalLeads },
        { data: rankings },
        { count: totalAgentRuns },
        { data: recentAgentRuns },
      ] = await Promise.all([
        supabaseAdmin
          .from('pages')
          .select('*', { count: 'exact', head: true })
          .eq('project_id', projectId),
        supabaseAdmin
          .from('pages')
          .select('*')
          .eq('project_id', projectId),
        supabaseAdmin
          .from('leads')
          .select('*', { count: 'exact', head: true })
          .eq('project_id', projectId),
        supabaseAdmin
          .from('rankings')
          .select('*')
          .eq('project_id', projectId)
          .order('tracked_at', { ascending: false })
          .limit(100),
        supabaseAdmin
          .from('agent_runs')
          .select('*', { count: 'exact', head: true })
          .eq('project_id', projectId),
        supabaseAdmin
          .from('agent_runs')
          .select('*')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

      // Calculate page metrics
      const publishedPages = pages?.filter(p => p.status === 'published').length || 0;
      const draftPages = pages?.filter(p => p.status === 'draft').length || 0;
      const optimizedPages = pages?.filter(p => p.status === 'optimized').length || 0;

      // Calculate ranking metrics
      const top10Rankings = rankings?.filter(r => r.position <= 10).length || 0;
      const avgPosition = rankings && rankings.length > 0
        ? rankings.reduce((sum, r) => sum + r.position, 0) / rankings.length
        : 0;
      const gainingRankings = rankings?.filter(r => r.position_change && r.position_change < 0).length || 0;

      // Calculate agent run metrics
      const failedAgentRuns = recentAgentRuns?.filter(r => r.status === 'failed').length || 0;
      const successRate = totalAgentRuns && totalAgentRuns > 0
        ? ((totalAgentRuns - failedAgentRuns) / totalAgentRuns) * 100
        : 100;

      return {
        pages: {
          total: totalPages || 0,
          published: publishedPages,
          draft: draftPages,
          optimized: optimizedPages,
        },
        leads: {
          total: totalLeads || 0,
        },
        rankings: {
          tracked: rankings?.length || 0,
          top10: top10Rankings,
          avgPosition: Math.round(avgPosition * 10) / 10,
          gaining: gainingRankings,
        },
        agentRuns: {
          total: totalAgentRuns || 0,
          successRate: Math.round(successRate * 100) / 100,
          recent: recentAgentRuns?.map(r => ({
            id: r.id,
            agentType: r.agent_type,
            status: r.status,
            createdAt: r.created_at,
          })) || [],
        },
        lastUpdated: new Date().toISOString(),
      };
    }
  );

  app.get(
    '/projects/:projectId/analytics/traffic',
    { preHandler: [verifyProjectOwnership] },
    async (request) => {
      const { projectId } = request.params as { projectId: string };

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Get GSC snapshots for the last 30 days
      const { data: snapshots, error } = await supabaseAdmin
        .from('gsc_snapshots')
        .select('*')
        .eq('project_id', projectId)
        .gte('snapshot_date', thirtyDaysAgo.toISOString().split('T')[0])
        .order('snapshot_date', { ascending: true });

      if (error) throw error;

      // Group data by date
      const dailyData = groupSnapshotsByDate(snapshots || []);

      // Calculate trends
      const recent7Days = dailyData.slice(-7);
      const previous7Days = dailyData.slice(-14, -7);

      const currentClicks = recent7Days.reduce((sum, d) => sum + d.clicks, 0);
      const previousClicks = previous7Days.reduce((sum, d) => sum + d.clicks, 0);
      const clicksTrend = previousClicks > 0 ? ((currentClicks - previousClicks) / previousClicks) * 100 : 0;

      const currentImpressions = recent7Days.reduce((sum, d) => sum + d.impressions, 0);
      const previousImpressions = previous7Days.reduce((sum, d) => sum + d.impressions, 0);
      const impressionsTrend = previousImpressions > 0 ? ((currentImpressions - previousImpressions) / previousImpressions) * 100 : 0;

      return {
        daily: dailyData,
        summary: {
          totalClicks: dailyData.reduce((sum, d) => sum + d.clicks, 0),
          totalImpressions: dailyData.reduce((sum, d) => sum + d.impressions, 0),
          avgCTR: dailyData.length > 0
            ? dailyData.reduce((sum, d) => sum + d.ctr, 0) / dailyData.length
            : 0,
          avgPosition: dailyData.length > 0
            ? dailyData.reduce((sum, d) => sum + d.position, 0) / dailyData.length
            : 0,
        },
        trends: {
          clicksTrend: Math.round(clicksTrend * 100) / 100,
          impressionsTrend: Math.round(impressionsTrend * 100) / 100,
        },
        period: {
          startDate: thirtyDaysAgo.toISOString().split('T')[0],
          endDate: new Date().toISOString().split('T')[0],
        },
      };
    }
  );

  app.get(
    '/projects/:projectId/analytics/keywords',
    { preHandler: [verifyProjectOwnership] },
    async (request) => {
      const { projectId } = request.params as { projectId: string };

      // Get rankings data
      const { data: rankings, error } = await supabaseAdmin
        .from('rankings')
        .select('*')
        .eq('project_id', projectId)
        .order('position', { ascending: true });

      if (error) throw error;

      // Get GSC snapshots for clicks/impressions
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: snapshots } = await supabaseAdmin
        .from('gsc_snapshots')
        .select('*')
        .eq('project_id', projectId)
        .gte('snapshot_date', thirtyDaysAgo.toISOString().split('T')[0]);

      // Aggregate snapshot data by keyword
      const keywordMetrics = new Map<string, { clicks: number; impressions: number }>();
      for (const snapshot of snapshots || []) {
        if (snapshot.query) {
          const metrics = keywordMetrics.get(snapshot.query) || { clicks: 0, impressions: 0 };
          metrics.clicks += snapshot.clicks;
          metrics.impressions += snapshot.impressions;
          keywordMetrics.set(snapshot.query, metrics);
        }
      }

      // Top keywords by clicks
      const topClicks = (rankings || [])
        .map(r => ({
          ...r,
          clicks: keywordMetrics.get(r.keyword)?.clicks || 0,
        }))
        .filter(r => r.clicks > 0)
        .sort((a, b) => b.clicks - a.clicks)
        .slice(0, 10);

      // Top keywords by impressions
      const topImpressions = (rankings || [])
        .map(r => ({
          ...r,
          impressions: keywordMetrics.get(r.keyword)?.impressions || 0,
        }))
        .filter(r => r.impressions > 0)
        .sort((a, b) => b.impressions - a.impressions)
        .slice(0, 10);

      // Keywords by position bucket
      const positionBuckets = {
        top3: (rankings || []).filter(r => r.position <= 3).length,
        top10: (rankings || []).filter(r => r.position <= 10).length,
        top20: (rankings || []).filter(r => r.position <= 20).length,
        page2plus: (rankings || []).filter(r => r.position > 10).length,
        other: (rankings || []).filter(r => r.position > 20).length,
      };

      // Keyword volume distribution
      const volumeDistribution = {
        high: (rankings || []).filter(r => r.search_volume && r.search_volume >= 1000).length,
        medium: (rankings || []).filter(r => r.search_volume && r.search_volume >= 100 && r.search_volume < 1000).length,
        low: (rankings || []).filter(r => r.search_volume && r.search_volume < 100).length,
        unknown: (rankings || []).filter(r => !r.search_volume).length,
      };

      return {
        topClicks: topClicks.map(r => ({
          keyword: r.keyword,
          position: r.position,
          clicks: r.clicks,
          url: r.url,
        })),
        topImpressions: topImpressions.map(r => ({
          keyword: r.keyword,
          position: r.position,
          impressions: r.impressions,
          url: r.url,
        })),
        positionBuckets,
        volumeDistribution,
        totalKeywords: rankings?.length || 0,
      };
    }
  );

  app.get(
    '/projects/:projectId/analytics/pages',
    { preHandler: [verifyProjectOwnership] },
    async (request) => {
      const { projectId } = request.params as { projectId: string };

      // Get pages with ranking data
      const { data: pages, error } = await supabaseAdmin
        .from('pages')
        .select('*')
        .eq('project_id', projectId);

      if (error) throw error;

      // Get rankings data
      const { data: rankings } = await supabaseAdmin
        .from('rankings')
        .select('*')
        .eq('project_id', projectId);

      // Get GSC snapshots for clicks/impressions
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: snapshots } = await supabaseAdmin
        .from('gsc_snapshots')
        .select('*')
        .eq('project_id', projectId)
        .gte('snapshot_date', thirtyDaysAgo.toISOString().split('T')[0]);

      // Aggregate snapshot data by page URL
      const pageMetrics = new Map<string, { clicks: number; impressions: number; keywords: Set<string> }>();
      for (const snapshot of snapshots || []) {
        if (snapshot.page) {
          const metrics = pageMetrics.get(snapshot.page) || { clicks: 0, impressions: 0, keywords: new Set() };
          metrics.clicks += snapshot.clicks;
          metrics.impressions += snapshot.impressions;
          if (snapshot.query) metrics.keywords.add(snapshot.query);
          pageMetrics.set(snapshot.page, metrics.keywords);
        }
      }

      // Top pages by clicks
      const topClicks = (pages || [])
        .map(p => ({
          ...p,
          clicks: pageMetrics.get(`/${p.slug}`)?.clicks || 0,
          impressions: pageMetrics.get(`/${p.slug}`)?.impressions || 0,
          keywordCount: pageMetrics.get(`/${p.slug}`)?.keywords.size || 0,
        }))
        .filter(p => p.clicks > 0)
        .sort((a, b) => b.clicks - a.clicks)
        .slice(0, 10);

      // Top pages by impressions
      const topImpressions = (pages || [])
        .map(p => ({
          ...p,
          clicks: pageMetrics.get(`/${p.slug}`)?.clicks || 0,
          impressions: pageMetrics.get(`/${p.slug}`)?.impressions || 0,
          keywordCount: pageMetrics.get(`/${p.slug}`)?.keywords.size || 0,
        }))
        .filter(p => p.impressions > 0)
        .sort((a, b) => b.impressions - a.impressions)
        .slice(0, 10);

      // Page-by-keyword matrix
      const pageKeywordMatrix = (pages || []).map(page => {
        const pageRankings = rankings?.filter(r => r.url?.includes(page.slug)) || [];
        return {
          pageId: page.id,
          pageTitle: page.title,
          slug: page.slug,
          keywordCount: pageRankings.length,
          topKeywords: pageRankings
            .sort((a, b) => a.position - b.position)
            .slice(0, 5)
            .map(r => ({
              keyword: r.keyword,
              position: r.position,
              clicks: pageMetrics.get(`/${page.slug}`)?.clicks || 0,
            })),
        };
      });

      return {
        topClicks: topClicks.map(p => ({
          pageId: p.id,
          title: p.title,
          slug: p.slug,
          clicks: p.clicks,
          status: p.status,
        })),
        topImpressions: topImpressions.map(p => ({
          pageId: p.id,
          title: p.title,
          slug: p.slug,
          impressions: p.impressions,
          status: p.status,
        })),
        pageKeywordMatrix,
        totalPages: pages?.length || 0,
        totalPagesWithTraffic: (pages || []).filter(p => 
          (pageMetrics.get(`/${p.slug}`)?.clicks || 0) > 0 ||
          (pageMetrics.get(`/${p.slug}`)?.impressions || 0) > 0
        ).length,
      };
    }
  );
}

function groupSnapshotsByDate(snapshots: any[]): Array<{
  date: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}> {
  const grouped = new Map<string, {
    clicks: number[];
    impressions: number[];
    positions: number[];
  }>();

  for (const snapshot of snapshots) {
    const date = snapshot.snapshot_date;
    if (!grouped.has(date)) {
      grouped.set(date, {
        clicks: [],
        impressions: [],
        positions: [],
      });
    }

    const group = grouped.get(date)!;
    group.clicks.push(snapshot.clicks || 0);
    group.impressions.push(snapshot.impressions || 0);
    if (snapshot.position) group.positions.push(snapshot.position);
  }

  return Array.from(grouped.entries())
    .map(([date, data]) => {
      const totalClicks = data.clicks.reduce((sum, c) => sum + c, 0);
      const totalImpressions = data.impressions.reduce((sum, i) => sum + i, 0);
      const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
      const avgPosition = data.positions.length > 0
        ? data.positions.reduce((sum, p) => sum + p, 0) / data.positions.length
        : 0;

      return {
        date,
        clicks: totalClicks,
        impressions: totalImpressions,
        ctr: Math.round(ctr * 100) / 100,
        position: Math.round(avgPosition * 10) / 10,
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}
