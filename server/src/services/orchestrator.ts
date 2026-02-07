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
} from '../queues/index.js';
import { decryptValue } from '../utils/crypto.js';
import { env } from '../lib/config.js';
import type { Project, MarketResearchOutput, SiteArchitectOutput } from '../types/index.js';
import type {
  Integration as DatabaseIntegration,
  Page,
  PageInsert,
} from '../types/database.js';

const log = logger.child({ service: 'orchestrator' });

/** Returns true if the character at index in html is inside an <a> tag */
function isInsideLink(html: string, index: number): boolean {
  const before = html.slice(0, index);
  const lastOpen = before.lastIndexOf('<a ');
  const lastClose = before.lastIndexOf('</a>');
  return lastOpen > lastClose;
}

/**
 * Inserts internal links into HTML content using linker suggestions.
 * Each anchor text is replaced with <a href="targetUrl">anchor</a> at its first occurrence
 * when not already inside a link. Anchor must appear exactly in content (linker prompt enforces verbatim phrases).
 */
function applyInternalLinksToContent(
  content: string,
  suggestions: Array<{ anchor: string; targetUrl: string }>
): string {
  if (!content || !suggestions.length) return content;
  let out = content;
  for (const s of suggestions) {
    const anchor = s.anchor?.trim();
    if (!anchor) continue;
    const idx = out.indexOf(anchor);
    if (idx === -1 || isInsideLink(out, idx)) continue;
    const href = s.targetUrl.replace(/"/g, '&quot;');
    const link = `<a href="${href}">${anchor}</a>`;
    out = out.slice(0, idx) + link + out.slice(idx + anchor.length);
  }
  return out;
}

export class AgentOrchestrator {
  private projectId: string;
  private project: Project | null = null;
  private integrations: DatabaseIntegration[] = [];

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
      } as never)
      .eq('id', this.projectId);

    log.info({ projectId: this.projectId, keywords: result.keyword_opportunities.length }, 'Market research completed');

    // Schedule next phase
    await scheduleBuildJob({ type: 'build', project_id: this.projectId, phase: 'architecture' }, { delay: 5000 });

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

    // Homepage: content type "page" (static landing)
    pages.push({
      project_id: this.projectId,
      title: result.site_structure.homepage.title,
      slug: 'home',
      content: null,
      content_type: 'page',
      meta_title: null,
      meta_description: result.site_structure.homepage.meta_description,
      meta_keywords: null,
      elementor_data: {},
      internal_links: [],
      status: 'draft',
      publish_status: 'pending',
      wordpress_post_id: null,
      published_at: null,
    });

    // Category pages: use content_type from site architect (post, page, media)
    for (const category of result.site_structure.categories) {
      for (const page of category.pages) {
        const contentType = (page.content_type && ['post', 'page', 'media'].includes(page.content_type.toLowerCase()))
          ? page.content_type.toLowerCase()
          : 'post';
        pages.push({
          project_id: this.projectId,
          title: page.title,
          slug: page.slug,
          content: null,
          content_type: contentType,
          meta_title: null,
          meta_description: null,
          meta_keywords: null,
          elementor_data: {},
          internal_links: [],
          status: 'draft',
          publish_status: 'pending',
          wordpress_post_id: null,
          published_at: null,
        });
      }
    }

    // Insert pages (Supabase client types can be strict; cast to satisfy)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await supabaseAdmin.from('pages').insert(pages as never);

    // Update project with architecture
    await supabaseAdmin
      .from('projects')
      .update({
        settings: {
          ...this.project.settings,
          site_architecture: result,
        },
        status: 'building',
      } as never)
      .eq('id', this.projectId);

    log.info({ projectId: this.projectId, pageCount: pages.length }, 'Site architecture completed');

    // Schedule content building for each page
    await scheduleBuildJob({ type: 'build', project_id: this.projectId, phase: 'content' }, { delay: 10000 });

    return result;
  }

  // Phase 3: Build page (Elementor → Content → Internal Linker per spec)
  async buildPageContent(pageId: string) {
    if (!this.project) throw new Error('Orchestrator not initialized');

    const { data } = await supabaseAdmin
      .from('pages')
      .select('*')
      .eq('id', pageId)
      .single();
    const page: Page | null = data as Page | null;

    if (!page) throw new Error('Page not found');

    log.info({ projectId: this.projectId, pageId, slug: page.slug }, 'Building page (Elementor → Content → Internal Linker)');

    // Fetch all pages first so we can pass internal link targets and generate outline context
    const allPages = await getPagesByProjectId(this.projectId);
    const otherPageSlugs = allPages
      .filter(p => p.id !== pageId)
      .map(p => p.slug === 'home' ? '/' : `/${p.slug}`);

    // Word count by content type: pillar/long-form for posts, solid for pages, shorter for media
    const contentType = page.content_type ?? 'post';
    const wordCountByType: Record<string, number> = {
      post: 2500,
      page: 2000,
      media: 1500,
    };
    const wordCount = wordCountByType[contentType] ?? 2000;

    // Simple outline hints from site structure (intro, main sections, FAQ, conclusion)
    const outline = [
      'Introduction that hooks the reader and states what they will learn',
      '3–5 main sections (H2) with subsections (H3) covering the topic in depth',
      'FAQ section with 4–6 common questions and concise answers',
      'Conclusion with key takeaways and clear next step or CTA',
    ];

    // Lead capture: so forms/CTAs on the page POST to our webhook and show in Leads UI
    const baseUrl = (this.project?.domain ?? '').replace(/\/$/, '');
    const pagePath = page.slug === 'home' ? '/' : `/${page.slug}`;
    const sourceUrl = baseUrl && baseUrl.startsWith('http') ? `${baseUrl}${pagePath}` : pagePath;
    const leadCapture = env.API_URL
      ? {
          webhookUrl: `${env.API_URL.replace(/\/+$/, '')}/api/webhooks/leads`,
          projectId: this.projectId,
          pageId,
          sourceUrl,
        }
      : undefined;

    const result = await pageBuilderAgent.run(this.projectId, {
      title: page.title,
      slug: page.slug,
      targetKeyword: page.title,
      contentType,
      tone: this.project.settings?.content_tone ?? 'professional',
      wordCount,
      outline: otherPageSlugs.length > 0 ? outline : undefined,
      internalLinkSlugs: otherPageSlugs,
      leadCapture,
    });
    const existingPages = allPages
      .filter(p => p.id !== pageId)
      .map(p => ({
        title: p.title,
        slug: p.slug,
        url: p.slug === 'home' ? '/' : `/${p.slug}`,
        keywords: [p.title],
      }));

    let internalLinks = Array.isArray(result.internalLinks) ? result.internalLinks : [];
    let finalContent = result.content ?? null;
    if (result.content && existingPages.length > 0) {
      const linkerOutput = await internalLinkerAgent.run(this.projectId, {
        content: result.content,
        existingPages,
        currentPageTitle: page.title,
        currentPageSlug: page.slug,
      });
      internalLinks = linkerOutput.suggestions.map(s => s.targetUrl);
      finalContent = applyInternalLinksToContent(result.content, linkerOutput.suggestions);
      log.info({ projectId: this.projectId, pageId, linkCount: linkerOutput.suggestions.length }, 'Internal links applied to content');
    }

    const primaryKeyword = page.title?.trim() || result.metaTitle?.trim() || null;
    await supabaseAdmin
      .from('pages')
      .update({
        content: finalContent,
        meta_title: result.metaTitle ?? null,
        meta_description: result.metaDescription ?? null,
        meta_keywords: primaryKeyword,
        elementor_data: result.elementorData ?? {},
        internal_links: internalLinks,
        status: 'ready',
        updated_at: new Date().toISOString(),
      } as never)
      .eq('id', pageId);

    log.info({ projectId: this.projectId, pageId }, 'Page built (Elementor → Content → Internal Linker)');
    return { ...result, content: finalContent ?? result.content };
  }

  // Phase 4: Publishing
  async publishPage(pageId: string) {
    if (!this.project) throw new Error('Orchestrator not initialized');

    const wpIntegration = this.integrations.find(i => i.type === 'wordpress');
    if (!wpIntegration?.access_token_encrypted || !wpIntegration.data?.site_url || !wpIntegration.data?.username) {
      throw new Error('WordPress not connected');
    }

    const { data: pageData } = await supabaseAdmin
      .from('pages')
      .select('*')
      .eq('id', pageId)
      .single();
    const page: Page | null = pageData as Page | null;

    if (!page) throw new Error('Page not found');

    log.info({ projectId: this.projectId, pageId, slug: page.slug }, 'Publishing page to WordPress');

    // Run publisher agent for final checks
    const publisherResult = await publisherAgent.run(this.projectId, {
      projectId: this.projectId,
      pageId,
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
    const wp = createWordPressService({
      site_url: wpIntegration.data.site_url as string,
      username: wpIntegration.data.username as string,
      application_password: decryptValue(wpIntegration.access_token_encrypted),
    });

    const focusKeyword = (page.meta_keywords ?? page.title ?? page.meta_title ?? '').toString().trim() || page.title;
    // Homepage or content_type "page" → WordPress page; "post" / "media" → WordPress post
    const postType = page.slug === 'home' || page.content_type === 'page' ? 'page' : 'post';
    const wpPage = await wp.withRetry(() =>
      wp.createPost({
        title: page.title,
        slug: page.slug,
        content: page.content ?? '',
        status: 'published',
        postType,
        meta: {
          metaTitle: publisherResult.final_meta_title ?? page.meta_title ?? page.title,
          metaDescription: publisherResult.final_meta_description ?? page.meta_description ?? '',
          metaKeywords: page.meta_keywords ?? '',
          focusKeyword: focusKeyword || undefined,
        },
        elementorData: page.elementor_data,
      })
    );

    await supabaseAdmin
      .from('pages')
      .update({
        wordpress_post_id: wpPage.id,
        publish_status: 'published',
        published_at: new Date().toISOString(),
        status: 'published',
        updated_at: new Date().toISOString(),
      } as never)
      .eq('id', pageId);

    log.info({ projectId: this.projectId, pageId, wpId: wpPage.id }, 'Page published successfully');

    // GSC URL submission (indexing)
    const gscIntegration = this.integrations.find(i => i.type === 'gsc');
    if (gscIntegration?.access_token_encrypted && gscIntegration.refresh_token_encrypted && gscIntegration.data?.site_url) {
      try {
        const gsc = createGSCService(
          {
            access_token: decryptValue(gscIntegration.access_token_encrypted),
            refresh_token: decryptValue(gscIntegration.refresh_token_encrypted),
            token_expiry: gscIntegration.expires_at ?? new Date().toISOString(),
            site_url: gscIntegration.data.site_url as string,
          },
          gscIntegration.id
        );
        if (wpPage.link) {
          await gsc.submitUrlForIndexing(wpPage.link as string);
        }
      } catch (error) {
        log.warn({ error }, 'Failed to submit URL for indexing');
      }
    }

    return wpPage;
  }

  // Indexing: sitemap ping + notify search engines (per spec)
  async runIndexing(_url?: string) {
    if (!this.project) throw new Error('Orchestrator not initialized');

    const baseUrl = this.project.domain?.replace(/\/+$/, '') || '';
    if (!baseUrl) {
      log.warn({ projectId: this.projectId }, 'No domain for indexing');
      return;
    }

    log.info({ projectId: this.projectId }, 'Running indexing (sitemap ping)');

    const sitemapUrl = `${baseUrl}/sitemap.xml`;
    try {
      await fetch(sitemapUrl, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
      log.info({ projectId: this.projectId, sitemapUrl }, 'Sitemap ping OK');
    } catch (err) {
      log.warn({ projectId: this.projectId, sitemapUrl, err }, 'Sitemap ping failed (non-fatal)');
    }

    const pingUrls = [
      `https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`,
      `https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`,
    ];
    for (const url of pingUrls) {
      try {
        await fetch(url, { method: 'GET', signal: AbortSignal.timeout(5000) });
        log.debug({ projectId: this.projectId, url }, 'Sitemap ping sent');
      } catch {
        // Non-fatal
      }
    }
  }

  // Phase 5: Monitoring
  async runMonitoring() {
    if (!this.project) throw new Error('Orchestrator not initialized');

    const gscIntegration = this.integrations.find(i => i.type === 'gsc');
    if (!gscIntegration?.access_token_encrypted || !gscIntegration.refresh_token_encrypted || !gscIntegration.data?.site_url) {
      log.warn({ projectId: this.projectId }, 'GSC not connected, skipping monitoring');
      return null;
    }

    log.info({ projectId: this.projectId }, 'Running monitoring phase');

    const gsc = createGSCService(
      {
        access_token: decryptValue(gscIntegration.access_token_encrypted),
        refresh_token: decryptValue(gscIntegration.refresh_token_encrypted),
        token_expiry: gscIntegration.expires_at ?? new Date().toISOString(),
        site_url: gscIntegration.data.site_url as string,
      },
      gscIntegration.id
    );

    await gsc.fetchAndStoreSnapshots(this.projectId);

    // Get existing snapshots for trend analysis
    const { data: snapshots } = await supabaseAdmin
      .from('gsc_snapshots')
      .select('*')
      .eq('project_id', this.projectId)
      .is('query', null)
      .is('page', null)
      .order('snapshot_date', { ascending: false })
      .limit(14);

    const pages = await getPagesByProjectId(this.projectId);

    // Get recent rankings
    const { data: rankings } = await supabaseAdmin
      .from('rankings')
      .select('*')
      .eq('project_id', this.projectId)
      .order('date', { ascending: false })
      .limit(50);

    const baseUrl = (this.project?.domain ?? '').replace(/\/$/, '');
    // Run monitor agent (expects projectId, gscSnapshots, pages with pageId/url/targetKeyword)
    const result = await monitorAgent.run(this.projectId, {
      projectId: this.projectId,
      gscSnapshots: (snapshots || []).map((s: { snapshot_date: string; total_clicks: number; total_impressions: number; average_ctr: number; average_position: number }) => ({
        date: s.snapshot_date,
        totalClicks: s.total_clicks,
        totalImpressions: s.total_impressions,
        averageCtr: s.average_ctr,
        averagePosition: s.average_position,
      })),
      pages: pages.map((p: Page) => ({
        pageId: p.id,
        url: baseUrl ? `${baseUrl}${p.slug === 'home' ? '' : `/${p.slug}`}` : `/${p.slug}`,
        targetKeyword: (p.meta_keywords ?? p.title ?? '').toString().trim() || p.title,
      })),
    });

    // Schedule optimizations for candidates
    const candidates = result.optimization_candidates ?? [];
    for (const candidate of candidates.filter((c: { priority: string }) => c.priority === 'high')) {
      const page = pages.find(p => p.slug === candidate.page_slug);
      if (page) {
        await scheduleOptimizeJob({
          type: 'optimize',
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

    const gscIntegration = this.integrations.find(i => i.type === 'gsc');
    if (!gscIntegration?.access_token_encrypted || !gscIntegration.refresh_token_encrypted || !gscIntegration.data?.site_url) {
      throw new Error('GSC not connected');
    }

    const { data: pageData } = await supabaseAdmin
      .from('pages')
      .select('*')
      .eq('id', pageId)
      .single();
    const page: Page | null = pageData as Page | null;

    if (!page) throw new Error('Page not found');

    log.info({ projectId: this.projectId, pageId, slug: page.slug }, 'Optimizing page');

    const gsc = createGSCService(
      {
        access_token: decryptValue(gscIntegration.access_token_encrypted),
        refresh_token: decryptValue(gscIntegration.refresh_token_encrypted),
        token_expiry: gscIntegration.expires_at ?? new Date().toISOString(),
        site_url: gscIntegration.data.site_url as string,
      },
      gscIntegration.id
    );

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
      current_content: page.content ?? '',
    });

    // Apply high-priority updates
    if (result.updated_content || result.updated_meta_title || result.updated_meta_description) {
      const updates: Record<string, unknown> = {
        status: 'optimizing',
        updated_at: new Date().toISOString(),
      };
      if (result.updated_content) updates.content = result.updated_content;
      if (result.updated_meta_title) updates.meta_title = result.updated_meta_title;
      if (result.updated_meta_description) updates.meta_description = result.updated_meta_description;

      await supabaseAdmin.from('pages').update(updates as never).eq('id', pageId);

      // Republish to WordPress (use wordpress_post_id from DB)
      const wpPostId = page.wordpress_post_id;
      if (wpPostId) {
        const wpIntegration = this.integrations.find(i => i.type === 'wordpress');
        if (wpIntegration?.access_token_encrypted && wpIntegration.data?.site_url && wpIntegration.data?.username) {
          const wp = createWordPressService({
            site_url: wpIntegration.data.site_url as string,
            username: wpIntegration.data.username as string,
            application_password: decryptValue(wpIntegration.access_token_encrypted),
          });
          const postType = page.slug === 'home' || page.content_type === 'page' ? 'page' : 'post';
          await wp.updatePage(wpPostId, {
            content: result.updated_content ?? page.content ?? undefined,
            meta_title: result.updated_meta_title ?? undefined,
            meta_description: result.updated_meta_description ?? undefined,
          }, postType);
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
    await scheduleMonitorJob({ type: 'monitor', project_id: this.projectId });

    log.info({ projectId: this.projectId, pagesBuilt: pages.length }, 'Full automation loop completed');
  }
}

export function createOrchestrator(projectId: string) {
  return new AgentOrchestrator(projectId);
}
