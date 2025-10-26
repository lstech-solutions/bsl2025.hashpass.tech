-- Ensure passes.id has a default so inserts without explicit id succeed
-- Use gen_random_uuid()::text to generate unique text ids

-- Enable pgcrypto if needed for gen_random_uuid (usually enabled in Supabase)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Set default on id column
ALTER TABLE public.passes
  ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;

-- Optional: comment for clarity
COMMENT ON COLUMN public.passes.id IS 'Primary key, defaults to gen_random_uuid()::text';
