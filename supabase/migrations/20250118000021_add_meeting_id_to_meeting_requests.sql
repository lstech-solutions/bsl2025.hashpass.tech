-- Add meeting_id column to meeting_requests table
-- This column will link meeting requests to their created meetings

ALTER TABLE public.meeting_requests 
ADD COLUMN IF NOT EXISTS meeting_id UUID REFERENCES public.meetings(id) ON DELETE SET NULL;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_meeting_requests_meeting_id ON public.meeting_requests(meeting_id);

-- Add comment
COMMENT ON COLUMN public.meeting_requests.meeting_id IS 'Links to the meeting created when this request is accepted';
