-- Extend RLS to allow trigger (postgres) to insert rows

-- Passes table: allow inserts by postgres (trigger function runs as postgres)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'passes' AND policyname = 'system_can_insert_passes'
  ) THEN
    CREATE POLICY "system_can_insert_passes" ON public.passes
      FOR INSERT TO postgres
      WITH CHECK (true);
  END IF;
END $$;

-- Pass request limits: allow inserts by postgres as well
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'pass_request_limits' AND policyname = 'system_can_insert_pass_limits'
  ) THEN
    CREATE POLICY "system_can_insert_pass_limits" ON public.pass_request_limits
      FOR INSERT TO postgres
      WITH CHECK (true);
  END IF;
END $$;
