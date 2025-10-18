-- Fix meetings table structure to ensure it exists with correct columns
-- This migration ensures the meetings table has all required columns

-- Create meetings table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.meetings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_request_id UUID REFERENCES public.meeting_requests(id) ON DELETE SET NULL,
    speaker_id TEXT REFERENCES public.bsl_speakers(id) ON DELETE SET NULL,
    requester_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    speaker_name TEXT NOT NULL,
    requester_name TEXT NOT NULL,
    requester_company TEXT,
    requester_title TEXT,
    meeting_type TEXT DEFAULT 'networking',
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show')),
    scheduled_at TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER DEFAULT 15,
    location TEXT,
    meeting_link TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create meeting_participants table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.meeting_participants (
    meeting_id UUID REFERENCES public.meetings(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    user_type TEXT NOT NULL CHECK (user_type IN ('speaker', 'requester')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (meeting_id, user_id)
);

-- Create meeting_chats table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.meeting_chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id UUID REFERENCES public.meetings(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    sender_type TEXT NOT NULL CHECK (sender_type IN ('speaker', 'requester', 'system')),
    message TEXT NOT NULL,
    message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'system', 'meeting_update')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read_by_speaker BOOLEAN DEFAULT FALSE,
    read_by_requester BOOLEAN DEFAULT FALSE
);

-- Enable RLS on all tables
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_chats ENABLE ROW LEVEL SECURITY;

-- Add basic RLS policies (drop and recreate to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their meetings" ON public.meetings;
CREATE POLICY "Users can view their meetings" ON public.meetings
    FOR SELECT USING (requester_id = auth.uid() OR speaker_id IN (SELECT id FROM public.bsl_speakers WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can view their meeting participants" ON public.meeting_participants;
CREATE POLICY "Users can view their meeting participants" ON public.meeting_participants
    FOR SELECT USING (user_id = auth.uid() OR meeting_id IN (SELECT id FROM public.meetings WHERE speaker_id IN (SELECT id FROM public.bsl_speakers WHERE user_id = auth.uid())));

DROP POLICY IF EXISTS "Users can view their meeting chats" ON public.meeting_chats;
CREATE POLICY "Users can view their meeting chats" ON public.meeting_chats
    FOR SELECT USING (meeting_id IN (SELECT meeting_id FROM public.meeting_participants WHERE user_id = auth.uid()));
