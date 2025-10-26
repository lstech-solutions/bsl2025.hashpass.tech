-- Create passes table
CREATE TABLE IF NOT EXISTS public.passes (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    event_id TEXT NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    pass_type TEXT NOT NULL CHECK (pass_type IN ('general', 'vip', 'business')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired', 'cancelled')),
    purchase_date TIMESTAMPTZ DEFAULT NOW(),
    price_usd DECIMAL(10,2),
    access_features TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_passes_user_id ON public.passes(user_id);
CREATE INDEX IF NOT EXISTS idx_passes_event_id ON public.passes(event_id);
CREATE INDEX IF NOT EXISTS idx_passes_pass_type ON public.passes(pass_type);
CREATE INDEX IF NOT EXISTS idx_passes_status ON public.passes(status);

-- Enable RLS
ALTER TABLE public.passes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for passes
DO $$ BEGIN
    CREATE POLICY "Users can view their own passes" ON public.passes
        FOR SELECT USING (user_id = auth.uid()::text);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can insert their own passes" ON public.passes
        FOR INSERT WITH CHECK (user_id = auth.uid()::text);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can update their own passes" ON public.passes
        FOR UPDATE USING (user_id = auth.uid()::text);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create updated_at trigger
DO $$ BEGIN
    CREATE TRIGGER update_passes_updated_at BEFORE UPDATE ON public.passes
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Insert migration record only if it doesn't exist
INSERT INTO supabase_migrations.schema_migrations(version, name, statements) 
SELECT '20250115000009', 'user_passes', ARRAY[]::text[]
WHERE NOT EXISTS (
    SELECT 1 FROM supabase_migrations.schema_migrations 
    WHERE version = '20250115000009'
);
