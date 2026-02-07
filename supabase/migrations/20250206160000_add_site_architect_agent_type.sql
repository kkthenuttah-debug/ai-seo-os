-- Add site_architect to agent_type enum (app uses site_architect; schema had site_arch only)
DO $$ BEGIN
  ALTER TYPE agent_type ADD VALUE 'site_architect';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
