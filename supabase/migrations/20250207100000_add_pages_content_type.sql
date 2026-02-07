-- Add content_type to pages so we can store post, page, media (from site architect)
ALTER TABLE pages
  ADD COLUMN IF NOT EXISTS content_type TEXT DEFAULT 'post';

COMMENT ON COLUMN pages.content_type IS 'Content type: post, page, media (from site architecture). page = static/WP page, post = blog post, media = media-heavy post.';
