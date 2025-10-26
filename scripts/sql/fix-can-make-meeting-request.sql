-- Fix can_make_meeting_request function to work with real counts
CREATE OR REPLACE FUNCTION can_make_meeting_request(
    p_user_id text,
    p_speaker_id text,
    p_boost_amount numeric DEFAULT 0
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    pass_record RECORD;
    total_requests integer;
    remaining_requests integer;
    remaining_boost numeric;
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
    SELECT COUNT(*)
    INTO total_requests
    FROM public.meeting_requests 
    WHERE requester_id::text = p_user_id;
    
    -- Check if user has an active pass
    IF NOT FOUND THEN
        result := json_build_object(
            'can_request', false, 
            'reason', 'No active pass found',
            'pass_type', null,
            'remaining_requests', 0,
            'remaining_boost', 0,
            'total_requests', total_requests
        );
        RETURN result;
    END IF;
    
    -- Check if pass is active
    IF pass_record.status != 'active' THEN
        result := json_build_object(
            'can_request', false, 
            'reason', 'Pass is not active',
            'pass_type', pass_record.pass_type,
            'remaining_requests', 0,
            'remaining_boost', 0,
            'total_requests', total_requests
        );
        RETURN result;
    END IF;
    
    -- Calculate remaining requests and boost using real counts
    remaining_requests := GREATEST(0, COALESCE(pass_record.max_meeting_requests, 0) - total_requests);
    remaining_boost := GREATEST(0, COALESCE(pass_record.max_boost_amount, 0) - COALESCE(pass_record.used_boost_amount, 0));
    
    -- Check remaining requests
    IF remaining_requests <= 0 THEN
        result := json_build_object(
            'can_request', false, 
            'reason', 'No remaining meeting requests',
            'pass_type', pass_record.pass_type,
            'remaining_requests', remaining_requests,
            'remaining_boost', remaining_boost,
            'total_requests', total_requests
        );
        RETURN result;
    END IF;
    
    -- Check boost amount
    IF p_boost_amount > remaining_boost THEN
        result := json_build_object(
            'can_request', false, 
            'reason', 'Insufficient boost amount',
            'pass_type', pass_record.pass_type,
            'remaining_requests', remaining_requests,
            'remaining_boost', remaining_boost,
            'total_requests', total_requests
        );
        RETURN result;
    END IF;
    
    -- All checks passed
    result := json_build_object(
        'can_request', true, 
        'reason', 'Request allowed',
        'pass_type', pass_record.pass_type,
        'remaining_requests', remaining_requests,
        'remaining_boost', remaining_boost,
        'total_requests', total_requests
    );
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        result := json_build_object(
            'can_request', false, 
            'reason', 'Error checking pass: ' || SQLERRM,
            'pass_type', null,
            'remaining_requests', 0,
            'remaining_boost', 0,
            'total_requests', 0
        );
        RETURN result;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION can_make_meeting_request(text,text,numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION can_make_meeting_request(text,text,numeric) TO anon;

-- Verify function exists
SELECT 'can_make_meeting_request function created successfully' as status;
