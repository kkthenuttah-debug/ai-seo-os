-- Unique constraint required for gsc_snapshots upsert (ON CONFLICT project_id, query, page, snapshot_date).
-- NULLS NOT DISTINCT ensures one summary row per (project_id, snapshot_date) when query/page are NULL (PostgreSQL 15+).
CREATE UNIQUE INDEX IF NOT EXISTS gsc_snapshots_project_query_page_date_key
  ON gsc_snapshots (project_id, query, page, snapshot_date) NULLS NOT DISTINCT;
