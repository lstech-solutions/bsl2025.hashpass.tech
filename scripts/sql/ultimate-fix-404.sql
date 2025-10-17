-- ULTIMATE FIX: Handle mixed column types properly
-- This script creates functions that work with the actual database schema

-- 1. First, let's check what column types we actually have
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name IN ('passes', 'meeting_requests', 'user_request_limits')
  AND table_schema = 'public'
  AND column_name LIKE '%_id%'
ORDER BY table_name, column_name;

-- 2. Drop the problematic functions
DROP FUNCTION IF EXISTS can_make_meeting_request(text, text, numeric);
DROP FUNCTION IF EXISTS can_make_meeting_request(uuid, text, numeric);
DROP FUNCTION IF EXISTS insert_meeting_request(text, text, text, text, text, text, text, text, text, numeric, integer, timestamp with time zone);
DROP FUNCTION IF EXISTS insert_meeting_request(uuid, text, text, text, text, text, text, text, text, numeric, integer, timestamp with time zone);

-- 3. Create a function that handles the actual column types
CREATE OR REPLACE FUNCTION can_make_meeting_request(
    p_user_id TEXT,  -- Accept TEXT input from application
    p_speaker_id TEXT,
    p_boost_amount DECIMAL(10,2) DEFAULT 0
) RETURNS TABLE(
    can_request BOOLEAN,
    reason TEXT,
    pass_type TEXT,
    remaining_requests INTEGER,
    remaining_boost DECIMAL(10,2)
) AS $$
DECLARE
    user_pass RECORD;
    existing_request RECORD;
    remaining_req INTEGER;
    remaining_boost DECIMAL(10,2);
    user_uuid UUID;
BEGIN
    -- Convert TEXT to UUID safely
    BEGIN
        user_uuid := p_user_id::UUID;
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT
            FALSE as can_request,
            'Invalid user ID format' as reason,
            NULL::TEXT as pass_type,
            0 as remaining_requests,
            0.00 as remaining_boost;
        RETURN;
    END;

    -- Check if user has an active pass - handle both TEXT and UUID columns
    -- Try UUID comparison first, then TEXT comparison
    SELECT 
        p.id, p.pass_type::text, p.status::text, p.pass_number,
        p.max_meeting_requests, p.used_meeting_requests,
        p.max_boost_amount, p.used_boost_amount
    INTO user_pass
    FROM public.passes p
    WHERE (
        -- If user_id is UUID type
        (p.user_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' AND p.user_id = user_uuid)
        OR
        -- If user_id is TEXT type
        (p.user_id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' AND p.user_id::text = p_user_id)
    )
      AND p.event_id = 'bsl2025' 
      AND p.status = 'active'
    LIMIT 1;

    -- If no active pass found
    IF user_pass IS NULL THEN
        RETURN QUERY SELECT
            FALSE as can_request,
            'No active pass found' as reason,
            NULL::TEXT as pass_type,
            0 as remaining_requests,
            0.00 as remaining_boost;
        RETURN;
    END IF;

    -- Check if there's already a pending or approved request to this speaker
    -- Handle both TEXT and UUID columns
    SELECT * INTO existing_request
    FROM public.meeting_requests mr
    WHERE (
        -- If requester_id is UUID type
        (mr.requester_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' AND mr.requester_id = user_uuid)
        OR
        -- If requester_id is TEXT type
        (mr.requester_id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' AND mr.requester_id::text = p_user_id)
    )
      AND mr.speaker_id = p_speaker_id 
      AND mr.status IN ('pending', 'approved')
    LIMIT 1;

    IF existing_request IS NOT NULL THEN
        RETURN QUERY SELECT
            FALSE as can_request,
            'You already have a pending or approved request to this speaker' as reason,
            user_pass.pass_type::TEXT as pass_type,
            (user_pass.max_meeting_requests - user_pass.used_meeting_requests) as remaining_requests,
            (user_pass.max_boost_amount - user_pass.used_boost_amount) as remaining_boost;
        RETURN;
    END IF;

    -- Calculate remaining requests and boost
    remaining_req := user_pass.max_meeting_requests - user_pass.used_meeting_requests;
    remaining_boost := user_pass.max_boost_amount - user_pass.used_boost_amount;

    -- Check if user has enough requests left
    IF remaining_req <= 0 THEN
        RETURN QUERY SELECT
            FALSE as can_request,
            'No meeting requests remaining' as reason,
            user_pass.pass_type::TEXT as pass_type,
            remaining_req as remaining_requests,
            remaining_boost as remaining_boost;
        RETURN;
    END IF;

    -- All checks passed - user can make the request
    RETURN QUERY SELECT
        TRUE as can_request,
        'Request allowed' as reason,
        user_pass.pass_type::TEXT as pass_type,
        remaining_req as remaining_requests,
        remaining_boost as remaining_boost;
END;
$$ LANGUAGE plpgsql;

-- 4. Create insert_meeting_request function that handles mixed types
CREATE OR REPLACE FUNCTION insert_meeting_request(
    p_requester_id TEXT,  -- Accept TEXT input from application
    p_speaker_id TEXT,
    p_speaker_name TEXT,
    p_requester_name TEXT,
    p_requester_company TEXT,
    p_requester_title TEXT,
    p_requester_ticket_type TEXT,
    p_meeting_type TEXT,
    p_message TEXT,
    p_boost_amount DECIMAL(10,2) DEFAULT 0,
    p_duration_minutes INTEGER DEFAULT 30,
    p_expires_at TIMESTAMPTZ DEFAULT NULL
) RETURNS TABLE(
    id UUID,
    requester_id UUID,
    speaker_id TEXT,
    status TEXT,
    created_at TIMESTAMPTZ
) AS $$
DECLARE
    new_request_id UUID;
    existing_request RECORD;
    user_uuid UUID;
BEGIN
    -- Convert TEXT to UUID safely
    BEGIN
        user_uuid := p_requester_id::UUID;
    EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'Invalid requester_id format: %', p_requester_id;
    END;

    -- Generate new request ID
    new_request_id := gen_random_uuid();
    
    -- Check for existing requests first to prevent duplicates
    -- Handle both TEXT and UUID columns
    SELECT * INTO existing_request
    FROM public.meeting_requests 
    WHERE (
        -- If requester_id is UUID type
        (requester_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' AND requester_id = user_uuid)
        OR
        -- If requester_id is TEXT type
        (requester_id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' AND requester_id::text = p_requester_id)
    )
      AND speaker_id = p_speaker_id 
      AND status IN ('pending', 'approved')
    LIMIT 1;
    
    -- If existing request found, return it
    IF existing_request IS NOT NULL THEN
        RETURN QUERY
        SELECT 
            existing_request.id,
            existing_request.requester_id,
            existing_request.speaker_id,
            existing_request.status,
            existing_request.created_at;
        RETURN;
    END IF;
    
    -- Insert new meeting request
    -- Handle both TEXT and UUID columns for requester_id
    INSERT INTO public.meeting_requests (
        id,
        requester_id,
        speaker_id,
        speaker_name,
        requester_name,
        requester_company,
        requester_title,
        requester_ticket_type,
        meeting_type,
        message,
        boost_amount,
        duration_minutes,
        expires_at,
        status,
        created_at,
        updated_at
    ) VALUES (
        new_request_id,
        CASE 
            WHEN (SELECT data_type FROM information_schema.columns WHERE table_name = 'meeting_requests' AND column_name = 'requester_id' AND table_schema = 'public') = 'uuid'
            THEN user_uuid
            ELSE p_requester_id::text
        END,
        p_speaker_id,
        p_speaker_name,
        p_requester_name,
        p_requester_company,
        p_requester_title,
        p_requester_ticket_type,
        p_meeting_type,
        p_message,
        p_boost_amount,
        p_duration_minutes,
        COALESCE(p_expires_at, NOW() + INTERVAL '7 days'),
        'pending',
        NOW(),
        NOW()
    );
    
    -- Return the created request
    RETURN QUERY
    SELECT 
        new_request_id,
        user_uuid,
        p_speaker_id,
        'pending',
        NOW();
END;
$$ LANGUAGE plpgsql;

-- 5. Grant permissions
GRANT EXECUTE ON FUNCTION can_make_meeting_request(TEXT, TEXT, DECIMAL) TO authenticated;
GRANT EXECUTE ON FUNCTION insert_meeting_request(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, DECIMAL, INTEGER, TIMESTAMPTZ) TO authenticated;

-- 6. Test the functions
SELECT 'Ultimate fix applied - testing functions...' as status;

-- Test can_make_meeting_request function
SELECT * FROM can_make_meeting_request('13e93d3b-0556-4f0d-a065-1f013019618b', '550e8400-e29b-41d4-a716-446655440001', 0);

SELECT 'Ultimate fix completed successfully!' as status;

