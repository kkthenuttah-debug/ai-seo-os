import { google, searchconsole_v1 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { env } from '../lib/config.js';
import { logger } from '../lib/logger.js';
import { supabaseAdmin } from '../lib/supabase.js';
import { encryptValue } from '../utils/crypto.js';
import { scheduleMonitorJob } from '../queues/index.js';
import { IntegrationRecoveryService } from './integrationRecovery.js';
import type {
  SearchAnalyticsOptions,
  SearchAnalyticsData,
  SearchAnalyticsRow,
  Page,
  QueryData,
  PageData,
} from '../types/gsc.js';

const log = logger.child({ service: 'gsc' });
const recovery = new IntegrationRecoveryService({ service: 'gsc' });

interface GSCCredentials {
  access_token: string;
  refresh_token: string;
  token_expiry: string;
  site_url: string;
}

interface GSCQueryResult {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface GSCPageResult {
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface GSCPerformanceData {
  startDate: string;
  endDate: string;
  totalClicks: number;
  totalImpressions: number;
  averageCtr: number;
  averagePosition: number;
  queries: GSCQueryResult[];
  pages: GSCPageResult[];
}

const SEARCH_TYPES: NonNullable<SearchAnalyticsOptions['searchType']>[] = [
  'web',
  'image',
  'video',
  'discover',
  'news',
];

/** Search types that the Search Analytics API accepts without "invalid argument" for our dimensions. */
const SEARCH_TYPES_FOR_SNAPSHOT: NonNullable<SearchAnalyticsOptions['searchType']>[] = [
  'web',
  'image',
  'video',
];

export class GoogleSearchConsoleService {
  private oauth2Client: OAuth2Client;
  private searchConsole: searchconsole_v1.Searchconsole;
  private credentials: GSCCredentials;
  private integrationId: string;

  constructor(credentials: GSCCredentials, integrationId: string) {
    this.credentials = credentials;
    this.integrationId = integrationId;

    this.oauth2Client = new OAuth2Client(
      env.GOOGLE_CLIENT_ID,
      env.GOOGLE_CLIENT_SECRET,
      env.GOOGLE_REDIRECT_URI
    );

    this.oauth2Client.setCredentials({
      access_token: credentials.access_token,
      refresh_token: credentials.refresh_token,
      expiry_date: new Date(credentials.token_expiry).getTime(),
    });

    this.oauth2Client.on('tokens', async (tokens) => {
      if (tokens.access_token) {
        await this.saveUpdatedTokens(tokens);
      }
    });

    this.searchConsole = google.searchconsole({
      version: 'v1',
      auth: this.oauth2Client,
    });
  }

  private async saveUpdatedTokens(tokens: { access_token?: string | null; refresh_token?: string | null; expiry_date?: number | null }) {
    try {
      const updates: Record<string, string> = {};
      if (tokens.access_token) updates.access_token_encrypted = encryptValue(tokens.access_token);
      if (tokens.refresh_token) updates.refresh_token_encrypted = encryptValue(tokens.refresh_token);
      if (tokens.expiry_date) updates.expires_at = new Date(tokens.expiry_date).toISOString();

      if (Object.keys(updates).length === 0) return;

      if (tokens.access_token) this.credentials.access_token = tokens.access_token;
      if (tokens.refresh_token) this.credentials.refresh_token = tokens.refresh_token;
      if (tokens.expiry_date) this.credentials.token_expiry = new Date(tokens.expiry_date).toISOString();

      await supabaseAdmin
        .from('integrations')
        .update(updates)
        .eq('id', this.integrationId);

      log.info('GSC tokens refreshed and saved');
    } catch (error) {
      log.error({ error }, 'Failed to save refreshed GSC tokens');
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.searchConsole.sites.list();
      log.info('GSC connection successful');
      return true;
    } catch (error) {
      log.error({ error }, 'GSC connection failed');
      return false;
    }
  }

  async getSearchAnalytics(options: SearchAnalyticsOptions): Promise<SearchAnalyticsData> {
    const response = await recovery.executeWithRetry(() =>
      this.searchConsole.searchanalytics.query({
        siteUrl: this.credentials.site_url,
        requestBody: {
          startDate: options.startDate,
          endDate: options.endDate,
          dimensions: options.dimensions ?? ['query', 'page'],
          dimensionFilterGroups: options.filters?.length
            ? [
                {
                  filters: options.filters.map(filter => ({
                    dimension: filter.dimension,
                    operator: filter.operator,
                    expression: filter.expression,
                  })),
                },
              ]
            : undefined,
          rowLimit: options.rowLimit ?? 1000,
          searchType: options.searchType ?? 'web',
        },
      })
    );

    const rows: SearchAnalyticsRow[] = (response.data.rows || []).map(row => ({
      keys: row.keys || [],
      clicks: row.clicks || 0,
      impressions: row.impressions || 0,
      ctr: row.ctr || 0,
      position: row.position || 0,
    }));

    const totals = this.calculateTotals(rows);

    return {
      startDate: options.startDate,
      endDate: options.endDate,
      rows,
      ...totals,
    };
  }

  async getPerformanceData(
    startDate: string,
    endDate: string,
    dimensions: ('query' | 'page' | 'date')[] = ['query', 'page']
  ): Promise<GSCPerformanceData> {
    log.info({ startDate, endDate, dimensions }, 'Fetching GSC performance data');

    const queryResponse = await recovery.executeWithRetry(() =>
      this.searchConsole.searchanalytics.query({
        siteUrl: this.credentials.site_url,
        requestBody: {
          startDate,
          endDate,
          dimensions: ['query'],
          rowLimit: 1000,
        },
      })
    );

    const pageResponse = await recovery.executeWithRetry(() =>
      this.searchConsole.searchanalytics.query({
        siteUrl: this.credentials.site_url,
        requestBody: {
          startDate,
          endDate,
          dimensions: ['page'],
          rowLimit: 500,
        },
      })
    );

    const queries: GSCQueryResult[] = (queryResponse.data.rows || []).map(row => ({
      query: row.keys?.[0] || '',
      clicks: row.clicks || 0,
      impressions: row.impressions || 0,
      ctr: row.ctr || 0,
      position: row.position || 0,
    }));

    const pages: GSCPageResult[] = (pageResponse.data.rows || []).map(row => ({
      page: row.keys?.[0] || '',
      clicks: row.clicks || 0,
      impressions: row.impressions || 0,
      ctr: row.ctr || 0,
      position: row.position || 0,
    }));

    const totalClicks = queries.reduce((sum, q) => sum + q.clicks, 0);
    const totalImpressions = queries.reduce((sum, q) => sum + q.impressions, 0);
    const averageCtr = totalImpressions > 0 ? totalClicks / totalImpressions : 0;
    const averagePosition = totalImpressions > 0
      ? queries.reduce((sum, q) => sum + q.position * q.impressions, 0) / totalImpressions
      : 0;

    return {
      startDate,
      endDate,
      totalClicks,
      totalImpressions,
      averageCtr,
      averagePosition,
      queries,
      pages,
    };
  }

  async getQueryPerformance(query: string, startDate: string, endDate: string) {
    const response = await recovery.executeWithRetry(() =>
      this.searchConsole.searchanalytics.query({
        siteUrl: this.credentials.site_url,
        requestBody: {
          startDate,
          endDate,
          dimensions: ['query', 'page', 'date'],
          dimensionFilterGroups: [
            {
              filters: [
                {
                  dimension: 'query',
                  operator: 'contains',
                  expression: query,
                },
              ],
            },
          ],
          rowLimit: 100,
        },
      })
    );

    return response.data.rows || [];
  }

  async getPagePerformance(pageUrl: string, startDate: string, endDate: string) {
    const response = await recovery.executeWithRetry(() =>
      this.searchConsole.searchanalytics.query({
        siteUrl: this.credentials.site_url,
        requestBody: {
          startDate,
          endDate,
          dimensions: ['query', 'date'],
          dimensionFilterGroups: [
            {
              filters: [
                {
                  dimension: 'page',
                  operator: 'equals',
                  expression: pageUrl,
                },
              ],
            },
          ],
          rowLimit: 500,
        },
      })
    );

    return response.data.rows || [];
  }

  async getPages(siteUrl: string): Promise<Page[]> {
    const valid = await this.validateSiteUrl(siteUrl);
    if (!valid) {
      throw new Error('Site URL not verified in Search Console');
    }
    const { startDate, endDate } = this.getDefaultDateRange();

    const data = await this.getSearchAnalytics({
      startDate,
      endDate,
      dimensions: ['page'],
      rowLimit: 500,
    });

    return data.rows.map(row => ({
      url: row.keys[0],
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: row.ctr,
      position: row.position,
    }));
  }

  async getQueryData(siteUrl: string, query: string): Promise<QueryData> {
    const valid = await this.validateSiteUrl(siteUrl);
    if (!valid) {
      throw new Error('Site URL not verified in Search Console');
    }
    const { startDate, endDate } = this.getDefaultDateRange();

    const data = await this.getSearchAnalytics({
      startDate,
      endDate,
      dimensions: ['query', 'page', 'device'],
      filters: [
        {
          dimension: 'query',
          operator: 'contains',
          expression: query,
        },
      ],
      rowLimit: 200,
    });

    return {
      query,
      rows: data.rows,
    };
  }

  async getPageData(siteUrl: string, page: string): Promise<PageData> {
    const valid = await this.validateSiteUrl(siteUrl);
    if (!valid) {
      throw new Error('Site URL not verified in Search Console');
    }
    const { startDate, endDate } = this.getDefaultDateRange();

    const data = await this.getSearchAnalytics({
      startDate,
      endDate,
      dimensions: ['query', 'page', 'device'],
      filters: [
        {
          dimension: 'page',
          operator: 'equals',
          expression: page,
        },
      ],
      rowLimit: 200,
    });

    return {
      page,
      rows: data.rows,
    };
  }

  async fetchAndStoreSnapshots(projectId: string): Promise<number> {
    const valid = await this.validateSiteUrl(this.credentials.site_url);
    if (!valid) {
      throw new Error('Site URL not verified in Search Console');
    }

    const { startDate, endDate } = this.getDefaultDateRange();
    const snapshotDate = endDate;

    const aggregateMap = new Map<string, {
      query: string | null;
      page: string | null;
      clicks: number;
      impressions: number;
      positionSum: number;
      devices: Record<string, { clicks: number; impressions: number; positionSum: number }>;
      searchTypes: Record<string, { clicks: number; impressions: number; positionSum: number }>;
    }>();

    for (const searchType of SEARCH_TYPES_FOR_SNAPSHOT) {
      const dimensions: ('query' | 'page' | 'device')[] = ['query', 'page', 'device'];
      let data: SearchAnalyticsData;
      try {
        data = await this.getSearchAnalytics({
          startDate,
          endDate,
          dimensions,
          rowLimit: 1000,
          searchType,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes('invalid argument') || msg.includes('INVALID_ARGUMENT')) {
          log.warn({ searchType, err }, 'Search Analytics API rejected search type, skipping');
          continue;
        }
        throw err;
      }

      data.rows.forEach(row => {
        const keys = row.keys || [];
        const query = keys[0];
        const page = keys[1];
        const device = dimensions.includes('device') ? keys[2] : undefined;
        const key = `${query ?? ''}::${page ?? ''}`;
        const entry = aggregateMap.get(key) ?? {
          query: query || null,
          page: page || null,
          clicks: 0,
          impressions: 0,
          positionSum: 0,
          devices: {},
          searchTypes: {},
        };

        entry.clicks += row.clicks;
        entry.impressions += row.impressions;
        entry.positionSum += row.position * row.impressions;

        const deviceKey = device || 'unknown';
        const deviceEntry = entry.devices[deviceKey] ?? { clicks: 0, impressions: 0, positionSum: 0 };
        deviceEntry.clicks += row.clicks;
        deviceEntry.impressions += row.impressions;
        deviceEntry.positionSum += row.position * row.impressions;
        entry.devices[deviceKey] = deviceEntry;

        const searchEntry = entry.searchTypes[searchType] ?? { clicks: 0, impressions: 0, positionSum: 0 };
        searchEntry.clicks += row.clicks;
        searchEntry.impressions += row.impressions;
        searchEntry.positionSum += row.position * row.impressions;
        entry.searchTypes[searchType] = searchEntry;

        aggregateMap.set(key, entry);
      });
    }

    const aggregatedRows = Array.from(aggregateMap.values()).map(entry => {
      const position = entry.impressions > 0 ? entry.positionSum / entry.impressions : 0;
      const ctr = entry.impressions > 0 ? entry.clicks / entry.impressions : 0;

      const deviceBreakdown = Object.entries(entry.devices).map(([device, metrics]) => ({
        device,
        clicks: metrics.clicks,
        impressions: metrics.impressions,
        ctr: metrics.impressions > 0 ? metrics.clicks / metrics.impressions : 0,
        position: metrics.impressions > 0 ? metrics.positionSum / metrics.impressions : 0,
      }));

      const searchTypeBreakdown = Object.entries(entry.searchTypes).map(([type, metrics]) => ({
        type,
        clicks: metrics.clicks,
        impressions: metrics.impressions,
        ctr: metrics.impressions > 0 ? metrics.clicks / metrics.impressions : 0,
        position: metrics.impressions > 0 ? metrics.positionSum / metrics.impressions : 0,
      }));

      return {
        query: entry.query,
        page: entry.page,
        clicks: entry.clicks,
        impressions: entry.impressions,
        ctr,
        position,
        devices: deviceBreakdown,
        searchTypes: searchTypeBreakdown,
      };
    });

    const totals = this.calculateTotals(aggregatedRows);

    const snapshotRows = aggregatedRows.map(row => ({
      project_id: projectId,
      query: row.query,
      page: row.page,
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: row.ctr,
      position: row.position,
      snapshot_date: snapshotDate,
      total_clicks: totals.totalClicks,
      total_impressions: totals.totalImpressions,
      average_ctr: totals.averageCtr,
      average_position: totals.averagePosition,
      data: {
        devices: row.devices,
        searchTypes: row.searchTypes,
      },
    }));

    snapshotRows.push({
      project_id: projectId,
      query: null,
      page: null,
      clicks: totals.totalClicks,
      impressions: totals.totalImpressions,
      ctr: totals.averageCtr,
      position: totals.averagePosition,
      snapshot_date: snapshotDate,
      total_clicks: totals.totalClicks,
      total_impressions: totals.totalImpressions,
      average_ctr: totals.averageCtr,
      average_position: totals.averagePosition,
      data: { searchType: 'summary' },
    });

    if (snapshotRows.length === 0) {
      return 0;
    }

    await recovery.executeWithRetry(async () => {
      const { error } = await supabaseAdmin
        .from('gsc_snapshots')
        .upsert(snapshotRows, {
          onConflict: 'project_id,query,page,snapshot_date',
        });

      if (error) {
        throw error;
      }
    });

    await supabaseAdmin
      .from('integrations')
      .update({
        last_sync_at: new Date().toISOString(),
        status: 'active',
      })
      .eq('id', this.integrationId);

    await this.detectMajorChanges(projectId, snapshotDate, totals.totalClicks, totals.totalImpressions);

    return snapshotRows.length;
  }

  async validateSiteUrl(siteUrl: string): Promise<boolean> {
    const response = await this.searchConsole.sites.list();
    return (response.data.siteEntry || []).some(site => site.siteUrl === siteUrl && site.permissionLevel !== 'siteUnverifiedUser');
  }

  async submitUrlForIndexing(url: string): Promise<boolean> {
    try {
      const indexing = google.indexing({
        version: 'v3',
        auth: this.oauth2Client,
      });

      await indexing.urlNotifications.publish({
        requestBody: {
          url,
          type: 'URL_UPDATED',
        },
      });

      log.info({ url }, 'URL submitted for indexing');
      return true;
    } catch (error: unknown) {
      const res = error && typeof error === 'object' && 'response' in error
        ? (error as { response?: { status?: number; data?: { error?: { message?: string; errors?: Array<{ reason?: string }> } } } }).response
        : undefined;
      const status = res?.status;
      const message = res?.data?.error?.message ?? (error instanceof Error ? error.message : String(error));
      const reason = res?.data?.error?.errors?.[0]?.reason;
      const isApiNotEnabled =
        status === 403 &&
        (reason === 'accessNotConfigured' ||
          (typeof message === 'string' && (message.includes('has not been used') || message.includes('it is disabled'))));

      if (isApiNotEnabled) {
        log.warn(
          { url },
          'GSC URL indexing skipped: Web Search Indexing API is not enabled for this Google Cloud project. Enable it at https://console.developers.google.com/apis/api/indexing.googleapis.com/overview'
        );
      } else {
        log.error({ url, message }, 'Failed to submit URL for indexing');
      }
      return false;
    }
  }

  async getIndexingStatus(url: string) {
    const response = await this.searchConsole.urlInspection.index.inspect({
      requestBody: {
        inspectionUrl: url,
        siteUrl: this.credentials.site_url,
      },
    });

    return response.data.inspectionResult;
  }

  async refreshAccessToken(refreshToken: string): Promise<string> {
    this.oauth2Client.setCredentials({ refresh_token: refreshToken });
    const { token } = await this.oauth2Client.getAccessToken();
    if (!token) {
      throw new Error('Failed to refresh access token');
    }
    return token;
  }

  private getDefaultDateRange() {
    const end = new Date();
    end.setDate(end.getDate() - 1);
    const endDate = end.toISOString().slice(0, 10);

    const start = new Date(end);
    start.setDate(start.getDate() - 89);
    const startDate = start.toISOString().slice(0, 10);

    return { startDate, endDate };
  }

  private calculateTotals(rows: Array<{ clicks: number; impressions: number; position: number; ctr?: number }>) {
    const totalClicks = rows.reduce((sum, row) => sum + row.clicks, 0);
    const totalImpressions = rows.reduce((sum, row) => sum + row.impressions, 0);
    const averageCtr = totalImpressions > 0 ? totalClicks / totalImpressions : 0;
    const weightedPosition = rows.reduce((sum, row) => sum + row.position * row.impressions, 0);
    const averagePosition = totalImpressions > 0 ? weightedPosition / totalImpressions : 0;

    return { totalClicks, totalImpressions, averageCtr, averagePosition };
  }

  private async detectMajorChanges(projectId: string, snapshotDate: string, totalClicks: number, totalImpressions: number) {
    const previousDate = new Date(snapshotDate);
    previousDate.setDate(previousDate.getDate() - 1);
    const previousDateString = previousDate.toISOString().slice(0, 10);

    const { data: previous } = await supabaseAdmin
      .from('gsc_snapshots')
      .select('total_clicks,total_impressions')
      .eq('project_id', projectId)
      .eq('snapshot_date', previousDateString)
      .is('query', null)
      .is('page', null)
      .maybeSingle();

    if (!previous) return;

    const clicksDrop = previous.total_clicks > 0
      ? (previous.total_clicks - totalClicks) / previous.total_clicks
      : 0;
    const impressionsDrop = previous.total_impressions > 0
      ? (previous.total_impressions - totalImpressions) / previous.total_impressions
      : 0;

    if (clicksDrop > 0.3 || impressionsDrop > 0.3) {
      log.warn({ projectId, clicksDrop, impressionsDrop }, 'Major GSC performance drop detected');
      await scheduleMonitorJob({ project_id: projectId });
    }
  }
}

export function getGSCAuthUrl(projectId: string): string {
  const oauth2Client = new OAuth2Client(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    env.GOOGLE_REDIRECT_URI
  );

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    state: projectId,
    scope: [
      'https://www.googleapis.com/auth/webmasters', // read + add sites (readonly would block add)
      'https://www.googleapis.com/auth/indexing',
    ],
  });
}

export async function exchangeGSCCode(code: string): Promise<{
  access_token: string;
  refresh_token: string;
  expiry_date: number;
}> {
  const oauth2Client = new OAuth2Client(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    env.GOOGLE_REDIRECT_URI
  );

  const { tokens } = await oauth2Client.getToken(code);

  return {
    access_token: tokens.access_token!,
    refresh_token: tokens.refresh_token!,
    expiry_date: tokens.expiry_date!,
  };
}

export async function refreshGSCAccessToken(refreshToken: string) {
  const oauth2Client = new OAuth2Client(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    env.GOOGLE_REDIRECT_URI
  );

  oauth2Client.setCredentials({ refresh_token: refreshToken });
  const { token } = await oauth2Client.getAccessToken();

  if (!token) {
    throw new Error('Failed to refresh access token');
  }

  return token;
}

/** Get the first verified site URL from GSC (for when integration has no site_url set). */
export async function getFirstVerifiedSiteUrl(credentials: {
  access_token: string;
  refresh_token: string;
  token_expiry: string;
}): Promise<string | null> {
  const oauth2Client = new OAuth2Client(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    env.GOOGLE_REDIRECT_URI
  );
  oauth2Client.setCredentials({
    access_token: credentials.access_token,
    refresh_token: credentials.refresh_token,
    expiry_date: new Date(credentials.token_expiry).getTime(),
  });
  const searchConsole = google.searchconsole({ version: 'v1', auth: oauth2Client });
  const response = await searchConsole.sites.list();
  const entry = (response.data.siteEntry || []).find(
    (site) => site.siteUrl && site.permissionLevel !== 'siteUnverifiedUser'
  );
  return entry?.siteUrl ?? null;
}

/** Normalize a GSC site URL to a domain for matching (e.g. https://www.example.com/ -> example.com). */
function siteUrlToDomain(siteUrl: string): string {
  const s = String(siteUrl || '').trim();
  if (s.startsWith('sc-domain:')) {
    return s.slice('sc-domain:'.length).toLowerCase();
  }
  try {
    const u = new URL(s.startsWith('http') ? s : `https://${s}`);
    return u.hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return s.toLowerCase();
  }
}

/** Normalize URL for comparison: trailing slash, lowercase host. */
function normalizeSiteUrlForMatch(url: string): string {
  const s = String(url || '').trim();
  if (s.startsWith('sc-domain:')) return s.toLowerCase();
  try {
    const u = new URL(s.startsWith('http') ? s : `https://${s}`);
    const base = `${u.protocol.toLowerCase()}//${u.hostname.toLowerCase()}${u.pathname === '/' ? '' : u.pathname}`;
    return base.endsWith('/') ? base : `${base}/`;
  } catch {
    return s.toLowerCase();
  }
}

export interface VerifiedSiteMatchResult {
  matchedUrl: string | null;
  verifiedCount: number;
}

/**
 * Return a verified GSC property URL that matches the preferred URL (exact or same domain).
 * Use this so project domain (e.g. example.com) matches a verified property (e.g. https://www.example.com/).
 */
export async function getVerifiedSiteUrlMatchingDomain(credentials: {
  access_token: string;
  refresh_token: string;
  token_expiry: string;
}, preferredSiteUrl: string): Promise<VerifiedSiteMatchResult> {
  const oauth2Client = new OAuth2Client(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    env.GOOGLE_REDIRECT_URI
  );
  oauth2Client.setCredentials({
    access_token: credentials.access_token,
    refresh_token: credentials.refresh_token,
    expiry_date: new Date(credentials.token_expiry).getTime(),
  });
  const searchConsole = google.searchconsole({ version: 'v1', auth: oauth2Client });
  const response = await searchConsole.sites.list();
  const entries = (response.data.siteEntry || []).filter(
    (site) => site.siteUrl && site.permissionLevel !== 'siteUnverifiedUser'
  );
  const preferredNorm = normalizeSiteUrlForMatch(preferredSiteUrl);
  const preferredDomain = siteUrlToDomain(preferredSiteUrl);
  for (const e of entries) {
    const entryUrl = (e.siteUrl || '').trim();
    if (!entryUrl) continue;
    if (normalizeSiteUrlForMatch(entryUrl) === preferredNorm) return { matchedUrl: entryUrl, verifiedCount: entries.length };
    if (siteUrlToDomain(entryUrl) === preferredDomain) return { matchedUrl: entryUrl, verifiedCount: entries.length };
  }
  return { matchedUrl: null, verifiedCount: entries.length };
}

/**
 * Add a site to the user's Search Console account via the API.
 * The site will appear in GSC (possibly unverified) so the user can complete verification there
 * (e.g. DNS, HTML file, or meta tag). Requires the webmasters scope (not just readonly).
 * @returns true if added or already present, false on permission/API error
 */
export async function addSiteToSearchConsole(credentials: {
  access_token: string;
  refresh_token: string;
  token_expiry: string;
}, siteUrl: string): Promise<{ added: boolean; error?: string }> {
  const normalized = siteUrl.trim().endsWith('/') ? siteUrl.trim() : `${siteUrl.trim()}/`;
  if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
    return { added: false, error: 'Site URL must start with http:// or https://' };
  }
  const oauth2Client = new OAuth2Client(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    env.GOOGLE_REDIRECT_URI
  );
  oauth2Client.setCredentials({
    access_token: credentials.access_token,
    refresh_token: credentials.refresh_token,
    expiry_date: new Date(credentials.token_expiry).getTime(),
  });
  const searchConsole = google.searchconsole({ version: 'v1', auth: oauth2Client });
  try {
    await searchConsole.sites.add({ siteUrl: normalized });
    log.info({ siteUrl: normalized }, 'Added site to Search Console via API');
    return { added: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('already exists') || (typeof err === 'object' && err !== null && 'code' in err && (err as { code: number }).code === 409)) {
      return { added: true };
    }
    log.warn({ err, siteUrl: normalized }, 'Could not add site to Search Console (user may need to re-authorize with full scope)');
    return { added: false, error: message };
  }
}

export function createGSCService(credentials: GSCCredentials, integrationId: string) {
  return new GoogleSearchConsoleService(credentials, integrationId);
}
