-- Monitor runs: store health_score, alerts, trends, recommendations from monitor agent
CREATE TABLE IF NOT EXISTS monitor_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    health_score INTEGER CHECK (health_score IS NULL OR (health_score >= 0 AND health_score <= 100)),
    result JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE monitor_runs IS 'Monitor agent run results: health score, alerts, trends, recommendations';
COMMENT ON COLUMN monitor_runs.result IS 'Full monitor output: rankings, trends, alerts, recommendations, optimization_candidates';

CREATE INDEX IF NOT EXISTS idx_monitor_runs_project_created
 ON monitor_runs (project_id, created_at DESC);
