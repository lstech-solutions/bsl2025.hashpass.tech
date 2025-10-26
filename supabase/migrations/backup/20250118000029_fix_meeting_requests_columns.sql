-- Fix accept_meeting_request function to not update non-existent columns
-- The meeting_requests table doesn't have meeting_link, meeting_location, or meeting_scheduled_at columns
-- These should only be stored in the meetings table

CREATE OR REPLACE FUNCTION accept_meeting_request(
    p_meeting_request_id UUID,
    p_speaker_id TEXT,
    p_scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_location TEXT DEFAULT NULL,
    p_meeting_link TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    request_record public.meeting_requests%ROWTYPE;
    new_meeting_id UUID;
    speaker_user_id UUID;
    result JSON;
BEGIN
    -- Get the meeting request details
    SELECT * INTO request_record
    FROM public.meeting_requests
    WHERE id = p_meeting_request_id
    AND speaker_id = p_speaker_id
    AND status = 'pending';

    IF NOT FOUND THEN
        result := json_build_object(
            'success', false,
            'error', 'Meeting request not found or already processed',
            'message', 'The meeting request could not be found or has already been processed'
        );
        RETURN result;
    END IF;

    -- Get speaker's user_id
    SELECT user_id INTO speaker_user_id FROM public.bsl_speakers WHERE id = p_speaker_id;

    IF speaker_user_id IS NULL THEN
        result := json_build_object(
            'success', false,
            'error', 'Speaker user ID not found',
            'message', 'Could not find user associated with speaker'
        );
        RETURN result;
    END IF;

    -- Create the meeting
    INSERT INTO public.meetings (
        meeting_request_id,
        speaker_id,
        requester_id,
        speaker_name,
        requester_name,
        requester_company,
        requester_title,
        meeting_type,
        scheduled_at,
        duration_minutes,
        location,
        meeting_link,
        notes
    ) VALUES (
        p_meeting_request_id,
        p_speaker_id,
        request_record.requester_id,
        request_record.speaker_name,
        request_record.requester_name,
        request_record.requester_company,
        request_record.requester_title,
        request_record.meeting_type,
        COALESCE(p_scheduled_at, NOW() + INTERVAL '1 day'),
        COALESCE(request_record.duration_minutes, 15),
        p_location,
        p_meeting_link,
        p_notes
    ) RETURNING id INTO new_meeting_id;

    -- Update the meeting request status and link it to the meeting
    -- Only update columns that actually exist in meeting_requests table
    UPDATE public.meeting_requests
    SET status = 'accepted',
        meeting_id = new_meeting_id,
        updated_at = NOW(),
        speaker_response = p_notes
    WHERE id = p_meeting_request_id;

    -- Add participants
    INSERT INTO public.meeting_participants (meeting_id, user_id, user_type)
    VALUES 
        (new_meeting_id, request_record.requester_id, 'requester'),
        (new_meeting_id, speaker_user_id, 'speaker');

    -- Create notifications with proper titles
    INSERT INTO public.notifications (user_id, type, title, message, meeting_id, sender_id)
    VALUES 
        (request_record.requester_id, 'meeting_accepted', 
         'Meeting Request Accepted', 
         'Your meeting request with ' || request_record.speaker_name || ' has been accepted!', 
         new_meeting_id, speaker_user_id),
        (speaker_user_id, 'meeting_created',
         'Meeting Created',
         'You have accepted a meeting with ' || request_record.requester_name || '. Coordinate details in the chat.',
         new_meeting_id, request_record.requester_id);

    result := json_build_object(
        'success', true,
        'meeting_id', new_meeting_id,
        'meeting_request_id', p_meeting_request_id,
        'message', 'Meeting accepted and created successfully'
    );
    RETURN result;

EXCEPTION
    WHEN OTHERS THEN
        result := json_build_object(
            'success', false,
            'error', SQLERRM,
            'message', 'Failed to accept meeting request'
        );
        RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION accept_meeting_request(UUID, TEXT, TIMESTAMP WITH TIME ZONE, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION accept_meeting_request(UUID, TEXT, TIMESTAMP WITH TIME ZONE, TEXT, TEXT, TEXT) TO anon;
