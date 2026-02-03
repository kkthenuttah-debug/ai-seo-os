import { logger } from '../lib/logger.js';

interface WordPressCredentials {
  site_url: string;
  username: string;
  application_password: string;
}

interface CreatePageRequest {
  title: string;
  slug: string;
  content: string;
  status: 'draft' | 'publish' | 'pending';
  meta_title?: string;
  meta_description?: string;
  elementor_data?: object;
}

interface WordPressPage {
  id: number;
  slug: string;
  link: string;
  status: string;
  title: { rendered: string };
  content: { rendered: string };
}

export class WordPressService {
  private credentials: WordPressCredentials;
  private baseUrl: string;
  private authHeader: string;
  private log = logger.child({ service: 'wordpress' });

  constructor(credentials: WordPressCredentials) {
    this.credentials = credentials;
    this.baseUrl = credentials.site_url.replace(/\/$/, '');
    this.authHeader = `Basic ${Buffer.from(`${credentials.username}:${credentials.application_password}`).toString('base64')}`;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}/wp-json/wp/v2${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': this.authHeader,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      this.log.error({ url, status: response.status, error }, 'WordPress API error');
      throw new Error(`WordPress API error: ${response.status} - ${error}`);
    }

    return response.json() as Promise<T>;
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.request('/users/me');
      this.log.info('WordPress connection successful');
      return true;
    } catch (error) {
      this.log.error({ error }, 'WordPress connection failed');
      return false;
    }
  }

  async getPages(params?: { per_page?: number; page?: number; status?: string }): Promise<WordPressPage[]> {
    const query = new URLSearchParams();
    if (params?.per_page) query.set('per_page', String(params.per_page));
    if (params?.page) query.set('page', String(params.page));
    if (params?.status) query.set('status', params.status);

    const endpoint = `/pages?${query.toString()}`;
    return this.request<WordPressPage[]>(endpoint);
  }

  async getPageBySlug(slug: string): Promise<WordPressPage | null> {
    const pages = await this.request<WordPressPage[]>(`/pages?slug=${slug}`);
    return pages.length > 0 ? pages[0] : null;
  }

  async createPage(page: CreatePageRequest): Promise<WordPressPage> {
    this.log.info({ slug: page.slug }, 'Creating WordPress page');

    const body: Record<string, unknown> = {
      title: page.title,
      slug: page.slug,
      content: page.content,
      status: page.status,
    };

    // Add SEO meta if using RankMath or Yoast
    if (page.meta_title || page.meta_description) {
      body.meta = {
        // RankMath meta fields
        rank_math_title: page.meta_title,
        rank_math_description: page.meta_description,
        // Yoast meta fields (fallback)
        _yoast_wpseo_title: page.meta_title,
        _yoast_wpseo_metadesc: page.meta_description,
      };
    }

    const createdPage = await this.request<WordPressPage>('/pages', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    // Update Elementor data if provided
    if (page.elementor_data) {
      await this.updateElementorData(createdPage.id, page.elementor_data);
    }

    this.log.info({ id: createdPage.id, slug: createdPage.slug }, 'WordPress page created');
    return createdPage;
  }

  async updatePage(pageId: number, updates: Partial<CreatePageRequest>): Promise<WordPressPage> {
    this.log.info({ pageId }, 'Updating WordPress page');

    const body: Record<string, unknown> = {};

    if (updates.title) body.title = updates.title;
    if (updates.slug) body.slug = updates.slug;
    if (updates.content) body.content = updates.content;
    if (updates.status) body.status = updates.status;

    if (updates.meta_title || updates.meta_description) {
      body.meta = {
        rank_math_title: updates.meta_title,
        rank_math_description: updates.meta_description,
        _yoast_wpseo_title: updates.meta_title,
        _yoast_wpseo_metadesc: updates.meta_description,
      };
    }

    const updatedPage = await this.request<WordPressPage>(`/pages/${pageId}`, {
      method: 'POST',
      body: JSON.stringify(body),
    });

    if (updates.elementor_data) {
      await this.updateElementorData(pageId, updates.elementor_data);
    }

    return updatedPage;
  }

  async deletePage(pageId: number): Promise<void> {
    await this.request(`/pages/${pageId}?force=true`, {
      method: 'DELETE',
    });
    this.log.info({ pageId }, 'WordPress page deleted');
  }

  async updateElementorData(pageId: number, elementorData: object): Promise<void> {
    // Elementor stores data in post meta
    const metaUrl = `${this.baseUrl}/wp-json/wp/v2/pages/${pageId}`;

    await fetch(metaUrl, {
      method: 'POST',
      headers: {
        'Authorization': this.authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        meta: {
          _elementor_data: JSON.stringify(elementorData),
          _elementor_edit_mode: 'builder',
          _elementor_template_type: 'wp-page',
          _elementor_version: '3.18.0',
        },
      }),
    });

    this.log.debug({ pageId }, 'Elementor data updated');
  }

  async publishPage(pageId: number): Promise<WordPressPage> {
    return this.updatePage(pageId, { status: 'publish' });
  }

  async getMediaLibrary(params?: { per_page?: number }): Promise<unknown[]> {
    const query = new URLSearchParams();
    if (params?.per_page) query.set('per_page', String(params.per_page));

    return this.request<unknown[]>(`/media?${query.toString()}`);
  }

  async uploadMedia(file: Buffer, filename: string, mimeType: string): Promise<{ id: number; url: string }> {
    const url = `${this.baseUrl}/wp-json/wp/v2/media`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': this.authHeader,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Type': mimeType,
      },
      body: file,
    });

    if (!response.ok) {
      throw new Error(`Failed to upload media: ${response.status}`);
    }

    const data = await response.json() as { id: number; source_url: string };
    return { id: data.id, url: data.source_url };
  }

  // Retry wrapper for resilient operations
  async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries = 3,
    baseDelay = 1000
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        const delay = baseDelay * Math.pow(2, attempt);
        this.log.warn({ attempt, delay, error: lastError.message }, 'Retrying WordPress operation');
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }
}

export function createWordPressService(credentials: WordPressCredentials) {
  return new WordPressService(credentials);
}
