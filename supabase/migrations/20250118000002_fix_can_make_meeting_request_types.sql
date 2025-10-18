-- Fix type mismatch in can_make_meeting_request function
-- The function expects uuid but passes.user_id is text

CREATE OR REPLACE FUNCTION can_make_meeting_request(
    p_user_id uuid,
    p_speaker_id text,
    p_boost_amount numeric DEFAULT 0
)
RETURNS TABLE(
    can_request boolean,
    reason text,
    pass_type pass_type,
    remaining_requests integer,
    remaining_boost numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_pass RECORD;
    limits RECORD;
    is_blocked BOOLEAN;
BEGIN
    -- Check if user is blocked by speaker
    SELECT EXISTS(
        SELECT 1 FROM user_blocks
        WHERE speaker_id = p_speaker_id
        AND blocked_user_id = p_user_id
    ) INTO is_blocked;

    IF is_blocked THEN
        RETURN QUERY SELECT false, 'User is blocked by this speaker', null::pass_type, 0, 0.00;
        RETURN;
    END IF;

    -- Get user's pass (cast uuid to text for comparison)
    SELECT * INTO user_pass
    FROM passes
    WHERE user_id = p_user_id::text
    AND event_id = 'bsl2025'
    AND status = 'active';

    IF user_pass IS NULL THEN
        RETURN QUERY SELECT false, 'No active pass found', null::pass_type, 0, 0.00;
        RETURN;
    END IF;

    -- Get limits for pass type
    SELECT * INTO limits FROM get_pass_type_limits(user_pass.pass_type);

    -- Check if user has remaining requests
    IF user_pass.used_meeting_requests >= user_pass.max_meeting_requests THEN
        RETURN QUERY SELECT false, 'No remaining meeting requests', user_pass.pass_type, 0, user_pass.max_boost_amount - user_pass.used_boost_amount;
        RETURN;
    END IF;

    -- Check if user has enough boost amount
    IF p_boost_amount > 0 AND (user_pass.used_boost_amount + p_boost_amount) > user_pass.max_boost_amount THEN
        RETURN QUERY SELECT false, 'Insufficient boost amount available', user_pass.pass_type, user_pass.max_meeting_requests - user_pass.used_meeting_requests, user_pass.max_boost_amount - user_pass.used_boost_amount;
        RETURN;
    END IF;

    -- All checks passed
    RETURN QUERY SELECT true, 'Can make request', user_pass.pass_type, user_pass.max_meeting_requests - user_pass.used_meeting_requests, user_pass.max_boost_amount - user_pass.used_boost_amount;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION can_make_meeting_request(uuid, text, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION can_make_meeting_request(uuid, text, numeric) TO anon;

-- Add comment
COMMENT ON FUNCTION can_make_meeting_request(uuid, text, numeric) IS 'Checks if a user can make a meeting request with proper type casting';
