-- Fix notifications table title constraint
-- Make title column nullable since some notifications don't need titles

ALTER TABLE public.notifications 
ALTER COLUMN title DROP NOT NULL;

-- Add a default value for existing records that might have NULL titles
UPDATE public.notifications 
SET title = COALESCE(title, 'Notification')
WHERE title IS NULL;

-- Add comment
COMMENT ON COLUMN public.notifications.title IS 'Title of the notification (optional)';
