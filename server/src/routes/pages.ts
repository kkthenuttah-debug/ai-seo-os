import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { supabaseAdmin } from '../lib/supabase.js';
import { authenticate, verifyProjectOwnership } from '../middleware/auth.js';
import { AuthError, NotFoundError, ValidationError } from '../utils/errors.js';

const createPageSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1),
  content: z.string().optional(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  metaKeywords: z.string().optional(),
  elementorData: z.record(z.unknown()).optional(),
});

const updatePageSchema = z.object({
  title: z.string().optional(),
  slug: z.string().optional(),
  content: z.string().optional(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  metaKeywords: z.string().optional(),
  status: z.enum(['draft', 'published', 'optimized']).optional(),
  elementorData: z.record(z.unknown()).optional(),
});

const listPagesSchema = z.object({
  status: z.enum(['draft', 'published', 'optimized']).optional(),
  search: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  sort: z.enum(['created_at', 'updated_at', 'title']).default('updated_at'),
});

export async function pagesRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);

  app.get(
    '/projects/:projectId/pages',
    { preHandler: [verifyProjectOwnership] },
    async (request) => {
      const { projectId } = request.params as { projectId: string };
      const { status, search, limit, offset, sort } = listPagesSchema.parse(request.query);

      let query = supabaseAdmin
        .from('pages')
        .select('*', { count: 'exact' })
        .eq('project_id', projectId)
        .range(offset, offset + limit - 1)
        .order(sort, { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      if (search) {
        query = query.or(`title.ilike.%${search}%,slug.ilike.%${search}%`);
      }

      const { data, count, error } = await query;
      if (error) throw error;

      return {
        pages: data,
        total: count || 0,
        limit,
        offset,
      };
    }
  );

  app.get(
    '/projects/:projectId/pages/:pageId',
    { preHandler: [verifyProjectOwnership] },
    async (request) => {
      const { projectId, pageId } = request.params as { projectId: string; pageId: string };

      const { data: page, error } = await supabaseAdmin
        .from('pages')
        .select('*')
        .eq('id', pageId)
        .eq('project_id', projectId)
        .single();

      if (error) throw error;
      if (!page) throw new NotFoundError('Page not found');

      return page;
    }
  );

  app.post(
    '/projects/:projectId/pages',
    { preHandler: [verifyProjectOwnership] },
    async (request) => {
      const { projectId } = request.params as { projectId: string };
      const body = createPageSchema.parse(request.body);

      // Check if slug is unique within project
      const { data: existingPage } = await supabaseAdmin
        .from('pages')
        .select('id')
        .eq('project_id', projectId)
        .eq('slug', body.slug)
        .single();

      if (existingPage) {
        throw new ValidationError('Page with this slug already exists');
      }

      const { data, error } = await supabaseAdmin
        .from('pages')
        .insert({
          project_id: projectId,
          title: body.title,
          slug: body.slug,
          content: body.content || null,
          meta_title: body.metaTitle || null,
          meta_description: body.metaDescription || null,
          meta_keywords: body.metaKeywords || null,
          elementor_data: body.elementorData || {},
          status: 'draft',
          publish_status: 'pending',
          internal_links: [],
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    }
  );

  app.patch(
    '/projects/:projectId/pages/:pageId',
    { preHandler: [verifyProjectOwnership] },
    async (request) => {
      const { projectId, pageId } = request.params as { projectId: string; pageId: string };
      const body = updatePageSchema.parse(request.body);

      const updateData: Record<string, unknown> = {};
      if (body.title !== undefined) updateData.title = body.title;
      if (body.slug !== undefined) updateData.slug = body.slug;
      if (body.content !== undefined) updateData.content = body.content;
      if (body.metaTitle !== undefined) updateData.meta_title = body.metaTitle;
      if (body.metaDescription !== undefined) updateData.meta_description = body.metaDescription;
      if (body.metaKeywords !== undefined) updateData.meta_keywords = body.metaKeywords;
      if (body.status !== undefined) updateData.status = body.status;
      if (body.elementorData !== undefined) updateData.elementor_data = body.elementorData;

      const { data, error } = await supabaseAdmin
        .from('pages')
        .update(updateData)
        .eq('id', pageId)
        .eq('project_id', projectId)
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new NotFoundError('Page not found');

      return data;
    }
  );

  app.delete(
    '/projects/:projectId/pages/:pageId',
    { preHandler: [verifyProjectOwnership] },
    async (request) => {
      const { projectId, pageId } = request.params as { projectId: string; pageId: string };

      const { error } = await supabaseAdmin
        .from('pages')
        .update({ status: 'archived' })
        .eq('id', pageId)
        .eq('project_id', projectId);

      if (error) throw error;

      return { success: true };
    }
  );

  app.get(
    '/projects/:projectId/pages/:pageId/preview',
    { preHandler: [verifyProjectOwnership] },
    async (request) => {
      const { projectId, pageId } = request.params as { projectId: string; pageId: string };

      const { data: page, error } = await supabaseAdmin
        .from('pages')
        .select('*')
        .eq('id', pageId)
        .eq('project_id', projectId)
        .single();

      if (error) throw error;
      if (!page) throw new NotFoundError('Page not found');

      // Generate HTML preview
      const html = generatePreviewHtml(page);

      return {
        html,
        page,
      };
    }
  );

  app.post(
    '/projects/:projectId/pages/:pageId/publish',
    { preHandler: [verifyProjectOwnership] },
    async (request) => {
      const { projectId, pageId } = request.params as { projectId: string; pageId: string };

      const { data: page, error: fetchError } = await supabaseAdmin
        .from('pages')
        .select('*')
        .eq('id', pageId)
        .eq('project_id', projectId)
        .single();

      if (fetchError) throw fetchError;
      if (!page) throw new NotFoundError('Page not found');

      // Get WordPress integration
      const { data: wpIntegration, error: wpError } = await supabaseAdmin
        .from('integrations')
        .select('*')
        .eq('project_id', projectId)
        .eq('type', 'wordpress')
        .single();

      if (wpError || !wpIntegration) {
        throw new ValidationError('WordPress integration not configured');
      }

      if (wpIntegration.status !== 'active') {
        throw new ValidationError('WordPress integration is not active');
      }

      // Publish to WordPress (simplified - in real implementation would call WordPress service)
      const wordpressPostId = Math.floor(Math.random() * 100000); // Mock ID
      const wordpressUrl = `${wpIntegration.data?.site_url || ''}/${page.slug}`;

      // Update page with publish status
      const { data: updatedPage, error: updateError } = await supabaseAdmin
        .from('pages')
        .update({
          status: 'published',
          publish_status: 'published',
          wordpress_post_id: wordpressPostId,
          published_at: new Date().toISOString(),
        })
        .eq('id', pageId)
        .select()
        .single();

      if (updateError) throw updateError;

      return {
        success: true,
        page: updatedPage,
        wordpressUrl,
        wordpressPostId,
      };
    }
  );

  app.patch(
    '/projects/:projectId/pages/:pageId/elementor',
    { preHandler: [verifyProjectOwnership] },
    async (request) => {
      const { projectId, pageId } = request.params as { projectId: string; pageId: string };
      const body = z.object({
        elementorData: z.record(z.unknown()),
      }).parse(request.body);

      // Validate Elementor schema (basic validation)
      if (!body.elementorData || typeof body.elementorData !== 'object') {
        throw new ValidationError('Invalid Elementor data');
      }

      const { data, error } = await supabaseAdmin
        .from('pages')
        .update({ elementor_data: body.elementorData })
        .eq('id', pageId)
        .eq('project_id', projectId)
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new NotFoundError('Page not found');

      return data;
    }
  );
}

function generatePreviewHtml(page: any): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${page.meta_title || page.title}</title>
  <meta name="description" content="${page.meta_description || ''}">
</head>
<body>
  <h1>${page.title}</h1>
  <div class="content">
    ${page.content || 'No content'}
  </div>
</body>
</html>`;
}
