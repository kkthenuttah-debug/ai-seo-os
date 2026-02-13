-- Step-by-step run log for live streaming in Agents Monitor
ALTER TABLE agent_runs
ADD COLUMN IF NOT EXISTS run_log TEXT[] DEFAULT '{}';

COMMENT ON COLUMN agent_runs.run_log IS 'Step-by-step log lines (e.g. "Analyzing content…") for live UI';
