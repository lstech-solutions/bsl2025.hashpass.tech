-- Add sender_id column to notifications table
-- This column will identify who sent the notification

ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_sender_id ON public.notifications(sender_id);

-- Add comment
COMMENT ON COLUMN public.notifications.sender_id IS 'User who sent this notification';
