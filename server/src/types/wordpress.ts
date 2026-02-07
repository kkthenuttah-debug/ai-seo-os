export interface MetaFields {
  metaTitle?: string;
  metaDescription: string;
  metaKeywords: string;
  focusKeyword?: string;
  [key: string]: unknown;
}

export interface CreatePostInput {
  title: string;
  content: string;
  slug: string;
  status: 'draft' | 'published';
  meta?: MetaFields;
  elementorData?: unknown;
  /** WordPress post type: 'page' for main/static (e.g. home), 'post' for articles */
  postType?: 'page' | 'post';
}

export interface UpdatePostInput {
  title?: string;
  content?: string;
  slug?: string;
  status?: 'draft' | 'published';
  meta?: MetaFields;
  elementorData?: unknown;
}

export interface WordPressPost {
  id: number;
  date?: string;
  slug: string;
  status: string;
  link?: string;
  title: { rendered: string } | string;
  content: { rendered: string } | string;
  meta?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface WordPressPage {
  id: number;
  slug: string;
  link: string;
  status: string;
  title: { rendered: string } | string;
  content: { rendered: string } | string;
}

export type CreatePostResponse = WordPressPost;
export type UpdatePostResponse = WordPressPost;
