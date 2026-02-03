import { supabaseAdmin, getProjectById, getIntegrationsByProjectId, getPagesByProjectId } from '../lib/supabase.js';
import { logger } from '../lib/logger.js';
import {
  marketResearchAgent,
  siteArchitectAgent,
  contentBuilderAgent,
  internalLinkerAgent,
  pageBuilderAgent,
  publisherAgent,
  optimizerAgent,
  monitorAgent,
  technicalSEOAgent,
} from '../agents/index.js';
import { createWordPressService } from './wordpress.js';
import { createGSCService } from './gsc.js';
import {
  scheduleBuildJob,
  schedulePublishJob,
  scheduleOptimizeJob,
  scheduleMonitorJob,
} from '../queue/index.js';
import type { Project, Page, Integration, MarketResearchOutput, SiteArchitectOutput } from '../types/index.js';

const log = logger.child({ service: 'orchestrator' });

export class AgentOrchestrator {
  private projectId: string;
  private project: Project | null = null;
  private integrations: Integration[] = [];

  constructor(projectId: string) {
    this.projectId = projectId;
  }

  async initialize() {
    this.project = await getProjectById(this.projectId);
    this.integrations = await getIntegrationsByProjectId(this.projectId);
    return this;
  }

  // Phase 1: Market Research
  async runMarketResearch(): Promise<MarketResearchOutput> {
    if (!this.project) throw new Error('Orchestrator not initialized');

    log.info({ projectId: this.projectId }, 'Starting market research phase');

    const result = await marketResearchAgent.run(this.projectId, {
      niche: this.project.settings.niche,
      target_audience: this.project.settings.target_audience,
    });

    // Store research results
    await supabaseAdmin
      .from('projects')
      .update({
        settings: {
          ...this.project.settings,
          market_research: result,
        },
        status: 'configuring',
      })
      .eq('id', this.projectId);

    log.info({ projectId: this.projectId, keywords: result.keyword_opportunities.length }, 'Market research completed');

    // Schedule next phase
    await scheduleBuildJob({ project_id: this.projectId, phase: 'architecture' }, { delay: 5000 });

    return result;
  }

  // Phase 2: Site Architecture
  async runSiteArchitecture(marketResearch: MarketResearchOutput): Promise<SiteArchitectOutput> {
    if (!this.project) throw new Error('Orchestrator not initialized');

    log.info({ projectId: this.projectId }, 'Starting site architecture phase');

    const result = await siteArchitectAgent.run(this.projectId, {
      niche: this.project.settings.niche,
      target_audience: this.project.settings.target_audience,
      domain: this.project.domain,
      market_research: marketResearch,
    });

    // Create page records from architecture
    const pages: Partial<Page>[] = [];

    // Homepage
    pages.push({
      project_id: this.projectId,
      title: result.site_structure.homepage.title,
      slug: 'home',
      meta_description: result.site_structure.homepage.meta_description,
      status: 'draft',
    });

    // Category pages and content pages
    for (const category of result.site_structure.categories) {
      for (const page of category.pages) {
        pages.push({
          project_id: this.projectId,
          title: page.title,
          slug: page.slug,
          status: 'draft',
        });
      }
    }

    // Insert pages
    await supabaseAdmin.from('pages').insert(pages);

    // Update project with architecture
    await supabaseAdmin
      .from('projects')
      .update({
        settings: {
          ...this.project.settings,
          site_architecture: result,
        },
        status: 'building',
      })
      .eq('id', this.projectId);

    log.info({ projectId: this.projectId, pageCount: pages.length }, 'Site architecture completed');

    // Schedule content building for each page
    await scheduleBuildJob({ project_id: this.projectId, phase: 'content' }, { delay: 10000 });

    return result;
  }

  // Phase 3: Content Building
  async buildPageContent(pageId: string) {
    if (!this.project) throw new Error('Orchestrator not initialized');

    const { data: page } = await supabaseAdmin
      .from('pages')
      .select('*')
      .eq('id', pageId)
      .single();

    if (!page) throw new Error('Page not found');

    log.info({ projectId: this.projectId, pageId, slug: page.slug }, 'Building page content');

    // Get all pages for internal linking
    const allPages = await getPagesByProjectId(this.projectId);
    const internalLinks = allPages
      .filter(p => p.id !== pageId && p.status !== 'draft')
      .map(p => `/${p.slug}`);

    const result = await pageBuilderAgent.run(this.projectId, {
      page_title: page.title,
      page_slug: page.slug,
      target_keyword: page.title, // Use title as fallback keyword
      content_type: 'article',
      niche: this.project.settings.niche,
      tone: this.project.settings.content_tone,
      word_count: 1500,
      include_cta: true,
      include_lead_form: true,
      available_internal_links: internalLinks,
    });

    // Update page with content
    await supabaseAdmin
      .from('pages')
      .update({
        content: result.content_html,
        meta_title: result.meta_title,
        meta_description: result.meta_description,
        elementor_data: result.elementor_data,
        internal_links: result.internal_links,
        status: 'ready',
      })
      .eq('id', pageId);

    log.info({ projectId: this.projectId, pageId, wordCount: result.word_count }, 'Page content built');

    return result;
  }

  // Phase 4: Publishing
  async publishPage(pageId: string) {
    if (!this.project) throw new Error('Orchestrator not initialized');

    const wpIntegration = this.integrations.find(i => i.type === 'wordpress');
    if (!wpIntegration || !wpIntegration.credentials.wordpress) {
      throw new Error('WordPress not connected');
    }

    const { data: page } = await supabaseAdmin
      .from('pages')
      .select('*')
      .eq('id', pageId)
      .single();

    if (!page) throw new Error('Page not found');

    log.info({ projectId: this.projectId, pageId, slug: page.slug }, 'Publishing page to WordPress');

    // Run publisher agent for final checks
    const publisherResult = await publisherAgent.run(this.projectId, {
      page_title: page.title,
      page_slug: page.slug,
      content_html: page.content,
      meta_title: page.meta_title,
      meta_description: page.meta_description,
      target_keyword: page.title,
    });

    if (!publisherResult.publish_ready) {
      log.warn({ pageId, checklist: publisherResult.seo_checklist }, 'Page not ready to publish');
      throw new Error('Page failed SEO checks');
    }

    // Publish to WordPress
    const wp = createWordPressService(wpIntegration.credentials.wordpress);

    const wpPage = await wp.withRetry(() =>
      wp.createPage({
        title: page.title,
        slug: page.slug,
        content: page.content,
        status: 'publish',
        meta_title: publisherResult.final_meta_title,
        meta_description: publisherResult.final_meta_description,
        elementor_data: page.elementor_data,
      })
    );

    // Update page record
    await supabaseAdmin
      .from('pages')
      .update({
        wordpress_id: wpPage.id,
        status: 'published',
        published_at: new Date().toISOString(),
      })
      .eq('id', pageId);

    log.info({ projectId: this.projectId, pageId, wpId: wpPage.id }, 'Page published successfully');

    // Try to submit for indexing
    const gscIntegration = this.integrations.find(i => i.type === 'google_search_console');
    if (gscIntegration?.credentials.gsc) {
      try {
        const gsc = createGSCService(gscIntegration.credentials.gsc, gscIntegration.id);
        await gsc.submitUrlForIndexing(wpPage.link);
      } catch (error) {
        log.warn({ error }, 'Failed to submit URL for indexing');
      }
    }

    return wpPage;
  }

  // Phase 5: Monitoring
  async runMonitoring() {
    if (!this.project) throw new Error('Orchestrator not initialized');

    const gscIntegration = this.integrations.find(i => i.type === 'google_search_console');
    if (!gscIntegration?.credentials.gsc) {
      log.warn({ projectId: this.projectId }, 'GSC not connected, skipping monitoring');
      return null;
    }

    log.info({ projectId: this.projectId }, 'Running monitoring phase');

    const gsc = createGSCService(gscIntegration.credentials.gsc, gscIntegration.id);

    // Get last 28 days of data
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const performanceData = await gsc.getPerformanceData(startDate, endDate);

    // Store snapshot
    await supabaseAdmin.from('gsc_snapshots').insert({
      project_id: this.projectId,
      date: endDate,
      total_clicks: performanceData.totalClicks,
      total_impressions: performanceData.totalImpressions,
      average_ctr: performanceData.averageCtr,
      average_position: performanceData.averagePosition,
      data: {
        queries: performanceData.queries,
        pages: performanceData.pages,
      },
    });

    // Get existing snapshots for trend analysis
    const { data: snapshots } = await supabaseAdmin
      .from('gsc_snapshots')
      .select('*')
      .eq('project_id', this.projectId)
      .order('date', { ascending: false })
      .limit(14);

    const pages = await getPagesByProjectId(this.projectId);

    // Get recent rankings
    const { data: rankings } = await supabaseAdmin
      .from('rankings')
      .select('*')
      .eq('project_id', this.projectId)
      .order('date', { ascending: false })
      .limit(50);

    // Run monitor agent
    const result = await monitorAgent.run(this.projectId, {
      project_id: this.projectId,
      gsc_snapshots: (snapshots || []).map(s => ({
        date: s.date,
        total_clicks: s.total_clicks,
        total_impressions: s.total_impressions,
        average_ctr: s.average_ctr,
        average_position: s.average_position,
      })),
      pages: pages.map(p => ({
        slug: p.slug,
        title: p.title,
        status: p.status,
        published_at: p.published_at,
      })),
      recent_rankings: (rankings || []).map(r => ({
        keyword: r.keyword,
        position: r.position,
        previous_position: r.previous_position,
        url: r.url,
      })),
    });

    // Schedule optimizations for candidates
    for (const candidate of result.optimization_candidates.filter(c => c.priority === 'high')) {
      const page = pages.find(p => p.slug === candidate.page_slug);
      if (page) {
        await scheduleOptimizeJob({
          project_id: this.projectId,
          page_id: page.id,
          reason: 'performance_drop',
        });
      }
    }

    log.info({ projectId: this.projectId, healthScore: result.health_score }, 'Monitoring completed');

    return result;
  }

  // Phase 6: Optimization
  async optimizePage(pageId: string) {
    if (!this.project) throw new Error('Orchestrator not initialized');

    const gscIntegration = this.integrations.find(i => i.type === 'google_search_console');
    if (!gscIntegration?.credentials.gsc) {
      throw new Error('GSC not connected');
    }

    const { data: page } = await supabaseAdmin
      .from('pages')
      .select('*')
      .eq('id', pageId)
      .single();

    if (!page) throw new Error('Page not found');

    log.info({ projectId: this.projectId, pageId, slug: page.slug }, 'Optimizing page');

    const gsc = createGSCService(gscIntegration.credentials.gsc, gscIntegration.id);

    // Get page-specific GSC data
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const pageUrl = `${this.project.domain}/${page.slug}`;

    const gscData = await gsc.getPagePerformance(pageUrl, startDate, endDate);

    const queryData = gscData.map(row => ({
      query: row.keys![0],
      clicks: row.clicks || 0,
      impressions: row.impressions || 0,
      ctr: row.ctr || 0,
      position: row.position || 0,
    }));

    // Run optimizer agent
    const result = await optimizerAgent.run(this.projectId, {
      project_id: this.projectId,
      page_id: pageId,
      gsc_data: queryData,
      current_content: page.content,
    });

    // Apply high-priority updates
    if (result.updated_content || result.updated_meta_title || result.updated_meta_description) {
      const updates: Partial<Page> = { status: 'optimizing' };

      if (result.updated_content) updates.content = result.updated_content;
      if (result.updated_meta_title) updates.meta_title = result.updated_meta_title;
      if (result.updated_meta_description) updates.meta_description = result.updated_meta_description;

      await supabaseAdmin.from('pages').update(updates).eq('id', pageId);

      // Republish to WordPress
      if (page.wordpress_id) {
        const wpIntegration = this.integrations.find(i => i.type === 'wordpress');
        if (wpIntegration?.credentials.wordpress) {
          const wp = createWordPressService(wpIntegration.credentials.wordpress);
          await wp.updatePage(page.wordpress_id, {
            content: result.updated_content || page.content,
            meta_title: result.updated_meta_title,
            meta_description: result.updated_meta_description,
          });
        }
      }
    }

    log.info({ projectId: this.projectId, pageId, recommendations: result.recommendations.length }, 'Page optimization completed');

    return result;
  }

  // Run complete automation loop
  async runFullAutomation() {
    log.info({ projectId: this.projectId }, 'Starting full automation loop');

    // Phase 1: Research
    const research = await this.runMarketResearch();

    // Phase 2: Architecture
    const architecture = await this.runSiteArchitecture(research);

    // Build and publish all pages
    const pages = await getPagesByProjectId(this.projectId);

    for (const page of pages) {
      // Build content
      await this.buildPageContent(page.id);

      // Publish
      await this.publishPage(page.id);
    }

    // Schedule recurring monitoring
    await scheduleMonitorJob({ project_id: this.projectId });

    log.info({ projectId: this.projectId, pagesBuilt: pages.length }, 'Full automation loop completed');
  }
}

export function createOrchestrator(projectId: string) {
  return new AgentOrchestrator(projectId);
}
