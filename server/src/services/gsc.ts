import { google, searchconsole_v1 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { env } from '../lib/config.js';
import { logger } from '../lib/logger.js';
import { supabaseAdmin } from '../lib/supabase.js';

const log = logger.child({ service: 'gsc' });

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

    // Set up token refresh handler
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
      const updates: Partial<GSCCredentials> = {};
      if (tokens.access_token) updates.access_token = tokens.access_token;
      if (tokens.refresh_token) updates.refresh_token = tokens.refresh_token;
      if (tokens.expiry_date) updates.token_expiry = new Date(tokens.expiry_date).toISOString();

      await supabaseAdmin
        .from('integrations')
        .update({
          credentials: {
            ...this.credentials,
            gsc: { ...this.credentials, ...updates },
          },
        })
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

  async listSites(): Promise<string[]> {
    const response = await this.searchConsole.sites.list();
    return (response.data.siteEntry || [])
      .filter(site => site.permissionLevel !== 'siteUnverifiedUser')
      .map(site => site.siteUrl!)
      .filter(Boolean);
  }

  async getPerformanceData(
    startDate: string,
    endDate: string,
    dimensions: ('query' | 'page' | 'date')[] = ['query', 'page']
  ): Promise<GSCPerformanceData> {
    log.info({ startDate, endDate, dimensions }, 'Fetching GSC performance data');

    // Fetch query data
    const queryResponse = await this.searchConsole.searchanalytics.query({
      siteUrl: this.credentials.site_url,
      requestBody: {
        startDate,
        endDate,
        dimensions: ['query'],
        rowLimit: 1000,
      },
    });

    // Fetch page data
    const pageResponse = await this.searchConsole.searchanalytics.query({
      siteUrl: this.credentials.site_url,
      requestBody: {
        startDate,
        endDate,
        dimensions: ['page'],
        rowLimit: 500,
      },
    });

    const queries: GSCQueryResult[] = (queryResponse.data.rows || []).map(row => ({
      query: row.keys![0],
      clicks: row.clicks || 0,
      impressions: row.impressions || 0,
      ctr: row.ctr || 0,
      position: row.position || 0,
    }));

    const pages: GSCPageResult[] = (pageResponse.data.rows || []).map(row => ({
      page: row.keys![0],
      clicks: row.clicks || 0,
      impressions: row.impressions || 0,
      ctr: row.ctr || 0,
      position: row.position || 0,
    }));

    // Calculate totals
    const totalClicks = queries.reduce((sum, q) => sum + q.clicks, 0);
    const totalImpressions = queries.reduce((sum, q) => sum + q.impressions, 0);
    const averageCtr = totalImpressions > 0 ? totalClicks / totalImpressions : 0;
    const averagePosition = queries.length > 0
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
    const response = await this.searchConsole.searchanalytics.query({
      siteUrl: this.credentials.site_url,
      requestBody: {
        startDate,
        endDate,
        dimensions: ['query', 'page', 'date'],
        dimensionFilterGroups: [{
          filters: [{
            dimension: 'query',
            operator: 'contains',
            expression: query,
          }],
        }],
        rowLimit: 100,
      },
    });

    return response.data.rows || [];
  }

  async getPagePerformance(pageUrl: string, startDate: string, endDate: string) {
    const response = await this.searchConsole.searchanalytics.query({
      siteUrl: this.credentials.site_url,
      requestBody: {
        startDate,
        endDate,
        dimensions: ['query', 'date'],
        dimensionFilterGroups: [{
          filters: [{
            dimension: 'page',
            operator: 'equals',
            expression: pageUrl,
          }],
        }],
        rowLimit: 500,
      },
    });

    return response.data.rows || [];
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
    } catch (error) {
      log.error({ error, url }, 'Failed to submit URL for indexing');
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
}

// OAuth flow helpers
export function getGSCAuthUrl(): string {
  const oauth2Client = new OAuth2Client(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    env.GOOGLE_REDIRECT_URI
  );

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/webmasters.readonly',
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

export function createGSCService(credentials: GSCCredentials, integrationId: string) {
  return new GoogleSearchConsoleService(credentials, integrationId);
}
