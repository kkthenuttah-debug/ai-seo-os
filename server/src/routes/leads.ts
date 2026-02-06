import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { supabaseAdmin } from '../lib/supabase.js';
import { authenticate, verifyProjectOwnership } from '../middleware/auth.js';
import { ValidationError } from '../utils/errors.js';

const createLeadSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  phone: z.string().optional(),
  message: z.string().optional(),
  sourcePage: z.string().optional(),
  data: z.record(z.unknown()).optional(),
});

const updateLeadSchema = z.object({
  status: z.enum(['new', 'contacted', 'qualified', 'converted', 'lost']).optional(),
  notes: z.string().optional(),
});

const listLeadsSchema = z.object({
  search: z.string().optional(),
  dateRange: z.enum(['today', 'week', 'month', 'quarter', 'year', 'all']).default('all'),
  status: z.enum(['new', 'contacted', 'qualified', 'converted', 'lost']).optional(),
  sort: z.enum(['created_at', 'name', 'email']).default('created_at'),
  limit: z.coerce.number().int().positive().max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export async function leadsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);

  app.get(
    '/projects/:projectId/leads',
    { preHandler: [verifyProjectOwnership] },
    async (request) => {
      const { projectId } = request.params as { projectId: string };
      const { search, dateRange, status, sort, limit, offset } = listLeadsSchema.parse(request.query);

      let query = supabaseAdmin
        .from('leads')
        .select('*', { count: 'exact' })
        .eq('project_id', projectId)
        .range(offset, offset + limit - 1)
        .order(sort, { ascending: false });

      // Apply date range filter
      if (dateRange !== 'all') {
        const now = new Date();
        let startDate = new Date();

        switch (dateRange) {
          case 'today':
            startDate.setHours(0, 0, 0, 0);
            break;
          case 'week':
            startDate.setDate(now.getDate() - 7);
            break;
          case 'month':
            startDate.setMonth(now.getMonth() - 1);
            break;
          case 'quarter':
            startDate.setMonth(now.getMonth() - 3);
            break;
          case 'year':
            startDate.setFullYear(now.getFullYear() - 1);
            break;
        }

        query = query.gte('captured_at', startDate.toISOString());
      }

      // Apply status filter
      if (status) {
        // Note: leads table may not have status field, would need to add it
        // For now, we'll filter by a custom approach or skip
      }

      // Apply search filter
      if (search) {
        query = query.or(`email.ilike.%${search}%,name.ilike.%${search}%,message.ilike.%${search}%`);
      }

      const { data, count, error } = await query;
      if (error) throw error;

      return {
        leads: data,
        total: count || 0,
        limit,
        offset,
      };
    }
  );

  app.get(
    '/projects/:projectId/leads/:leadId',
    { preHandler: [verifyProjectOwnership] },
    async (request) => {
      const { projectId, leadId } = request.params as { projectId: string; leadId: string };

      // Get lead with source page info
      const { data: lead, error } = await supabaseAdmin
        .from('leads')
        .select(`
          *,
          pages:source_page_id (
            id,
            title,
            slug
          )
        `)
        .eq('id', leadId)
        .eq('project_id', projectId)
        .single();

      if (error) throw error;
      if (!lead) throw new ValidationError('Lead not found');

      return {
        id: lead.id,
        projectId: lead.project_id,
        email: lead.email,
        phone: lead.phone,
        name: lead.name,
        message: lead.message,
        sourcePageId: lead.source_page_id,
        sourceUrl: lead.source_url,
        data: lead.data,
        capturedAt: lead.captured_at,
        createdAt: lead.created_at,
        sourcePage: lead.pages,
      };
    }
  );

  app.post(
    '/projects/:projectId/leads',
    { preHandler: [verifyProjectOwnership] },
    async (request) => {
      const { projectId } = request.params as { projectId: string };
      const body = createLeadSchema.parse(request.body);

      // Check if email already exists for this project
      const { data: existingLead } = await supabaseAdmin
        .from('leads')
        .select('id')
        .eq('project_id', projectId)
        .eq('email', body.email)
        .single();

      if (existingLead) {
        throw new ValidationError('A lead with this email already exists');
      }

      const { data, error } = await supabaseAdmin
        .from('leads')
        .insert({
          project_id: projectId,
          email: body.email,
          phone: body.phone || null,
          name: body.name || null,
          message: body.message || null,
          source_page_id: null,
          source_url: body.sourcePage || null,
          data: body.data || {},
          captured_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      return data;
    }
  );

  app.patch(
    '/projects/:projectId/leads/:leadId',
    { preHandler: [verifyProjectOwnership] },
    async (request) => {
      const { projectId, leadId } = request.params as { projectId: string; leadId: string };
      const body = updateLeadSchema.parse(request.body);

      const updateData: Record<string, unknown> = {};
      if (body.status !== undefined) updateData.status = body.status;
      if (body.notes !== undefined) updateData.notes = body.notes;

      const { data, error } = await supabaseAdmin
        .from('leads')
        .update(updateData)
        .eq('id', leadId)
        .eq('project_id', projectId)
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new ValidationError('Lead not found');

      return data;
    }
  );

  app.delete(
    '/projects/:projectId/leads/:leadId',
    { preHandler: [verifyProjectOwnership] },
    async (request) => {
      const { projectId, leadId } = request.params as { projectId: string; leadId: string };

      const { error } = await supabaseAdmin
        .from('leads')
        .delete()
        .eq('id', leadId)
        .eq('project_id', projectId);

      if (error) throw error;

      return { success: true };
    }
  );

  app.get(
    '/projects/:projectId/leads/export',
    { preHandler: [verifyProjectOwnership] },
    async (request) => {
      const { projectId } = request.params as { projectId: string };
      const { dateRange, status, format } = z.object({
        dateRange: z.enum(['today', 'week', 'month', 'quarter', 'year', 'all']).default('all'),
        status: z.enum(['new', 'contacted', 'qualified', 'converted', 'lost']).optional(),
        format: z.enum(['csv', 'json']).default('csv'),
      }).parse(request.query);

      let query = supabaseAdmin
        .from('leads')
        .select('*')
        .eq('project_id', projectId);

      // Apply date range filter
      if (dateRange !== 'all') {
        const now = new Date();
        let startDate = new Date();

        switch (dateRange) {
          case 'today':
            startDate.setHours(0, 0, 0, 0);
            break;
          case 'week':
            startDate.setDate(now.getDate() - 7);
            break;
          case 'month':
            startDate.setMonth(now.getMonth() - 1);
            break;
          case 'quarter':
            startDate.setMonth(now.getMonth() - 3);
            break;
          case 'year':
            startDate.setFullYear(now.getFullYear() - 1);
            break;
        }

        query = query.gte('captured_at', startDate.toISOString());
      }

      const { data: leads, error } = await query;
      if (error) throw error;

      if (format === 'json') {
        return {
          leads,
          exportedAt: new Date().toISOString(),
          count: leads?.length || 0,
        };
      }

      // Generate CSV
      const headers = ['ID', 'Name', 'Email', 'Phone', 'Message', 'Source URL', 'Captured At', 'Data'];
      const rows = (leads || []).map(lead => [
        lead.id,
        lead.name || '',
        lead.email,
        lead.phone || '',
        lead.message || '',
        lead.source_url || '',
        lead.captured_at,
        JSON.stringify(lead.data || {}),
      ]);

      const csv = [headers.join(','), ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))].join('\n');

      return {
        csv,
        filename: `leads-${projectId}-${Date.now()}.csv`,
        contentType: 'text/csv',
      };
    }
  );

  app.get(
    '/projects/:projectId/leads/stats',
    { preHandler: [verifyProjectOwnership] },
    async (request) => {
      const { projectId } = request.params as { projectId: string };

      const now = new Date();
      const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      // Get all leads for project
      const { data: leads, error } = await supabaseAdmin
        .from('leads')
        .select('*')
        .eq('project_id', projectId);

      if (error) throw error;

      // Calculate statistics
      const totalCount = leads?.length || 0;
      const thisWeekCount = leads?.filter(l => new Date(l.captured_at) >= weekStart).length || 0;
      const thisMonthCount = leads?.filter(l => new Date(l.captured_at) >= monthStart).length || 0;

      // Calculate conversion metrics (assuming status field exists)
      const statusCounts = leads?.reduce((acc, lead) => {
        const status = (lead as any).status || 'new';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const conversionRate = totalCount > 0 
        ? ((statusCounts['converted'] || 0) / totalCount) * 100 
        : 0;

      // Calculate trend (compare this week to previous week)
      const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      const previousWeekCount = leads?.filter(
        l => new Date(l.captured_at) >= twoWeeksAgo && new Date(l.captured_at) < weekStart
      ).length || 0;

      const weekTrend = previousWeekCount > 0 
        ? ((thisWeekCount - previousWeekCount) / previousWeekCount) * 100 
        : 0;

      return {
        total: totalCount,
        byStatus: statusCounts,
        thisWeek: {
          count: thisWeekCount,
          trend: weekTrend,
        },
        thisMonth: thisMonthCount,
        conversionMetrics: {
          conversionRate: Math.round(conversionRate * 100) / 100,
          convertedCount: statusCounts['converted'] || 0,
          qualifiedCount: statusCounts['qualified'] || 0,
          contactedCount: statusCounts['contacted'] || 0,
        },
        recentLeads: (leads || [])
          .sort((a, b) => new Date(b.captured_at).getTime() - new Date(a.captured_at).getTime())
          .slice(0, 5)
          .map(l => ({
            id: l.id,
            name: l.name,
            email: l.email,
            capturedAt: l.captured_at,
          })),
      };
    }
  );
}
