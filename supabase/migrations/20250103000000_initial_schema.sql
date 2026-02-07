-- AI SEO OS - Initial Database Schema
-- Migration: 20250103000000_initial_schema
-- Description: Creates all core tables, enums, indexes, and RLS policies for the AI SEO OS platform

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- ENUM TYPES (idempotent: skip if already exists)
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE project_status AS ENUM ('active', 'paused', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE integration_type AS ENUM ('gsc', 'wordpress', 'elementor', 'rankmath', 'yoast');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE page_status AS ENUM ('draft', 'published', 'optimized');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE publish_status AS ENUM ('pending', 'published', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE agent_type AS ENUM (
    'market_research',
    'site_arch',
    'internal_linker',
    'elementor_builder',
    'content_builder',
    'page_builder',
    'fixer',
    'technical_seo',
    'monitor',
    'optimizer',
    'publisher'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE agent_run_status AS ENUM ('pending', 'running', 'completed', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE log_level AS ENUM ('debug', 'info', 'warn', 'error');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Table: users
-- Description: Application users linked to Supabase Auth
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL UNIQUE,
    auth_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    company_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE users IS 'Application users linked to Supabase Auth';
COMMENT ON COLUMN users.auth_id IS 'Reference to Supabase Auth user ID';
COMMENT ON COLUMN users.company_name IS 'User organization or company name';

-- ----------------------------------------------------------------------------
-- Table: projects
-- Description: SEO projects owned by users
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    domain TEXT,
    wordpress_url TEXT,
    wordpress_username TEXT,
    wordpress_password_encrypted TEXT,
    status project_status DEFAULT 'active',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE projects IS 'SEO projects owned by users';
COMMENT ON COLUMN projects.wordpress_password_encrypted IS 'Encrypted WordPress application password (planning for vault integration)';
COMMENT ON COLUMN projects.settings IS 'Project configuration settings as JSON';

-- ----------------------------------------------------------------------------
-- Table: integrations
-- Description: Third-party service integrations for projects
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    type integration_type NOT NULL,
    access_token_encrypted TEXT,
    refresh_token_encrypted TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    data JSONB DEFAULT '{}',
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'error')),
    last_sync_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE integrations IS 'Third-party service integrations (GSC, WordPress, etc.)';
COMMENT ON COLUMN integrations.access_token_encrypted IS 'Encrypted OAuth access token';
COMMENT ON COLUMN integrations.refresh_token_encrypted IS 'Encrypted OAuth refresh token';
COMMENT ON COLUMN integrations.data IS 'Integration-specific configuration and metadata';

-- ----------------------------------------------------------------------------
-- Table: pages
-- Description: Website pages/content within projects
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    slug TEXT NOT NULL,
    content TEXT,
    meta_title TEXT,
    meta_description TEXT,
    meta_keywords TEXT,
    elementor_data JSONB DEFAULT '{}',
    internal_links JSONB DEFAULT '[]',
    status page_status DEFAULT 'draft',
    publish_status publish_status DEFAULT 'pending',
    wordpress_post_id BIGINT,
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE pages IS 'Website pages and content within projects';
COMMENT ON COLUMN pages.elementor_data IS 'Elementor page builder data as JSON';
COMMENT ON COLUMN pages.wordpress_post_id IS 'WordPress post ID after publishing';

-- ----------------------------------------------------------------------------
-- Table: agent_runs
-- Description: AI agent execution tracking
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS agent_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    agent_type agent_type NOT NULL,
    status agent_run_status DEFAULT 'pending',
    input JSONB DEFAULT '{}',
    output JSONB DEFAULT '{}',
    error_message TEXT,
    model_used TEXT,
    tokens_used INTEGER DEFAULT 0 CHECK (tokens_used >= 0),
    duration_ms INTEGER CHECK (duration_ms >= 0),
    retry_count INTEGER DEFAULT 0 CHECK (retry_count >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

COMMENT ON TABLE agent_runs IS 'AI agent execution tracking and audit trail';
COMMENT ON COLUMN agent_runs.input IS 'Agent input parameters as JSON';
COMMENT ON COLUMN agent_runs.output IS 'Agent output/results as JSON';
COMMENT ON COLUMN agent_runs.tokens_used IS 'Number of LLM tokens consumed';

-- ----------------------------------------------------------------------------
-- Table: gsc_snapshots
-- Description: Google Search Console data snapshots
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS gsc_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    query TEXT,
    page TEXT,
    clicks INTEGER DEFAULT 0 CHECK (clicks >= 0),
    impressions INTEGER DEFAULT 0 CHECK (impressions >= 0),
    ctr DECIMAL(5,4) CHECK (ctr >= 0 AND ctr <= 1),
    position DECIMAL(5,2) CHECK (position >= 0),
    snapshot_date DATE NOT NULL,
    total_clicks INTEGER DEFAULT 0,
    total_impressions INTEGER DEFAULT 0,
    average_ctr DECIMAL(5,4),
    average_position DECIMAL(5,2),
    data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE gsc_snapshots IS 'Google Search Console performance snapshots';
COMMENT ON COLUMN gsc_snapshots.ctr IS 'Click-through rate (0-1)';
COMMENT ON COLUMN gsc_snapshots.position IS 'Average search position';

-- ----------------------------------------------------------------------------
-- Table: rankings
-- Description: Keyword ranking tracking
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rankings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    page_id UUID REFERENCES pages(id) ON DELETE SET NULL,
    keyword TEXT NOT NULL,
    position INTEGER CHECK (position > 0),
    previous_position INTEGER CHECK (previous_position > 0),
    position_change INTEGER,
    url TEXT,
    search_volume INTEGER,
    difficulty INTEGER CHECK (difficulty >= 0 AND difficulty <= 100),
    tracked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE rankings IS 'Keyword ranking positions and tracking history';
COMMENT ON COLUMN rankings.difficulty IS 'Keyword difficulty score (0-100)';

-- ----------------------------------------------------------------------------
-- Table: leads
-- Description: Captured leads from website forms
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    phone TEXT,
    name TEXT,
    message TEXT,
    source_page_id UUID REFERENCES pages(id) ON DELETE SET NULL,
    source_url TEXT,
    data JSONB DEFAULT '{}',
    captured_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE leads IS 'Captured leads from website forms and CTAs';
COMMENT ON COLUMN leads.data IS 'Additional lead data as JSON';

-- ----------------------------------------------------------------------------
-- Table: logs
-- Description: System and application logs
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    agent_run_id UUID REFERENCES agent_runs(id) ON DELETE SET NULL,
    level log_level DEFAULT 'info',
    service TEXT NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE logs IS 'System, application, and audit logs';
COMMENT ON COLUMN logs.service IS 'Service or component that generated the log';
COMMENT ON COLUMN logs.metadata IS 'Additional log context as JSON';

-- ============================================================================
-- INDEXES (idempotent)
-- ============================================================================

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON users(auth_id);

-- Projects indexes
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at);

-- Integrations indexes
CREATE INDEX IF NOT EXISTS idx_integrations_project_id ON integrations(project_id);
CREATE INDEX IF NOT EXISTS idx_integrations_type ON integrations(type);
CREATE INDEX IF NOT EXISTS idx_integrations_status ON integrations(status);

-- Pages indexes
CREATE INDEX IF NOT EXISTS idx_pages_project_id ON pages(project_id);
CREATE INDEX IF NOT EXISTS idx_pages_status ON pages(status);
CREATE INDEX IF NOT EXISTS idx_pages_publish_status ON pages(publish_status);
CREATE INDEX IF NOT EXISTS idx_pages_slug ON pages(slug);
CREATE INDEX IF NOT EXISTS idx_pages_wordpress_post_id ON pages(wordpress_post_id);
CREATE INDEX IF NOT EXISTS idx_pages_created_at ON pages(created_at);

-- Agent runs indexes
CREATE INDEX IF NOT EXISTS idx_agent_runs_project_id ON agent_runs(project_id);
CREATE INDEX IF NOT EXISTS idx_agent_runs_agent_type ON agent_runs(agent_type);
CREATE INDEX IF NOT EXISTS idx_agent_runs_status ON agent_runs(status);
CREATE INDEX IF NOT EXISTS idx_agent_runs_created_at ON agent_runs(created_at);
CREATE INDEX IF NOT EXISTS idx_agent_runs_completed_at ON agent_runs(completed_at);

-- GSC snapshots indexes
CREATE INDEX IF NOT EXISTS idx_gsc_snapshots_project_id ON gsc_snapshots(project_id);
CREATE INDEX IF NOT EXISTS idx_gsc_snapshots_snapshot_date ON gsc_snapshots(snapshot_date);
CREATE INDEX IF NOT EXISTS idx_gsc_snapshots_query ON gsc_snapshots(query);
CREATE INDEX IF NOT EXISTS idx_gsc_snapshots_page ON gsc_snapshots(page);
CREATE INDEX IF NOT EXISTS idx_gsc_snapshots_project_date ON gsc_snapshots(project_id, snapshot_date);

-- Rankings indexes
CREATE INDEX IF NOT EXISTS idx_rankings_project_id ON rankings(project_id);
CREATE INDEX IF NOT EXISTS idx_rankings_page_id ON rankings(page_id);
CREATE INDEX IF NOT EXISTS idx_rankings_keyword ON rankings(keyword);
CREATE INDEX IF NOT EXISTS idx_rankings_tracked_at ON rankings(tracked_at);

-- Leads indexes
CREATE INDEX IF NOT EXISTS idx_leads_project_id ON leads(project_id);
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_source_page_id ON leads(source_page_id);
CREATE INDEX IF NOT EXISTS idx_leads_captured_at ON leads(captured_at);

-- Logs indexes
CREATE INDEX IF NOT EXISTS idx_logs_project_id ON logs(project_id);
CREATE INDEX IF NOT EXISTS idx_logs_level ON logs(level);
CREATE INDEX IF NOT EXISTS idx_logs_service ON logs(service);
CREATE INDEX IF NOT EXISTS idx_logs_created_at ON logs(created_at);
CREATE INDEX IF NOT EXISTS idx_logs_project_created ON logs(project_id, created_at);

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all tables with updated_at column
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_integrations_updated_at
    BEFORE UPDATE ON integrations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pages_updated_at
    BEFORE UPDATE ON pages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_runs_updated_at
    BEFORE UPDATE ON agent_runs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE gsc_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE rankings ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE logs ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid() = auth_id);

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = auth_id);

-- Projects policies
CREATE POLICY "Users can view own projects" ON projects
    FOR SELECT USING (
        user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
    );

CREATE POLICY "Users can create projects" ON projects
    FOR INSERT WITH CHECK (
        user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
    );

CREATE POLICY "Users can update own projects" ON projects
    FOR UPDATE USING (
        user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
    );

CREATE POLICY "Users can delete own projects" ON projects
    FOR DELETE USING (
        user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
    );

-- Integrations policies
CREATE POLICY "Users can view project integrations" ON integrations
    FOR SELECT USING (
        project_id IN (
            SELECT id FROM projects 
            WHERE user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
        )
    );

CREATE POLICY "Users can manage project integrations" ON integrations
    FOR ALL USING (
        project_id IN (
            SELECT id FROM projects 
            WHERE user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
        )
    );

-- Pages policies
CREATE POLICY "Users can view project pages" ON pages
    FOR SELECT USING (
        project_id IN (
            SELECT id FROM projects 
            WHERE user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
        )
    );

CREATE POLICY "Users can manage project pages" ON pages
    FOR ALL USING (
        project_id IN (
            SELECT id FROM projects 
            WHERE user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
        )
    );

-- Agent runs policies
CREATE POLICY "Users can view project agent runs" ON agent_runs
    FOR SELECT USING (
        project_id IN (
            SELECT id FROM projects 
            WHERE user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
        )
    );

CREATE POLICY "Users can manage project agent runs" ON agent_runs
    FOR ALL USING (
        project_id IN (
            SELECT id FROM projects 
            WHERE user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
        )
    );

-- GSC snapshots policies
CREATE POLICY "Users can view project GSC data" ON gsc_snapshots
    FOR SELECT USING (
        project_id IN (
            SELECT id FROM projects 
            WHERE user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
        )
    );

-- Rankings policies
CREATE POLICY "Users can view project rankings" ON rankings
    FOR SELECT USING (
        project_id IN (
            SELECT id FROM projects 
            WHERE user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
        )
    );

-- Leads policies
CREATE POLICY "Users can view project leads" ON leads
    FOR SELECT USING (
        project_id IN (
            SELECT id FROM projects 
            WHERE user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
        )
    );

-- Logs policies
CREATE POLICY "Users can view project logs" ON logs
    FOR SELECT USING (
        project_id IN (
            SELECT id FROM projects 
            WHERE user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
        )
    );

-- ============================================================================
-- VIEWS
-- ============================================================================

-- Project health summary view
CREATE OR REPLACE VIEW project_health_summary AS
SELECT 
    p.id AS project_id,
    p.name AS project_name,
    p.domain,
    p.status,
    COUNT(DISTINCT pa.id) AS total_pages,
    COUNT(DISTINCT CASE WHEN pa.status = 'published' THEN pa.id END) AS published_pages,
    COUNT(DISTINCT CASE WHEN pa.status = 'optimized' THEN pa.id END) AS optimized_pages,
    COUNT(DISTINCT l.id) AS total_leads,
    COUNT(DISTINCT ar.id) AS total_agent_runs,
    COUNT(DISTINCT CASE WHEN ar.status = 'failed' THEN ar.id END) AS failed_agent_runs,
    MAX(ar.created_at) AS last_agent_run_at,
    MAX(gs.snapshot_date) AS last_gsc_snapshot_date
FROM projects p
LEFT JOIN pages pa ON pa.project_id = p.id
LEFT JOIN leads l ON l.project_id = p.id
LEFT JOIN agent_runs ar ON ar.project_id = p.id
LEFT JOIN gsc_snapshots gs ON gs.project_id = p.id
GROUP BY p.id, p.name, p.domain, p.status;

-- Agent performance view
CREATE OR REPLACE VIEW agent_performance_summary AS
SELECT 
    agent_type,
    status,
    COUNT(*) AS run_count,
    AVG(duration_ms) AS avg_duration_ms,
    SUM(tokens_used) AS total_tokens,
    AVG(tokens_used) AS avg_tokens_per_run,
    MIN(created_at) AS first_run_at,
    MAX(created_at) AS last_run_at
FROM agent_runs
GROUP BY agent_type, status;

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to get project statistics
CREATE OR REPLACE FUNCTION get_project_stats(project_uuid UUID)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'total_pages', COUNT(DISTINCT pa.id),
        'published_pages', COUNT(DISTINCT CASE WHEN pa.status = 'published' THEN pa.id END),
        'optimized_pages', COUNT(DISTINCT CASE WHEN pa.status = 'optimized' THEN pa.id END),
        'total_leads', COUNT(DISTINCT l.id),
        'total_agent_runs', COUNT(DISTINCT ar.id),
        'failed_runs', COUNT(DISTINCT CASE WHEN ar.status = 'failed' THEN ar.id END),
        'last_activity', MAX(GREATEST(pa.updated_at, ar.updated_at))
    ) INTO result
    FROM projects p
    LEFT JOIN pages pa ON pa.project_id = p.id
    LEFT JOIN leads l ON l.project_id = p.id
    LEFT JOIN agent_runs ar ON ar.project_id = p.id
    WHERE p.id = project_uuid;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean old logs
CREATE OR REPLACE FUNCTION clean_old_logs(days_to_keep INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM logs 
    WHERE created_at < NOW() - (days_to_keep || ' days')::INTERVAL
    AND level IN ('debug', 'info');
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
