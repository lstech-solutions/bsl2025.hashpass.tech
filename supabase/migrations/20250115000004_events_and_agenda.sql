-- Create events table
CREATE TABLE IF NOT EXISTS public.events (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    domain TEXT NOT NULL,
    event_type TEXT NOT NULL CHECK (event_type IN ('hashpass', 'whitelabel')),
    features TEXT[] DEFAULT '{}',
    branding JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create event_agenda table
CREATE TABLE IF NOT EXISTS public.event_agenda (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    time TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    speakers TEXT[],
    type TEXT NOT NULL CHECK (type IN ('keynote', 'panel', 'break', 'meal', 'registration')),
    location TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_events_domain ON public.events(domain);
CREATE INDEX IF NOT EXISTS idx_events_type ON public.events(event_type);
CREATE INDEX IF NOT EXISTS idx_event_agenda_event_id ON public.event_agenda(event_id);
CREATE INDEX IF NOT EXISTS idx_event_agenda_type ON public.event_agenda(type);

-- Enable RLS
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_agenda ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for events
CREATE POLICY "Events are viewable by everyone" ON public.events
    FOR SELECT USING (true);

CREATE POLICY "Events are insertable by service role" ON public.events
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Events are updatable by service role" ON public.events
    FOR UPDATE USING (true);

-- Create RLS policies for event_agenda
CREATE POLICY "Event agenda is viewable by everyone" ON public.event_agenda
    FOR SELECT USING (true);

CREATE POLICY "Event agenda is insertable by service role" ON public.event_agenda
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Event agenda is updatable by service role" ON public.event_agenda
    FOR UPDATE USING (true);

-- Create updated_at trigger for events
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON public.events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_event_agenda_updated_at BEFORE UPDATE ON public.event_agenda
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
