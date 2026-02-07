-- Add 'building' to project_status enum so start-loop can set status when automation runs
ALTER TYPE project_status ADD VALUE IF NOT EXISTS 'building';
