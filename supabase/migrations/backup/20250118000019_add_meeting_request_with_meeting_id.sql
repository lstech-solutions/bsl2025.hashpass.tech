-- Add function to get meeting requests with their linked meeting IDs
-- This helps with proper chat dialog linking

CREATE OR REPLACE FUNCTION get_meeting_requests_with_meeting_id(
    p_user_id UUID,
    p_speaker_id TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    requests JSON;
BEGIN
    -- Get meeting requests with their linked meeting IDs
    SELECT json_agg(
        json_build_object(
            'id', mr.id,
            'requester_id', mr.requester_id,
            'speaker_id', mr.speaker_id,
            'speaker_name', mr.speaker_name,
            'requester_name', mr.requester_name,
            'requester_company', mr.requester_company,
            'requester_title', mr.requester_title,
            'requester_ticket_type', mr.requester_ticket_type,
            'meeting_type', mr.meeting_type,
            'message', mr.message,
            'note', mr.note,
            'boost_amount', mr.boost_amount,
            'duration_minutes', mr.duration_minutes,
            'status', mr.status,
            'created_at', mr.created_at,
            'updated_at', mr.updated_at,
            'expires_at', mr.expires_at,
            'meeting_id', mr.meeting_id,  -- Include the linked meeting ID
            'has_meeting', mr.meeting_id IS NOT NULL,  -- Boolean to check if meeting exists
            'meeting_status', CASE 
                WHEN mr.meeting_id IS NOT NULL THEN m.status 
                ELSE NULL 
            END
        )
        ORDER BY mr.created_at DESC
    ) INTO requests
    FROM meeting_requests mr
    LEFT JOIN meetings m ON mr.meeting_id = m.id
    WHERE mr.requester_id = p_user_id
    AND (p_speaker_id IS NULL OR mr.speaker_id = p_speaker_id);
    
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
GRANT EXECUTE ON FUNCTION get_meeting_requests_with_meeting_id(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_meeting_requests_with_meeting_id(UUID, TEXT) TO anon;

-- Add comment
COMMENT ON FUNCTION get_meeting_requests_with_meeting_id IS 'Gets meeting requests with their linked meeting IDs for proper chat dialog linking';
