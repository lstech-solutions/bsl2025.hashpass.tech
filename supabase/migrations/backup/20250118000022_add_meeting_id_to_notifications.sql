-- Add meeting_id column to notifications table
-- This column will link notifications to their related meetings

ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS meeting_id UUID REFERENCES public.meetings(id) ON DELETE SET NULL;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_meeting_id ON public.notifications(meeting_id);

-- Add comment
COMMENT ON COLUMN public.notifications.meeting_id IS 'Links to the meeting this notification is about';
