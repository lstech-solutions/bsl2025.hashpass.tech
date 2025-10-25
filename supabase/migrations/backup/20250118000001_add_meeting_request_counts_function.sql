-- Add missing get_user_meeting_request_counts function
-- This function is required for the pass system to work properly

CREATE OR REPLACE FUNCTION get_user_meeting_request_counts(p_user_id text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    pass_record RECORD;
    total_requests integer;
    pending_requests integer;
    approved_requests integer;
    declined_requests integer;
    cancelled_requests integer;
    result json;
BEGIN
    -- Get user's pass information
    SELECT p.id, p.pass_type::text, p.status::text, p.pass_number, 
           p.max_meeting_requests, p.used_meeting_requests, 
           p.max_boost_amount, p.used_boost_amount
    INTO pass_record
    FROM public.passes p 
    WHERE p.user_id::text = p_user_id
      AND p.event_id = 'bsl2025' 
      AND p.status = 'active' 
    LIMIT 1;
    
    -- Count actual meeting requests from database
    SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'accepted' OR status = 'approved' THEN 1 END) as approved,
        COUNT(CASE WHEN status = 'declined' THEN 1 END) as declined,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled
    INTO total_requests, pending_requests, approved_requests, declined_requests, cancelled_requests
    FROM public.meeting_requests 
    WHERE requester_id::text = p_user_id;
    
    -- If no pass found, return default values
    IF NOT FOUND THEN
        result := json_build_object(
            'pass_type', null,
            'max_requests', 0,
            'total_requests', total_requests,
            'pending_requests', pending_requests,
            'approved_requests', approved_requests,
            'declined_requests', declined_requests,
            'cancelled_requests', cancelled_requests,
            'remaining_requests', 0,
            'max_boost', 0,
            'used_boost', 0,
            'remaining_boost', 0
        );
        RETURN result;
    END IF;
    
    -- Calculate remaining requests (max - total actual requests)
    DECLARE
        remaining_requests integer;
        remaining_boost numeric;
    BEGIN
        remaining_requests := GREATEST(0, COALESCE(pass_record.max_meeting_requests, 0) - total_requests);
        remaining_boost := GREATEST(0, COALESCE(pass_record.max_boost_amount, 0) - COALESCE(pass_record.used_boost_amount, 0));
        
        result := json_build_object(
            'pass_type', pass_record.pass_type,
            'max_requests', pass_record.max_meeting_requests,
            'total_requests', total_requests,
            'pending_requests', pending_requests,
            'approved_requests', approved_requests,
            'declined_requests', declined_requests,
            'cancelled_requests', cancelled_requests,
            'remaining_requests', remaining_requests,
            'max_boost', pass_record.max_boost_amount,
            'used_boost', pass_record.used_boost_amount,
            'remaining_boost', remaining_boost
        );
        RETURN result;
    END;
    
EXCEPTION
    WHEN OTHERS THEN
        result := json_build_object(
            'pass_type', null,
            'max_requests', 0,
            'total_requests', 0,
            'pending_requests', 0,
            'approved_requests', 0,
            'declined_requests', 0,
            'cancelled_requests', 0,
            'remaining_requests', 0,
            'max_boost', 0,
            'used_boost', 0,
            'remaining_boost', 0,
            'error', SQLERRM
        );
        RETURN result;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_user_meeting_request_counts(text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_meeting_request_counts(text) TO anon;

-- Add comment
COMMENT ON FUNCTION get_user_meeting_request_counts(text) IS 'Returns meeting request counts and pass information for a user';
