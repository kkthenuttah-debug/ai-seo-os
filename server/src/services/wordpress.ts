import { logger } from '../lib/logger.js';
import { AuthError, ValidationError } from '../utils/errors.js';
import type {
  CreatePostInput,
  CreatePostResponse,
  UpdatePostInput,
  UpdatePostResponse,
  MetaFields,
  WordPressPost,
  WordPressPage,
} from '../types/wordpress.js';

interface WordPressCredentials {
  site_url: string;
  username: string;
  application_password: string;
}

const DEFAULT_ELEMENTOR_VERSION = '3.18.0';

class RetryableError extends Error {
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, RetryableError.prototype);
  }
}

export class WordPressService {
  private credentials: WordPressCredentials;
  private baseUrl: string;
  private authHeader: string;
  private connectionValidated = false;
  private log = logger.child({ service: 'wordpress' });

  constructor(credentials: WordPressCredentials) {
    this.credentials = credentials;
    this.baseUrl = credentials.site_url.replace(/\/$/, '');
    this.authHeader = `Basic ${Buffer.from(`${credentials.username}:${credentials.application_password}`).toString('base64')}`;
  }

  private async ensureConnection(): Promise<void> {
    if (this.connectionValidated) return;

    const ok = await this.testConnection();
    if (!ok) {
      throw new AuthError('WordPress connection failed');
    }
    this.connectionValidated = true;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    return this.withRetry(async () => {
      const url = `${this.baseUrl}/wp-json/wp/v2${endpoint}`;

      let response: Awaited<ReturnType<typeof fetch>>;
      try {
        response = await fetch(url, {
          ...options,
          headers: {
            Authorization: this.authHeader,
            'Content-Type': 'application/json',
            ...options.headers,
          },
        });
      } catch (error) {
        throw new RetryableError('Network error while contacting WordPress');
      }

      if (!response.ok) {
        const errorText = await response.text();
        this.log.error({ url, status: response.status, error: errorText }, 'WordPress API error');

        if (response.status === 401 || response.status === 403) {
          this.connectionValidated = false;
          throw new AuthError('WordPress authentication failed');
        }

        if (response.status === 429 || response.status >= 500) {
          throw new RetryableError(`WordPress API error: ${response.status}`);
        }

        throw new Error(`WordPress API error: ${response.status} - ${errorText}`);
      }

      if (response.status === 204) {
        return undefined as T;
      }

      const text = await response.text();
      if (!text) {
        return undefined as T;
      }

      try {
        return JSON.parse(text) as T;
      } catch (error) {
        this.log.warn({ url }, 'Failed to parse WordPress response as JSON');
        return text as T;
      }
    });
  }

  private mapStatus(status: 'draft' | 'published') {
    return status === 'published' ? 'publish' : 'draft';
  }

  private buildMeta(meta?: MetaFields) {
    if (!meta) return undefined;

    const payload = {
      rank_math_title: meta.metaTitle,
      rank_math_description: meta.metaDescription,
      rank_math_focus_keyword: meta.focusKeyword,
      _yoast_wpseo_title: meta.metaTitle,
      _yoast_wpseo_metadesc: meta.metaDescription,
      _yoast_wpseo_focuskw: meta.focusKeyword,
      meta_keywords: meta.metaKeywords,
    };

    const filtered = Object.fromEntries(
      Object.entries(payload).filter(([, value]) => value !== undefined && value !== '')
    );

    return Object.keys(filtered).length > 0 ? filtered : undefined;
  }

  private safeStringify(data: unknown) {
    try {
      return JSON.stringify(data);
    } catch (error) {
      throw new ValidationError('Elementor data contains invalid JSON');
    }
  }

  private validateElementorData(data: unknown) {
    if (!data || typeof data !== 'object') {
      throw new ValidationError('Elementor data must be an object');
    }
  }

  private extractContent(post: WordPressPost) {
    if (typeof post.content === 'string') {
      return post.content;
    }
    return post.content?.rendered ?? '';
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

  async createPost(data: CreatePostInput): Promise<CreatePostResponse> {
    await this.ensureConnection();
    const type = data.postType ?? 'page';
    this.log.info({ slug: data.slug, type }, 'Creating WordPress content');

    const body: Record<string, unknown> = {
      title: data.title,
      slug: data.slug,
      content: data.content,
      status: this.mapStatus(data.status),
    };

    const meta = this.buildMeta(data.meta);
    if (meta) {
      body.meta = meta;
    }

    const endpoint = type === 'post' ? '/posts' : '/pages';
    const createdPost = await this.request<WordPressPost>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });

    if (data.elementorData) {
      await this.setElementorData(createdPost.id, data.elementorData, type);
    }

    this.log.info({ id: createdPost.id, slug: createdPost.slug }, 'WordPress post created');
    return createdPost;
  }

  async updatePost(postId: number, data: UpdatePostInput): Promise<UpdatePostResponse> {
    await this.ensureConnection();
    this.log.info({ postId }, 'Updating WordPress post');

    const body: Record<string, unknown> = {};

    if (data.title !== undefined) body.title = data.title;
    if (data.slug !== undefined) body.slug = data.slug;
    if (data.content !== undefined) body.content = data.content;
    if (data.status !== undefined) body.status = this.mapStatus(data.status);

    const meta = this.buildMeta(data.meta);
    if (meta) {
      body.meta = meta;
    }

    const updatedPost = await this.request<WordPressPost>(`/pages/${postId}`, {
      method: 'POST',
      body: JSON.stringify(body),
    });

    if (data.elementorData) {
      await this.setElementorData(postId, data.elementorData);
    }

    return updatedPost;
  }

  async getPost(postId: number): Promise<WordPressPost> {
    await this.ensureConnection();
    return this.request<WordPressPost>(`/pages/${postId}?context=edit`);
  }

  private contentEndpoint(type: 'page' | 'post', postId: number): string {
    const path = type === 'post' ? '/posts' : '/pages';
    return `${path}/${postId}`;
  }

  async setElementorData(postId: number, elementorData: unknown, postType: 'page' | 'post' = 'page'): Promise<void> {
    await this.ensureConnection();
    this.validateElementorData(elementorData);

    const version = (elementorData as { version?: string })?.version || DEFAULT_ELEMENTOR_VERSION;
    if (version !== DEFAULT_ELEMENTOR_VERSION) {
      this.log.warn({ postId, version }, 'Elementor data version mismatch');
    }

    await this.request(this.contentEndpoint(postType, postId), {
      method: 'POST',
      body: JSON.stringify({
        meta: {
          _elementor_data: this.safeStringify(elementorData),
          _elementor_edit_mode: 'builder',
          _elementor_template_type: 'wp-page',
          _elementor_version: version,
        },
      }),
    });

    this.log.debug({ postId }, 'Elementor data updated');
  }

  async getElementorData(postId: number): Promise<unknown> {
    await this.ensureConnection();
    const post = await this.getPost(postId);
    const raw = post.meta?._elementor_data;

    if (!raw || typeof raw !== 'string') {
      return null;
    }

    try {
      return JSON.parse(raw);
    } catch (error) {
      this.log.warn({ postId }, 'Failed to parse Elementor data');
      return null;
    }
  }

  async setMetaFields(postId: number, meta: MetaFields): Promise<void> {
    await this.ensureConnection();
    const metaPayload = this.buildMeta(meta);

    if (!metaPayload) {
      return;
    }

    await this.request(`/pages/${postId}`, {
      method: 'POST',
      body: JSON.stringify({
        meta: metaPayload,
      }),
    });
  }

  async getMetaFields(postId: number): Promise<MetaFields> {
    await this.ensureConnection();
    const post = await this.getPost(postId);
    const meta = post.meta ?? {};

    return {
      metaTitle: meta.rank_math_title as string | undefined,
      metaDescription: (meta.rank_math_description || meta._yoast_wpseo_metadesc || '') as string,
      metaKeywords: (meta.meta_keywords as string) || '',
      focusKeyword: (meta.rank_math_focus_keyword || meta._yoast_wpseo_focuskw) as string | undefined,
    };
  }

  async publishPost(postId: number): Promise<void> {
    await this.updatePostStatus(postId, 'published');
  }

  async updatePostStatus(postId: number, status: 'draft' | 'published'): Promise<void> {
    await this.updatePost(postId, { status });
  }

  /** Update an existing page/post content and meta (used after optimization). */
  async updatePage(
    postId: number,
    data: { content?: string; meta_title?: string; meta_description?: string },
    postType: 'page' | 'post' = 'page'
  ): Promise<void> {
    await this.ensureConnection();
    const body: Record<string, unknown> = {};
    if (data.content !== undefined) body.content = data.content;
    const meta = this.buildMeta({
      metaTitle: data.meta_title,
      metaDescription: data.meta_description ?? '',
      metaKeywords: '',
    });
    if (meta) body.meta = meta;
    await this.request(this.contentEndpoint(postType, postId), {
      method: 'POST',
      body: JSON.stringify(body),
    });
    this.log.debug({ postId, postType }, 'WordPress page updated');
  }

  async searchPages(query: string): Promise<WordPressPage[]> {
    await this.ensureConnection();
    const search = new URLSearchParams({ search: query }).toString();
    return this.request<WordPressPage[]>(`/pages?${search}`);
  }

  async insertInternalLink(postId: number, anchor: string, targetUrl: string, position: number): Promise<void> {
    await this.ensureConnection();
    const post = await this.getPost(postId);
    const content = this.extractContent(post);

    const safePosition = Math.min(Math.max(position, 0), content.length);
    const anchorTag = `<a href="${targetUrl}">${anchor}</a>`;
    const updatedContent = `${content.slice(0, safePosition)}${anchorTag}${content.slice(safePosition)}`;

    await this.updatePost(postId, { content: updatedContent });
  }

  async withRetry<T>(operation: () => Promise<T>, maxRetries = 3, baseDelay = 1000): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        const err = error as Error;
        lastError = err;

        if (!(err instanceof RetryableError)) {
          throw err;
        }

        const delay = baseDelay * Math.pow(2, attempt);
        this.log.warn({ attempt, delay, error: err.message }, 'Retrying WordPress operation');
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }
}

export function createWordPressService(credentials: WordPressCredentials) {
  return new WordPressService(credentials);
}
