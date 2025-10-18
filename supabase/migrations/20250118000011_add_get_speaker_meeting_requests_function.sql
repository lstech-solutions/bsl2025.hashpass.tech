-- Add get_speaker_meeting_requests function for speaker dashboard
-- This is an alias for get_meeting_requests_for_speaker for backward compatibility

CREATE OR REPLACE FUNCTION get_speaker_meeting_requests(p_speaker_id text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Call the main function with just speaker_id
    RETURN get_meeting_requests_for_speaker(p_speaker_id, NULL);
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_speaker_meeting_requests(text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_speaker_meeting_requests(text) TO anon;

-- Add comment
COMMENT ON FUNCTION get_speaker_meeting_requests(text) IS 'Alias for get_meeting_requests_for_speaker for backward compatibility';
