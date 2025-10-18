-- Setup Edward Calderon as a speaker with VIP access (FIXED VERSION)
-- This script handles UUID/TEXT type mismatches properly

-- Step 1: Add Edward as a speaker
INSERT INTO public.bsl_speakers (
    id,
    name,
    title,
    linkedin,
    bio,
    imageurl,
    tags,
    availability,
    created_at
) VALUES (
    'edward-calderon-speaker',
    'Edward Calderon',
    'Tech Lead & Blockchain Expert',
    'https://linkedin.com/in/edward-calderon',
    'Edward Calderon is a technology leader and blockchain expert with extensive experience in developing innovative solutions. He specializes in blockchain technology, smart contracts, and decentralized applications.',
    'https://blockchainsummit.la/wp-content/uploads/2025/09/foto-edward-calderon.png',
    ARRAY['blockchain', 'technology', 'leadership', 'innovation'],
    '[]'::jsonb,
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    title = EXCLUDED.title,
    linkedin = EXCLUDED.linkedin,
    bio = EXCLUDED.bio,
    imageurl = EXCLUDED.imageurl,
    tags = EXCLUDED.tags,
    availability = EXCLUDED.availability,
    created_at = EXCLUDED.created_at;

-- Step 2: Update Edward's pass to VIP access (with proper type handling)
DO $$
DECLARE
    edward_user_id_text text := '13e93d3b-0556-4f0d-a065-1f013019618b';
    edward_user_id_uuid uuid;
    edward_pass_id text;
    pass_exists boolean := false;
BEGIN
    -- Convert to UUID for comparison
    edward_user_id_uuid := edward_user_id_text::uuid;
    
    -- Check if pass exists using TEXT comparison (safer approach)
    SELECT EXISTS(
        SELECT 1 FROM public.passes
        WHERE user_id::text = edward_user_id_text
          AND event_id = 'bsl2025'
    ) INTO pass_exists;
    
    IF pass_exists THEN
        -- Update existing pass to VIP using TEXT comparison
        UPDATE public.passes
        SET 
            pass_type = 'vip',
            max_meeting_requests = 999999, -- Unlimited for VIP
            max_boost_amount = 1000, -- High boost limit for VIP
            updated_at = NOW()
        WHERE user_id::text = edward_user_id_text
          AND event_id = 'bsl2025';
        
        -- Get the pass ID for logging
        SELECT id INTO edward_pass_id
        FROM public.passes
        WHERE user_id::text = edward_user_id_text
          AND event_id = 'bsl2025'
        LIMIT 1;
        
        RAISE NOTICE 'Updated Edward''s pass to VIP: %', edward_pass_id;
    ELSE
        -- Create new VIP pass for Edward
        INSERT INTO public.passes (
            id,
            user_id,
            event_id,
            pass_type,
            status,
            pass_number,
            max_meeting_requests,
            used_meeting_requests,
            max_boost_amount,
            used_boost_amount,
            created_at,
            updated_at
        ) VALUES (
            'edward-vip-pass-bsl2025',
            edward_user_id_text, -- Use TEXT to avoid type issues
            'bsl2025',
            'vip',
            'active',
            'VIP-001',
            999999, -- Unlimited meeting requests
            0,
            1000, -- High boost limit
            0,
            NOW(),
            NOW()
        );
        
        RAISE NOTICE 'Created new VIP pass for Edward';
    END IF;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error in pass setup: %', SQLERRM;
        -- Continue with the rest of the script even if pass setup fails
END $$;

-- Step 3: Create a function to get speaker's incoming meeting requests
CREATE OR REPLACE FUNCTION get_speaker_meeting_requests(p_speaker_id text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result json;
    requests json;
BEGIN
    -- Get all pending meeting requests for this speaker
    -- Handle both UUID and TEXT speaker_id types
    SELECT json_agg(
        json_build_object(
            'id', mr.id,
            'requester_id', mr.requester_id,
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
            'expires_at', mr.expires_at
        )
    ) INTO requests
    FROM public.meeting_requests mr
    WHERE mr.speaker_id::text = p_speaker_id::text
      AND mr.status IN ('pending', 'accepted', 'approved')
    ORDER BY mr.created_at DESC;
    
    result := json_build_object(
        'success', true,
        'requests', COALESCE(requests, '[]'::json),
        'count', COALESCE(json_array_length(requests), 0)
    );
    
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        result := json_build_object(
            'success', false,
            'error', SQLERRM,
            'requests', '[]'::json,
            'count', 0
        );
        RETURN result;
END;
$$;

-- Step 4: Create a function to accept/decline meeting requests
CREATE OR REPLACE FUNCTION respond_to_meeting_request(
    p_request_id text,
    p_speaker_id text,
    p_response text, -- 'accepted' or 'declined'
    p_speaker_message text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    request_record RECORD;
    result json;
BEGIN
    -- Verify the request exists and belongs to this speaker
    -- Use TEXT comparison to avoid type issues
    SELECT mr.id, mr.status, mr.requester_id
    INTO request_record
    FROM public.meeting_requests mr
    WHERE mr.id::text = p_request_id::text
      AND mr.speaker_id::text = p_speaker_id::text
      AND mr.status = 'pending'
    LIMIT 1;
    
    IF NOT FOUND THEN
        result := json_build_object(
            'success', false,
            'error', 'Request not found or already processed',
            'message', 'The meeting request was not found or has already been processed'
        );
        RETURN result;
    END IF;
    
    -- Update the request status using TEXT comparison
    UPDATE public.meeting_requests
    SET 
        status = p_response,
        speaker_response = p_speaker_message,
        speaker_response_at = NOW(),
        updated_at = NOW()
    WHERE id::text = p_request_id::text
      AND speaker_id::text = p_speaker_id::text;
    
    IF FOUND THEN
        result := json_build_object(
            'success', true,
            'message', 'Meeting request ' || p_response || ' successfully',
            'request_id', p_request_id,
            'status', p_response
        );
        RETURN result;
    ELSE
        result := json_build_object(
            'success', false,
            'error', 'Failed to update request',
            'message', 'Could not update the meeting request status'
        );
        RETURN result;
    END IF;
    
EXCEPTION
    WHEN OTHERS THEN
        result := json_build_object(
            'success', false,
            'error', SQLERRM,
            'message', 'An error occurred while processing the meeting request'
        );
        RETURN result;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_speaker_meeting_requests(text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_speaker_meeting_requests(text) TO anon;
GRANT EXECUTE ON FUNCTION respond_to_meeting_request(text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION respond_to_meeting_request(text, text, text, text) TO anon;

-- Verify the setup
SELECT 'Edward Calderon speaker setup completed successfully' as status;
