-- Fix notifications table structure to include all required columns
-- This migration ensures the notifications table has all columns used by various functions

-- First, let's see what columns we need based on the function usage:
-- user_id, type, message, meeting_id, sender_id, meeting_request_id, speaker_id, title, is_urgent

-- Add missing columns to notifications table
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS meeting_request_id UUID REFERENCES public.meeting_requests(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS speaker_id TEXT REFERENCES public.bsl_speakers(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS is_urgent BOOLEAN DEFAULT FALSE;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_meeting_request_id ON public.notifications(meeting_request_id);
CREATE INDEX IF NOT EXISTS idx_notifications_speaker_id ON public.notifications(speaker_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);

-- Add comments
COMMENT ON COLUMN public.notifications.meeting_request_id IS 'Links to the meeting request this notification is about';
COMMENT ON COLUMN public.notifications.speaker_id IS 'Links to the speaker this notification is about';
COMMENT ON COLUMN public.notifications.title IS 'Title of the notification';
COMMENT ON COLUMN public.notifications.is_urgent IS 'Whether this notification is urgent';
