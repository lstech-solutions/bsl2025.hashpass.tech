-- Add get_speaker_meeting_requests function for speaker dashboard
-- This function returns meeting requests for a specific speaker

CREATE OR REPLACE FUNCTION get_speaker_meeting_requests(p_speaker_id text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    requests json;
BEGIN
    -- Get meeting requests for the speaker
    SELECT json_agg(
        json_build_object(
            'id', id,
            'requester_id', requester_id,
            'speaker_id', speaker_id,
            'speaker_name', speaker_name,
            'requester_name', requester_name,
            'requester_company', requester_company,
            'requester_title', requester_title,
            'requester_ticket_type', requester_ticket_type,
            'meeting_type', meeting_type,
            'message', message,
            'note', note,
            'boost_amount', boost_amount,
            'duration_minutes', duration_minutes,
            'status', status,
            'created_at', created_at,
            'updated_at', updated_at,
            'expires_at', expires_at
        )
        ORDER BY created_at DESC
    ) INTO requests
    FROM meeting_requests
    WHERE speaker_id = p_speaker_id;
    
    -- Return success response
    RETURN json_build_object(
        'success', true,
        'requests', COALESCE(requests, '[]'::json)
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM,
            'requests', '[]'::json
        );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_speaker_meeting_requests(text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_speaker_meeting_requests(text) TO anon;

-- Add comment
COMMENT ON FUNCTION get_speaker_meeting_requests(text) IS 'Returns meeting requests for a specific speaker';
