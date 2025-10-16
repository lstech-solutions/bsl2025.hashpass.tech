-- Fix meeting_requests speaker_id foreign key constraint
-- Allow speaker_id to reference BSL_Speakers instead of auth.users

-- First, drop the existing foreign key constraint
ALTER TABLE meeting_requests 
DROP CONSTRAINT IF EXISTS meeting_requests_speaker_id_fkey;

-- Change speaker_id to TEXT to match BSL_Speakers.id format
ALTER TABLE meeting_requests 
ALTER COLUMN speaker_id TYPE TEXT;

-- Add a new foreign key constraint to reference BSL_Speakers
ALTER TABLE meeting_requests 
ADD CONSTRAINT meeting_requests_speaker_id_fkey 
FOREIGN KEY (speaker_id) REFERENCES BSL_Speakers(id) ON DELETE CASCADE;
