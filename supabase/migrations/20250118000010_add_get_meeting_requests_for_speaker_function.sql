-- Add get_meeting_requests_for_speaker function for speaker dashboard
-- This function returns meeting requests for a specific speaker

CREATE OR REPLACE FUNCTION get_meeting_requests_for_speaker(
    p_speaker_id text,
    p_user_id text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    requests json;
BEGIN
    -- Get meeting requests for the speaker
    -- If p_user_id is provided, also filter by requester_id for user's own requests
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
    WHERE speaker_id = p_speaker_id
    AND (p_user_id IS NULL OR requester_id::text = p_user_id);
    
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
GRANT EXECUTE ON FUNCTION get_meeting_requests_for_speaker(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_meeting_requests_for_speaker(text, text) TO anon;

-- Add comment
COMMENT ON FUNCTION get_meeting_requests_for_speaker(text, text) IS 'Returns meeting requests for a specific speaker';
