import { api } from "@/services/api";

export interface PageFromApi {
  id: string;
  title: string;
  slug: string;
  status: string;
  content?: string;
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string;
  elementor_data?: Record<string, unknown>;
  published_at?: string;
  wordpress_post_id?: number;
  gsc_last_crawl_time?: string | null;
  gsc_index_status?: string | null;
  updated_at: string;
  created_at: string;
}

export interface PagesListResponse {
  pages: PageFromApi[];
  total: number;
  limit: number;
  offset: number;
}

export interface CreatePagePayload {
  title: string;
  slug: string;
  content?: string;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
  elementorData?: Record<string, unknown>;
  status?: "draft" | "published" | "optimized";
}

export interface UpdatePagePayload {
  title?: string;
  slug?: string;
  content?: string;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
  elementorData?: Record<string, unknown>;
  status?: "draft" | "published" | "optimized";
}

export const pagesService = {
  list: (projectId: string, params?: { status?: string; search?: string; limit?: number; offset?: number; sort?: string }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set("status", params.status);
    if (params?.search) q.set("search", params.search);
    if (params?.limit != null) q.set("limit", String(params.limit));
    if (params?.offset != null) q.set("offset", String(params.offset));
    if (params?.sort) q.set("sort", params.sort);
    const path = q.toString() ? `/projects/${projectId}/pages?${q}` : `/projects/${projectId}/pages`;
    return api.get<PagesListResponse>(path);
  },
  get: (projectId: string, pageId: string) =>
    api.get<PageFromApi>(`/projects/${projectId}/pages/${pageId}`),
  create: (projectId: string, payload: CreatePagePayload) =>
    api.post<PageFromApi>(`/projects/${projectId}/pages`, payload),
  update: (projectId: string, pageId: string, payload: UpdatePagePayload) =>
    api.patch<PageFromApi>(`/projects/${projectId}/pages/${pageId}`, payload),
  delete: (projectId: string, pageId: string) =>
    api.delete<null>(`/projects/${projectId}/pages/${pageId}`),
  preview: (projectId: string, pageId: string) =>
    api.get<{ html: string; page: PageFromApi }>(`/projects/${projectId}/pages/${pageId}/preview`),
  publish: (projectId: string, pageId: string) =>
    api.post<{ success: boolean; page: PageFromApi; wordpressUrl: string; wordpressPostId: number }>(`/projects/${projectId}/pages/${pageId}/publish`),
  refreshIndexStatus: (projectId: string, pageId: string) =>
    api.post<PageFromApi>(`/projects/${projectId}/pages/${pageId}/refresh-index-status`),
};
