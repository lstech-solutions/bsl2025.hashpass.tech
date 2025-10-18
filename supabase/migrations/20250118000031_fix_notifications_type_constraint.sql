-- Fix notifications type constraint
-- First, let's see what the current constraint allows
-- Then update it to include our meeting-related notification types

-- Check current constraint (using pg_get_constraintdef for newer PostgreSQL)
SELECT conname, pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conname LIKE '%notifications%type%' 
AND conrelid = 'public.notifications'::regclass;

-- Drop the existing constraint if it exists
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Create a new constraint that includes meeting-related types
ALTER TABLE public.notifications 
ADD CONSTRAINT notifications_type_check 
CHECK (type IN (
    'meeting_request', 
    'meeting_accepted', 
    'meeting_declined', 
    'meeting_created',
    'meeting_reminder',
    'meeting_cancelled',
    'system_alert',
    'general',
    'urgent',
    'info',
    'success',
    'warning',
    'error'
));

-- Add comment
COMMENT ON CONSTRAINT notifications_type_check ON public.notifications IS 'Valid notification types including meeting-related notifications';
