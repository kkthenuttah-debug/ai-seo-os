-- Add page_status values used by the app (ready = built, publishing = in progress, error = failed)
DO $$ BEGIN
  ALTER TYPE page_status ADD VALUE 'ready';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE page_status ADD VALUE 'publishing';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE page_status ADD VALUE 'error';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
