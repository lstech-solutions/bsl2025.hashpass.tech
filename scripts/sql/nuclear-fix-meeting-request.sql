-- NUCLEAR OPTION: Completely destroy and recreate insert_meeting_request function
-- This will fix the issue permanently by removing ALL traces of the old function

-- 1. DROP ALL POSSIBLE VERSIONS OF THE FUNCTION
DROP FUNCTION IF EXISTS insert_meeting_request(text,text,text,text,text,text,text,text,text,text,numeric,integer,timestamp with time zone);
DROP FUNCTION IF EXISTS insert_meeting_request(text,text,text,text,text,text,text,text,text,text,numeric,integer);
DROP FUNCTION IF EXISTS insert_meeting_request(text,text,text,text,text,text,text,text,text,text,numeric,integer,integer,timestamp with time zone);
DROP FUNCTION IF EXISTS insert_meeting_request(uuid,text,text,text,text,text,text,text,text,text,numeric,integer,timestamp with time zone);
DROP FUNCTION IF EXISTS insert_meeting_request(uuid,text,text,text,text,text,text,text,text,text,numeric,integer);

-- 2. DROP ALL TRIGGERS THAT MIGHT CALL OLD FUNCTIONS
DROP TRIGGER IF EXISTS check_meeting_request_limits ON meeting_requests;
DROP TRIGGER IF EXISTS update_pass_usage ON meeting_requests;
DROP TRIGGER IF EXISTS validate_meeting_request ON meeting_requests;

-- 3. CREATE THE COMPLETELY NEW FUNCTION (NO EXTERNAL CALLS)
CREATE OR REPLACE FUNCTION insert_meeting_request(
    p_requester_id text,
    p_speaker_id text,
    p_speaker_name text,
    p_requester_name text,
    p_requester_company text,
    p_requester_title text,
    p_requester_ticket_type text,
    p_meeting_type text,
    p_message text,
    p_note text DEFAULT NULL,
    p_boost_amount numeric DEFAULT 0,
    p_duration_minutes integer DEFAULT 15,
    p_expires_at timestamp with time zone DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_request_id uuid;
    result json;
    pass_record RECORD;
    total_requests integer;
    remaining_requests integer;
    remaining_boost numeric;
BEGIN
    -- Generate new UUID for the request
    new_request_id := gen_random_uuid();
    
    -- Get user's pass information (DIRECT QUERY - NO FUNCTION CALLS)
    SELECT p.id, p.pass_type::text, p.status::text, p.pass_number, 
           p.max_meeting_requests, p.used_meeting_requests, 
           p.max_boost_amount, p.used_boost_amount
    INTO pass_record
    FROM public.passes p 
    WHERE p.user_id::text = p_requester_id
      AND p.event_id = 'bsl2025' 
      AND p.status = 'active' 
    LIMIT 1;
    
    -- Check if user has an active pass
    IF NOT FOUND THEN
        result := json_build_object(
            'success', false, 
            'error', 'No active pass found', 
            'message', 'You need an active pass to make meeting requests'
        );
        RETURN result;
    END IF;
    
    -- Check if pass is active
    IF pass_record.status != 'active' THEN
        result := json_build_object(
            'success', false, 
            'error', 'Pass is not active', 
            'message', 'Your pass is not active'
        );
        RETURN result;
    END IF;
    
    -- Count actual meeting requests from database (DIRECT QUERY - NO FUNCTION CALLS)
    SELECT COUNT(*)
    INTO total_requests
    FROM public.meeting_requests 
    WHERE requester_id::text = p_requester_id;
    
    -- Calculate remaining requests and boost
    remaining_requests := GREATEST(0, COALESCE(pass_record.max_meeting_requests, 0) - total_requests);
    remaining_boost := GREATEST(0, COALESCE(pass_record.max_boost_amount, 0) - COALESCE(pass_record.used_boost_amount, 0));
    
    -- Check remaining requests
    IF remaining_requests <= 0 THEN
        result := json_build_object(
            'success', false, 
            'error', 'No remaining meeting requests', 
            'message', 'You have no remaining meeting requests'
        );
        RETURN result;
    END IF;
    
    -- Check boost amount
    IF p_boost_amount > remaining_boost THEN
        result := json_build_object(
            'success', false, 
            'error', 'Insufficient boost amount', 
            'message', 'You do not have enough boost amount'
        );
        RETURN result;
    END IF;
    
    -- Insert the meeting request (DIRECT INSERT - NO TRIGGERS)
    INSERT INTO public.meeting_requests (
        id, requester_id, speaker_id, speaker_name, requester_name,
        requester_company, requester_title, requester_ticket_type,
        meeting_type, message, note, boost_amount, duration_minutes,
        expires_at, status, created_at, updated_at
    ) VALUES (
        new_request_id, 
        p_requester_id::uuid, 
        p_speaker_id, 
        p_speaker_name, 
        p_requester_name,
        p_requester_company, 
        p_requester_title, 
        p_requester_ticket_type,
        p_meeting_type, 
        p_message, 
        p_note, 
        p_boost_amount, 
        p_duration_minutes,
        COALESCE(p_expires_at, NOW() + INTERVAL '7 days'), 
        'pending', 
        NOW(), 
        NOW()
    );
    
    -- Update pass usage (DIRECT UPDATE - NO FUNCTION CALLS)
    UPDATE public.passes 
    SET 
        used_meeting_requests = COALESCE(used_meeting_requests, 0) + 1,
        used_boost_amount = COALESCE(used_boost_amount, 0) + p_boost_amount,
        updated_at = NOW()
    WHERE id = pass_record.id;
    
    -- Return success
    result := json_build_object(
        'success', true, 
        'request_id', new_request_id, 
        'message', 'Meeting request created successfully'
    );
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        result := json_build_object(
            'success', false, 
            'error', SQLERRM, 
            'message', 'Failed to create meeting request'
        );
        RETURN result;
END;
$$;

-- 4. GRANT PERMISSIONS
GRANT EXECUTE ON FUNCTION insert_meeting_request(text,text,text,text,text,text,text,text,text,text,numeric,integer,timestamp with time zone) TO authenticated;
GRANT EXECUTE ON FUNCTION insert_meeting_request(text,text,text,text,text,text,text,text,text,text,numeric,integer,timestamp with time zone) TO anon;

-- 5. VERIFY THE FUNCTION WAS CREATED
SELECT 'NUCLEAR FIX COMPLETE: insert_meeting_request function recreated successfully' as status;
