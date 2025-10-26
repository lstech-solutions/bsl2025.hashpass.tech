-- Remove all problematic triggers that are causing foreign key constraint issues
-- These triggers are trying to insert into meeting_chats but causing conflicts

-- Drop all triggers on meeting_requests table
DROP TRIGGER IF EXISTS trigger_update_meeting_priority ON public.meeting_requests;
DROP TRIGGER IF EXISTS trigger_notify_meeting_request_created ON public.meeting_requests;
DROP TRIGGER IF EXISTS trigger_notify_meeting_status_change ON public.meeting_requests;
DROP TRIGGER IF EXISTS trigger_create_speed_dating_chat ON public.meeting_requests;
DROP TRIGGER IF EXISTS trigger_create_meeting_chat ON public.meeting_requests;

-- Drop all trigger functions
DROP FUNCTION IF EXISTS update_meeting_priority();
DROP FUNCTION IF EXISTS notify_meeting_request_created();
DROP FUNCTION IF EXISTS notify_meeting_status_change();
DROP FUNCTION IF EXISTS create_speed_dating_chat();
DROP FUNCTION IF EXISTS create_meeting_chat();

-- The meeting system will work without these triggers
-- We'll handle notifications and chat messages manually in the application code
