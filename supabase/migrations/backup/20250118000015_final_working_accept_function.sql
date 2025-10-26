-- Final working version of accept_meeting_request function
-- This version works around the foreign key constraint issue

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
    request_record RECORD;
    new_meeting_id UUID;
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

    -- Update the meeting request status
    UPDATE public.meeting_requests
    SET status = 'accepted',
        updated_at = NOW()
    WHERE id = p_meeting_request_id;

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

    -- Add participants
    INSERT INTO public.meeting_participants (meeting_id, user_id, user_type)
    VALUES 
        (new_meeting_id, request_record.requester_id, 'requester'),
        (new_meeting_id, (SELECT user_id FROM public.bsl_speakers WHERE id = p_speaker_id), 'speaker');

    -- Create notifications (without meeting_id for now to avoid foreign key issues)
    INSERT INTO public.notifications (user_id, type, message, sender_id)
    VALUES 
        (request_record.requester_id, 'meeting_accepted', 
         'Your meeting request with ' || request_record.speaker_name || ' has been accepted!', 
         (SELECT user_id FROM public.bsl_speakers WHERE id = p_speaker_id)),
        ((SELECT user_id FROM public.bsl_speakers WHERE id = p_speaker_id), 'meeting_created',
         'You have accepted a meeting with ' || request_record.requester_name || '. Coordinate details in the chat.',
         request_record.requester_id);

    result := json_build_object(
        'success', true,
        'meeting_id', new_meeting_id,
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

-- Also create a function to add the initial chat message after meeting creation
CREATE OR REPLACE FUNCTION add_meeting_chat_message(
    p_meeting_id UUID,
    p_sender_id UUID,
    p_message TEXT,
    p_message_type TEXT DEFAULT 'system'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
BEGIN
    -- Insert the chat message
    INSERT INTO public.meeting_chats (meeting_id, sender_id, sender_type, message, message_type)
    VALUES (
        p_meeting_id,
        p_sender_id,
        'speaker',
        p_message,
        p_message_type
    );

    result := json_build_object(
        'success', true,
        'message', 'Chat message added successfully'
    );

    RETURN result;

EXCEPTION
    WHEN OTHERS THEN
        result := json_build_object(
            'success', false,
            'error', SQLERRM,
            'message', 'Failed to add chat message'
        );
        RETURN result;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION accept_meeting_request(UUID, TEXT, TIMESTAMP WITH TIME ZONE, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION add_meeting_chat_message(UUID, UUID, TEXT, TEXT) TO authenticated;
