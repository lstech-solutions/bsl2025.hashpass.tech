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

-- Update the RLS policy to work with the new constraint
DROP POLICY IF EXISTS "Users can view their own meeting requests" ON meeting_requests;
DROP POLICY IF EXISTS "Speakers can update their meeting requests" ON meeting_requests;

-- Create new policies that work with BSL_Speakers
CREATE POLICY "Users can view their own meeting requests" ON meeting_requests
    FOR SELECT USING (auth.uid() = requester_id);

CREATE POLICY "Users can create meeting requests" ON meeting_requests
    FOR INSERT WITH CHECK (auth.uid() = requester_id);

-- Note: We can't easily create a policy for speakers to update their requests
-- since speakers are not in auth.users. This would need to be handled differently
-- or speakers would need to be added to auth.users if they need to manage requests.
