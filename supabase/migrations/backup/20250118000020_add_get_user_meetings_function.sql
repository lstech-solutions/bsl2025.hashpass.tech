-- Add get_user_meetings function for the schedule view
-- This function retrieves all meetings for a user (both as requester and speaker)

CREATE OR REPLACE FUNCTION get_user_meetings(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    meetings_array JSON;
    result JSON;
BEGIN
    -- Get meetings where user is either requester or speaker
    SELECT json_agg(
        json_build_object(
            'id', m.id,
            'meeting_request_id', m.meeting_request_id,
            'speaker_id', m.speaker_id,
            'requester_id', m.requester_id,
            'speaker_name', m.speaker_name,
            'requester_name', m.requester_name,
            'requester_company', m.requester_company,
            'requester_title', m.requester_title,
            'meeting_type', m.meeting_type,
            'scheduled_at', m.scheduled_at,
            'duration_minutes', m.duration_minutes,
            'location', m.location,
            'meeting_link', m.meeting_link,
            'notes', m.notes,
            'status', m.status,
            'created_at', m.created_at,
            'updated_at', m.updated_at
        ) ORDER BY m.scheduled_at DESC NULLS LAST, m.created_at DESC
    )
    INTO meetings_array
    FROM public.meetings m
    WHERE m.requester_id = p_user_id
       OR m.speaker_id IN (SELECT id FROM public.bsl_speakers WHERE user_id = p_user_id);

    IF meetings_array IS NULL THEN
        meetings_array := '[]'::json;
    END IF;

    result := json_build_object(
        'success', true,
        'meetings', meetings_array,
        'message', 'User meetings fetched successfully'
    );
    RETURN result;

EXCEPTION
    WHEN OTHERS THEN
        result := json_build_object(
            'success', false,
            'error', SQLERRM,
            'message', 'Failed to fetch user meetings'
        );
        RETURN result;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_user_meetings(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_meetings(UUID) TO anon;

-- Add comment
COMMENT ON FUNCTION get_user_meetings IS 'Gets all meetings for a user (both as requester and speaker) for the schedule view';
