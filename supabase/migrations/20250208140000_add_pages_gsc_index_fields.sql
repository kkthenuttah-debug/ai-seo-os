-- Store GSC URL Inspection result for each page: last crawl time and index status
ALTER TABLE pages
  ADD COLUMN IF NOT EXISTS gsc_last_crawl_time TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS gsc_index_status TEXT;

COMMENT ON COLUMN pages.gsc_last_crawl_time IS 'Last time Google crawled this URL (from GSC URL Inspection).';
COMMENT ON COLUMN pages.gsc_index_status IS 'Index status from GSC URL Inspection (e.g. PASS, FAIL, NEUTRAL or coverageState).';
