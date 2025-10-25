-- Update decline_meeting_request function to include notification titles
-- This ensures consistency across all notification types

CREATE OR REPLACE FUNCTION decline_meeting_request(
    p_meeting_request_id UUID,
    p_speaker_id TEXT,
    p_reason TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    request_record public.meeting_requests%ROWTYPE;
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
    SET status = 'declined',
        updated_at = NOW(),
        speaker_response = p_reason,
        speaker_response_at = NOW()
    WHERE id = p_meeting_request_id;

    -- Create notification with proper title
    INSERT INTO public.notifications (user_id, type, title, message, meeting_request_id, sender_id)
    VALUES (
        request_record.requester_id, 
        'meeting_declined', 
        'Meeting Request Declined',
        'Your meeting request with ' || request_record.speaker_name || ' has been declined.' || 
        CASE WHEN p_reason IS NOT NULL THEN ' Reason: ' || p_reason ELSE '' END,
        p_meeting_request_id, 
        (SELECT user_id FROM public.bsl_speakers WHERE id = p_speaker_id)
    );

    result := json_build_object(
        'success', true,
        'message', 'Meeting request declined successfully'
    );
    RETURN result;

EXCEPTION
    WHEN OTHERS THEN
        result := json_build_object(
            'success', false,
            'error', SQLERRM,
            'message', 'Failed to decline meeting request'
        );
        RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION decline_meeting_request(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION decline_meeting_request(UUID, TEXT, TEXT) TO anon;
