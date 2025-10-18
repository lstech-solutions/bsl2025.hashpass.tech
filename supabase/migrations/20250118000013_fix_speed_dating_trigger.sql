-- Remove the problematic speed_dating_chat trigger
-- Our accept_meeting_request function already handles creating meetings and chat messages
-- The trigger was causing conflicts and is not needed

-- Drop the old trigger and function
DROP TRIGGER IF EXISTS trigger_create_speed_dating_chat ON public.meeting_requests;
DROP TRIGGER IF EXISTS trigger_create_meeting_chat ON public.meeting_requests;
DROP FUNCTION IF EXISTS create_speed_dating_chat();
DROP FUNCTION IF EXISTS create_meeting_chat();
