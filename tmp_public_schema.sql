


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE TYPE "public"."booking_status" AS ENUM (
    'requested',
    'accepted',
    'rejected',
    'cancelled'
);


ALTER TYPE "public"."booking_status" OWNER TO "postgres";


CREATE TYPE "public"."pass_status" AS ENUM (
    'active',
    'used',
    'expired',
    'cancelled',
    'suspended'
);


ALTER TYPE "public"."pass_status" OWNER TO "postgres";


CREATE TYPE "public"."pass_type" AS ENUM (
    'general',
    'business',
    'vip'
);


ALTER TYPE "public"."pass_type" OWNER TO "postgres";


CREATE TYPE "public"."subpass_type" AS ENUM (
    'litter_smart',
    'networking',
    'workshop',
    'exclusive'
);


ALTER TYPE "public"."subpass_type" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."accept_meeting_request"("p_meeting_request_id" "uuid", "p_speaker_id" "text", "p_scheduled_at" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_location" "text" DEFAULT NULL::"text", "p_meeting_link" "text" DEFAULT NULL::"text", "p_notes" "text" DEFAULT NULL::"text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    request_record public.meeting_requests%ROWTYPE;
    new_meeting_id UUID;
    speaker_user_id UUID;
    result JSON;
BEGIN
    -- Get the meeting request details
    SELECT * INTO request_record
    FROM public.meeting_requests
    WHERE id = p_meeting_request_id
    AND speaker_id = p_speaker_id
    AND status = 'pending';

    IF NOT FOUND THEN
        result := json_build_object(
            'success', false,
            'error', 'Meeting request not found or already processed',
            'message', 'The meeting request could not be found or has already been processed'
        );
        RETURN result;
    END IF;

    -- Get speaker's user_id
    SELECT user_id INTO speaker_user_id FROM public.bsl_speakers WHERE id = p_speaker_id;

    IF speaker_user_id IS NULL THEN
        result := json_build_object(
            'success', false,
            'error', 'Speaker user ID not found',
            'message', 'Could not find user associated with speaker'
        );
        RETURN result;
    END IF;

    -- Create the meeting
    INSERT INTO public.meetings (
        meeting_request_id,
        speaker_id,
        requester_id,
        speaker_name,
        requester_name,
        requester_company,
        requester_title,
        meeting_type,
        scheduled_at,
        duration_minutes,
        location,
        meeting_link,
        notes
    ) VALUES (
        p_meeting_request_id,
        p_speaker_id,
        request_record.requester_id,
        request_record.speaker_name,
        request_record.requester_name,
        request_record.requester_company,
        request_record.requester_title,
        request_record.meeting_type,
        COALESCE(p_scheduled_at, NOW() + INTERVAL '1 day'),
        COALESCE(request_record.duration_minutes, 15),
        p_location,
        p_meeting_link,
        p_notes
    ) RETURNING id INTO new_meeting_id;

    -- Update the meeting request status and link it to the meeting
    -- Only update columns that actually exist in meeting_requests table
    UPDATE public.meeting_requests
    SET status = 'accepted',
        meeting_id = new_meeting_id,
        updated_at = NOW(),
        speaker_response = p_notes
    WHERE id = p_meeting_request_id;

    -- Add participants
    INSERT INTO public.meeting_participants (meeting_id, user_id, user_type)
    VALUES 
        (new_meeting_id, request_record.requester_id, 'requester'),
        (new_meeting_id, speaker_user_id, 'speaker');

    -- Create notifications with proper titles
    INSERT INTO public.notifications (user_id, type, title, message, meeting_id, sender_id)
    VALUES 
        (request_record.requester_id, 'meeting_accepted', 
         'Meeting Request Accepted', 
         'Your meeting request with ' || request_record.speaker_name || ' has been accepted!', 
         new_meeting_id, speaker_user_id),
        (speaker_user_id, 'meeting_created',
         'Meeting Created',
         'You have accepted a meeting with ' || request_record.requester_name || '. Coordinate details in the chat.',
         new_meeting_id, request_record.requester_id);

    result := json_build_object(
        'success', true,
        'meeting_id', new_meeting_id,
        'meeting_request_id', p_meeting_request_id,
        'message', 'Meeting accepted and created successfully'
    );
    RETURN result;

EXCEPTION
    WHEN OTHERS THEN
        result := json_build_object(
            'success', false,
            'error', SQLERRM,
            'message', 'Failed to accept meeting request'
        );
        RETURN result;
END;
$$;


ALTER FUNCTION "public"."accept_meeting_request"("p_meeting_request_id" "uuid", "p_speaker_id" "text", "p_scheduled_at" timestamp with time zone, "p_location" "text", "p_meeting_link" "text", "p_notes" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."accept_meeting_request"("p_meeting_request_id" "uuid", "p_speaker_id" "text", "p_scheduled_at" timestamp with time zone, "p_location" "text", "p_meeting_link" "text", "p_notes" "text") IS 'Accepts a meeting request and creates a meeting with chat system';



CREATE OR REPLACE FUNCTION "public"."accept_meeting_request_debug"("p_meeting_request_id" "uuid", "p_speaker_id" "text", "p_scheduled_at" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_location" "text" DEFAULT NULL::"text", "p_meeting_link" "text" DEFAULT NULL::"text", "p_notes" "text" DEFAULT NULL::"text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    request_record RECORD;
    new_meeting_id UUID;
    result JSON;
BEGIN
    -- Get the meeting request details
    SELECT * INTO request_record
    FROM public.meeting_requests
    WHERE id = p_meeting_request_id
    AND speaker_id = p_speaker_id
    AND status = 'pending';

    IF NOT FOUND THEN
        result := json_build_object(
            'success', false,
            'error', 'Meeting request not found or already processed',
            'message', 'The meeting request could not be found or has already been processed'
        );
        RETURN result;
    END IF;

    -- Update the meeting request status
    UPDATE public.meeting_requests
    SET status = 'accepted',
        updated_at = NOW()
    WHERE id = p_meeting_request_id;

    -- Create the meeting
    INSERT INTO public.meetings (
        meeting_request_id,
        speaker_id,
        requester_id,
        speaker_name,
        requester_name,
        requester_company,
        requester_title,
        meeting_type,
        scheduled_at,
        duration_minutes,
        location,
        meeting_link,
        notes
    ) VALUES (
        p_meeting_request_id,
        p_speaker_id,
        request_record.requester_id,
        request_record.speaker_name,
        request_record.requester_name,
        request_record.requester_company,
        request_record.requester_title,
        request_record.meeting_type,
        COALESCE(p_scheduled_at, NOW() + INTERVAL '1 day'),
        COALESCE(request_record.duration_minutes, 15),
        p_location,
        p_meeting_link,
        p_notes
    ) RETURNING id INTO new_meeting_id;

    -- Add participants
    INSERT INTO public.meeting_participants (meeting_id, user_id, user_type)
    VALUES 
        (new_meeting_id, request_record.requester_id, 'requester'),
        (new_meeting_id, (SELECT user_id FROM public.bsl_speakers WHERE id = p_speaker_id), 'speaker');

    -- Create notifications (without meeting_id for now)
    INSERT INTO public.notifications (user_id, type, message, sender_id)
    VALUES 
        (request_record.requester_id, 'meeting_accepted', 
         'Your meeting request with ' || request_record.speaker_name || ' has been accepted!', 
         (SELECT user_id FROM public.bsl_speakers WHERE id = p_speaker_id)),
        ((SELECT user_id FROM public.bsl_speakers WHERE id = p_speaker_id), 'meeting_created',
         'You have accepted a meeting with ' || request_record.requester_name || '. Coordinate details in the chat.',
         request_record.requester_id);

    result := json_build_object(
        'success', true,
        'meeting_id', new_meeting_id,
        'message', 'Meeting accepted and created successfully (debug version)'
    );

    RETURN result;

EXCEPTION
    WHEN OTHERS THEN
        result := json_build_object(
            'success', false,
            'error', SQLERRM,
            'message', 'Failed to accept meeting request'
        );
        RETURN result;
END;
$$;


ALTER FUNCTION "public"."accept_meeting_request_debug"("p_meeting_request_id" "uuid", "p_speaker_id" "text", "p_scheduled_at" timestamp with time zone, "p_location" "text", "p_meeting_link" "text", "p_notes" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_meeting_chat_message"("p_meeting_id" "uuid", "p_sender_id" "uuid", "p_message" "text", "p_message_type" "text" DEFAULT 'system'::"text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    result JSON;
BEGIN
    -- Insert the chat message
    INSERT INTO public.meeting_chats (meeting_id, sender_id, sender_type, message, message_type)
    VALUES (
        p_meeting_id,
        p_sender_id,
        'speaker',
        p_message,
        p_message_type
    );

    result := json_build_object(
        'success', true,
        'message', 'Chat message added successfully'
    );

    RETURN result;

EXCEPTION
    WHEN OTHERS THEN
        result := json_build_object(
            'success', false,
            'error', SQLERRM,
            'message', 'Failed to add chat message'
        );
        RETURN result;
END;
$$;


ALTER FUNCTION "public"."add_meeting_chat_message"("p_meeting_id" "uuid", "p_sender_id" "uuid", "p_message" "text", "p_message_type" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_priority_score"("p_boost_amount" numeric, "p_ticket_type" "text", "p_created_at" timestamp with time zone) RETURNS integer
    LANGUAGE "plpgsql"
    AS $_$
DECLARE
    ticket_score INTEGER;
    time_score INTEGER;
    boost_score INTEGER;
BEGIN
    -- Ticket type scoring
    CASE p_ticket_type
        WHEN 'vip' THEN ticket_score := 100;
        WHEN 'business' THEN ticket_score := 50;
        WHEN 'general' THEN ticket_score := 10;
        ELSE ticket_score := 0;
    END CASE;

    -- Time-based scoring (earlier requests get higher priority)
    time_score := GREATEST(0, 100 - EXTRACT(EPOCH FROM (NOW() - p_created_at)) / 3600);

    -- Boost amount scoring (1 point per $VOI)
    boost_score := p_boost_amount;

    RETURN ticket_score + time_score + boost_score;
END;
$_$;


ALTER FUNCTION "public"."calculate_priority_score"("p_boost_amount" numeric, "p_ticket_type" "text", "p_created_at" timestamp with time zone) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."calculate_priority_score"("p_boost_amount" numeric, "p_ticket_type" "text", "p_created_at" timestamp with time zone) IS 'Calculates priority score for meeting requests';



CREATE OR REPLACE FUNCTION "public"."can_make_meeting_request"("p_user_id" "uuid", "p_speaker_id" "text", "p_boost_amount" numeric DEFAULT 0) RETURNS TABLE("can_request" boolean, "reason" "text", "pass_type" "public"."pass_type", "remaining_requests" integer, "remaining_boost" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    user_pass RECORD;
    limits RECORD;
    is_blocked BOOLEAN;
BEGIN
    -- Check if user is blocked by speaker (blocked_user_id is uuid, so no casting needed)
    SELECT EXISTS(
        SELECT 1 FROM user_blocks
        WHERE speaker_id = p_speaker_id
        AND blocked_user_id = p_user_id
    ) INTO is_blocked;

    IF is_blocked THEN
        RETURN QUERY SELECT false, 'User is blocked by this speaker', null::pass_type, 0, 0.00;
        RETURN;
    END IF;

    -- Get user's pass (cast uuid to text for comparison with passes.user_id)
    SELECT * INTO user_pass
    FROM passes
    WHERE user_id = p_user_id::text
    AND event_id = 'bsl2025'
    AND status = 'active';

    IF user_pass IS NULL THEN
        RETURN QUERY SELECT false, 'No active pass found', null::pass_type, 0, 0.00;
        RETURN;
    END IF;

    -- Get limits for pass type (cast text to pass_type enum)
    SELECT * INTO limits FROM get_pass_type_limits(user_pass.pass_type::pass_type);

    -- Check if user has remaining requests
    IF user_pass.used_meeting_requests >= user_pass.max_meeting_requests THEN
        RETURN QUERY SELECT false, 'No remaining meeting requests', user_pass.pass_type::pass_type, 0, user_pass.max_boost_amount - user_pass.used_boost_amount;
        RETURN;
    END IF;

    -- Check if user has enough boost amount
    IF p_boost_amount > 0 AND (user_pass.used_boost_amount + p_boost_amount) > user_pass.max_boost_amount THEN
        RETURN QUERY SELECT false, 'Insufficient boost amount available', user_pass.pass_type::pass_type, user_pass.max_meeting_requests - user_pass.used_meeting_requests, user_pass.max_boost_amount - user_pass.used_boost_amount;
        RETURN;
    END IF;

    -- All checks passed
    RETURN QUERY SELECT true, 'Can make request', user_pass.pass_type::pass_type, user_pass.max_meeting_requests - user_pass.used_meeting_requests, user_pass.max_boost_amount - user_pass.used_boost_amount;
END;
$$;


ALTER FUNCTION "public"."can_make_meeting_request"("p_user_id" "uuid", "p_speaker_id" "text", "p_boost_amount" numeric) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."can_make_meeting_request"("p_user_id" "uuid", "p_speaker_id" "text", "p_boost_amount" numeric) IS 'Checks if a user can make a meeting request with proper type casting';



CREATE OR REPLACE FUNCTION "public"."can_send_meeting_request"("p_user_id" "uuid", "p_event_id" "text", "p_ticket_type" "text") RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    request_limit INTEGER;
    current_requests INTEGER;
    last_request_time TIMESTAMP WITH TIME ZONE;
    next_allowed_time TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Get request limits based on ticket type
    CASE p_ticket_type
        WHEN 'general' THEN request_limit := 1;
        WHEN 'business' THEN request_limit := 3;
        WHEN 'vip' THEN request_limit := 999999; -- Unlimited
        ELSE RETURN FALSE;
    END CASE;
    
    -- Get current request count
    SELECT total_requests_sent, last_request_at, next_request_allowed_at
    INTO current_requests, last_request_time, next_allowed_time
    FROM user_request_limits
    WHERE user_id = p_user_id AND event_id = p_event_id;
    
    -- If no record exists, user can send request
    IF current_requests IS NULL THEN
        RETURN TRUE;
    END IF;
    
    -- Check if user has exceeded limit
    IF current_requests >= request_limit THEN
        RETURN FALSE;
    END IF;
    
    -- For VIP users, check 15-minute cooldown
    IF p_ticket_type = 'vip' AND next_allowed_time IS NOT NULL THEN
        IF NOW() < next_allowed_time THEN
            RETURN FALSE;
        END IF;
    END IF;
    
    RETURN TRUE;
END;
$$;


ALTER FUNCTION "public"."can_send_meeting_request"("p_user_id" "uuid", "p_event_id" "text", "p_ticket_type" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_default_pass"("p_user_id" "uuid", "p_pass_type" "public"."pass_type" DEFAULT 'general'::"public"."pass_type") RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    pass_id TEXT;
    limits RECORD;
BEGIN
    -- Get limits for pass type
    SELECT * INTO limits FROM get_pass_type_limits(p_pass_type);
    
    -- Create pass
    INSERT INTO passes (
        user_id,
        event_id,
        pass_type,
        status,
        pass_number,
        max_meeting_requests,
        max_boost_amount,
        access_features,
        special_perks
    ) VALUES (
        p_user_id,
        'bsl2025',
        p_pass_type,
        'active',
        'BSL2025-' || p_pass_type::text || '-' || EXTRACT(EPOCH FROM NOW())::bigint,
        limits.max_requests,
        limits.max_boost,
        CASE p_pass_type
            WHEN 'vip' THEN ARRAY['all_sessions', 'networking', 'exclusive_events', 'priority_seating', 'speaker_access']
            WHEN 'business' THEN ARRAY['all_sessions', 'networking', 'business_events']
            ELSE ARRAY['general_sessions']
        END,
        CASE p_pass_type
            WHEN 'vip' THEN ARRAY['concierge_service', 'exclusive_lounge', 'premium_swag']
            WHEN 'business' THEN ARRAY['business_lounge', 'networking_tools']
            ELSE ARRAY['basic_swag']
        END
    ) RETURNING id INTO pass_id;
    
    RETURN pass_id;
END;
$$;


ALTER FUNCTION "public"."create_default_pass"("p_user_id" "uuid", "p_pass_type" "public"."pass_type") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_notification"("p_user_id" "uuid", "p_type" "text", "p_title" "text", "p_message" "text", "p_meeting_request_id" "uuid" DEFAULT NULL::"uuid", "p_speaker_id" "text" DEFAULT NULL::"text", "p_is_urgent" boolean DEFAULT false) RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    notification_id UUID;
BEGIN
    INSERT INTO notifications (
        user_id, type, title, message, 
        meeting_request_id, speaker_id, is_urgent
    ) VALUES (
        p_user_id, p_type, p_title, p_message,
        p_meeting_request_id, p_speaker_id, p_is_urgent
    ) RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$$;


ALTER FUNCTION "public"."create_notification"("p_user_id" "uuid", "p_type" "text", "p_title" "text", "p_message" "text", "p_meeting_request_id" "uuid", "p_speaker_id" "text", "p_is_urgent" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."decline_meeting_request"("p_meeting_request_id" "uuid", "p_speaker_id" "text", "p_reason" "text" DEFAULT NULL::"text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    request_record public.meeting_requests%ROWTYPE;
    result JSON;
BEGIN
    -- Get the meeting request details
    SELECT * INTO request_record
    FROM public.meeting_requests
    WHERE id = p_meeting_request_id
    AND speaker_id = p_speaker_id
    AND status = 'pending';

    IF NOT FOUND THEN
        result := json_build_object(
            'success', false,
            'error', 'Meeting request not found or already processed',
            'message', 'The meeting request could not be found or has already been processed'
        );
        RETURN result;
    END IF;

    -- Update the meeting request status
    UPDATE public.meeting_requests
    SET status = 'declined',
        updated_at = NOW(),
        speaker_response = p_reason,
        speaker_response_at = NOW()
    WHERE id = p_meeting_request_id;

    -- Create notification with proper title
    INSERT INTO public.notifications (user_id, type, title, message, meeting_request_id, sender_id)
    VALUES (
        request_record.requester_id, 
        'meeting_declined', 
        'Meeting Request Declined',
        'Your meeting request with ' || request_record.speaker_name || ' has been declined.' || 
        CASE WHEN p_reason IS NOT NULL THEN ' Reason: ' || p_reason ELSE '' END,
        p_meeting_request_id, 
        (SELECT user_id FROM public.bsl_speakers WHERE id = p_speaker_id)
    );

    result := json_build_object(
        'success', true,
        'message', 'Meeting request declined successfully'
    );
    RETURN result;

EXCEPTION
    WHEN OTHERS THEN
        result := json_build_object(
            'success', false,
            'error', SQLERRM,
            'message', 'Failed to decline meeting request'
        );
        RETURN result;
END;
$$;


ALTER FUNCTION "public"."decline_meeting_request"("p_meeting_request_id" "uuid", "p_speaker_id" "text", "p_reason" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."decline_meeting_request"("p_meeting_request_id" "uuid", "p_speaker_id" "text", "p_reason" "text") IS 'Declines a meeting request with optional reason';



CREATE OR REPLACE FUNCTION "public"."expire_old_meeting_requests"() RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    expired_count INTEGER;
BEGIN
    UPDATE meeting_requests 
    SET status = 'expired', updated_at = NOW()
    WHERE status = 'pending' 
    AND expires_at < NOW();
    
    GET DIAGNOSTICS expired_count = ROW_COUNT;
    
    -- Create notifications for expired requests
    INSERT INTO notifications (user_id, type, title, message, meeting_request_id)
    SELECT 
        requester_id,
        'system_alert',
        'Meeting Request Expired',
        'Your meeting request to ' || speaker_name || ' has expired after 3 days.',
        id
    FROM meeting_requests 
    WHERE status = 'expired' 
    AND updated_at > NOW() - INTERVAL '1 minute';
    
    RETURN expired_count;
END;
$$;


ALTER FUNCTION "public"."expire_old_meeting_requests"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_meeting_chat_messages"("p_meeting_id" "uuid", "p_user_id" "uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    meeting_record RECORD;
    messages JSON;
    result JSON;
BEGIN
    -- Verify the user is a participant in this meeting
    SELECT m.*, 
           CASE 
               WHEN m.requester_id = p_user_id THEN 'requester'
               WHEN m.speaker_id IN (SELECT id FROM public.bsl_speakers WHERE user_id = p_user_id) THEN 'speaker'
               ELSE NULL
           END as user_type
    INTO meeting_record
    FROM public.meetings m
    WHERE m.id = p_meeting_id
    AND (m.requester_id = p_user_id OR 
         m.speaker_id IN (SELECT id FROM public.bsl_speakers WHERE user_id = p_user_id));

    IF NOT FOUND OR meeting_record.user_type IS NULL THEN
        result := json_build_object(
            'success', false,
            'error', 'Access denied',
            'message', 'You are not authorized to view this meeting chat'
        );
        RETURN result;
    END IF;

    -- Get chat messages
    SELECT json_agg(
        json_build_object(
            'id', mc.id,
            'sender_id', mc.sender_id,
            'sender_type', mc.sender_type,
            'message', mc.message,
            'message_type', mc.message_type,
            'is_read', mc.is_read,
            'created_at', mc.created_at
        ) ORDER BY mc.created_at ASC
    ) INTO messages
    FROM public.meeting_chats mc
    WHERE mc.meeting_id = p_meeting_id;

    -- Mark messages as read for this user
    UPDATE public.meeting_chats
    SET is_read = TRUE
    WHERE meeting_id = p_meeting_id 
    AND sender_id != p_user_id
    AND is_read = FALSE;

    result := json_build_object(
        'success', true,
        'messages', COALESCE(messages, '[]'::json),
        'meeting', json_build_object(
            'id', meeting_record.id,
            'speaker_name', meeting_record.speaker_name,
            'requester_name', meeting_record.requester_name,
            'status', meeting_record.status,
            'scheduled_at', meeting_record.scheduled_at,
            'location', meeting_record.location,
            'meeting_link', meeting_record.meeting_link
        )
    );

    RETURN result;

EXCEPTION
    WHEN OTHERS THEN
        result := json_build_object(
            'success', false,
            'error', SQLERRM,
            'message', 'Failed to get chat messages'
        );
        RETURN result;
END;
$$;


ALTER FUNCTION "public"."get_meeting_chat_messages"("p_meeting_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_meeting_chat_messages"("p_meeting_id" "uuid", "p_user_id" "uuid") IS 'Retrieves chat messages for a meeting';



CREATE OR REPLACE FUNCTION "public"."get_meeting_requests_for_speaker"("p_speaker_id" "text", "p_user_id" "text" DEFAULT NULL::"text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    requests json;
BEGIN
    -- Get meeting requests for the speaker
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
    WHERE speaker_id = p_speaker_id;
    
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


ALTER FUNCTION "public"."get_meeting_requests_for_speaker"("p_speaker_id" "text", "p_user_id" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_meeting_requests_for_speaker"("p_speaker_id" "text", "p_user_id" "text") IS 'Returns meeting requests for a specific speaker';



CREATE OR REPLACE FUNCTION "public"."get_meeting_requests_with_meeting_id"("p_user_id" "uuid", "p_speaker_id" "text" DEFAULT NULL::"text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
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


ALTER FUNCTION "public"."get_meeting_requests_with_meeting_id"("p_user_id" "uuid", "p_speaker_id" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_meeting_requests_with_meeting_id"("p_user_id" "uuid", "p_speaker_id" "text") IS 'Gets meeting requests with their linked meeting IDs for proper chat dialog linking';



CREATE OR REPLACE FUNCTION "public"."get_notification_priority"("p_ticket_type" "text", "p_boost_amount" numeric) RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Priority scoring: VIP > Business > General
    CASE p_ticket_type
        WHEN 'vip' THEN RETURN 100 + p_boost_amount;
        WHEN 'business' THEN RETURN 50 + p_boost_amount;
        WHEN 'general' THEN RETURN 10 + p_boost_amount;
        ELSE RETURN 0;
    END CASE;
END;
$$;


ALTER FUNCTION "public"."get_notification_priority"("p_ticket_type" "text", "p_boost_amount" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_pass_type_limits"("p_pass_type" "public"."pass_type") RETURNS TABLE("max_requests" integer, "max_boost" numeric, "daily_limit" integer, "weekly_limit" integer, "monthly_limit" integer)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    CASE p_pass_type
        WHEN 'vip' THEN
            RETURN QUERY SELECT 50, 1000.00, 10, 30, 50;
        WHEN 'business' THEN
            RETURN QUERY SELECT 20, 500.00, 5, 15, 20;
        WHEN 'general' THEN
            RETURN QUERY SELECT 5, 100.00, 2, 5, 5;
        ELSE
            RETURN QUERY SELECT 0, 0.00, 0, 0, 0;
    END CASE;
END;
$$;


ALTER FUNCTION "public"."get_pass_type_limits"("p_pass_type" "public"."pass_type") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_pass_type_limits"("p_pass_type" "public"."pass_type") IS 'Returns limits for different pass types';



CREATE OR REPLACE FUNCTION "public"."get_speaker_meeting_requests"("p_speaker_id" "text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Call the main function with just speaker_id
    RETURN get_meeting_requests_for_speaker(p_speaker_id, NULL);
END;
$$;


ALTER FUNCTION "public"."get_speaker_meeting_requests"("p_speaker_id" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_speaker_meeting_requests"("p_speaker_id" "text") IS 'Alias for get_meeting_requests_for_speaker for backward compatibility';



CREATE OR REPLACE FUNCTION "public"."get_user_meeting_request_counts"("p_user_id" "text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
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


ALTER FUNCTION "public"."get_user_meeting_request_counts"("p_user_id" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_user_meeting_request_counts"("p_user_id" "text") IS 'Returns meeting request counts and pass information for a user';



CREATE OR REPLACE FUNCTION "public"."get_user_meetings"("p_user_id" "uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
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


ALTER FUNCTION "public"."get_user_meetings"("p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_user_meetings"("p_user_id" "uuid") IS 'Gets all meetings for a user (both as requester and speaker) for the schedule view';



CREATE OR REPLACE FUNCTION "public"."get_user_pass_info"("p_user_id" "uuid") RETURNS TABLE("pass_id" "text", "pass_type" "public"."pass_type", "status" "public"."pass_status", "pass_number" "text", "max_requests" integer, "used_requests" integer, "remaining_requests" integer, "max_boost" numeric, "used_boost" numeric, "remaining_boost" numeric, "access_features" "text"[], "special_perks" "text"[])
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.pass_type,
        p.status,
        p.pass_number,
        p.max_meeting_requests,
        p.used_meeting_requests,
        (p.max_meeting_requests - p.used_meeting_requests),
        p.max_boost_amount,
        p.used_boost_amount,
        (p.max_boost_amount - p.used_boost_amount),
        p.access_features,
        p.special_perks
    FROM passes p
    WHERE p.user_id = p_user_id 
    AND p.event_id = 'bsl2025' 
    AND p.status = 'active';
END;
$$;


ALTER FUNCTION "public"."get_user_pass_info"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."insert_meeting_request"("p_requester_id" "text", "p_speaker_id" "text", "p_speaker_name" "text", "p_requester_name" "text", "p_requester_company" "text", "p_requester_title" "text", "p_requester_ticket_type" "text", "p_meeting_type" "text", "p_message" "text", "p_note" "text" DEFAULT NULL::"text", "p_boost_amount" numeric DEFAULT 0, "p_duration_minutes" integer DEFAULT 15, "p_expires_at" timestamp with time zone DEFAULT NULL::timestamp with time zone) RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    new_request_id uuid;
    result json;
    pass_record RECORD;
    total_requests integer;
    remaining_requests integer;
    remaining_boost numeric;
    requester_uuid uuid;
BEGIN
    -- Convert text to uuid
    requester_uuid := p_requester_id::uuid;
    
    -- Generate new UUID for the request
    new_request_id := gen_random_uuid();
    
    -- Get user's pass information
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
    
    -- Count actual meeting requests from database (use uuid for comparison)
    SELECT COUNT(*)
    INTO total_requests
    FROM public.meeting_requests 
    WHERE requester_id = requester_uuid;
    
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
    
    -- Insert the meeting request (use uuid for requester_id)
    INSERT INTO public.meeting_requests (
        id, requester_id, speaker_id, speaker_name, requester_name,
        requester_company, requester_title, requester_ticket_type,
        meeting_type, message, note, boost_amount, duration_minutes,
        expires_at, status, created_at, updated_at
    ) VALUES (
        new_request_id, 
        requester_uuid, 
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
    
    -- Update pass usage (increment used_meeting_requests and used_boost_amount)
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


ALTER FUNCTION "public"."insert_meeting_request"("p_requester_id" "text", "p_speaker_id" "text", "p_speaker_name" "text", "p_requester_name" "text", "p_requester_company" "text", "p_requester_title" "text", "p_requester_ticket_type" "text", "p_meeting_type" "text", "p_message" "text", "p_note" "text", "p_boost_amount" numeric, "p_duration_minutes" integer, "p_expires_at" timestamp with time zone) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."insert_meeting_request"("p_requester_id" "text", "p_speaker_id" "text", "p_speaker_name" "text", "p_requester_name" "text", "p_requester_company" "text", "p_requester_title" "text", "p_requester_ticket_type" "text", "p_meeting_type" "text", "p_message" "text", "p_note" "text", "p_boost_amount" numeric, "p_duration_minutes" integer, "p_expires_at" timestamp with time zone) IS 'Creates a new meeting request with proper type handling';



CREATE OR REPLACE FUNCTION "public"."send_meeting_chat_message"("p_meeting_id" "uuid", "p_sender_id" "uuid", "p_message" "text", "p_message_type" "text" DEFAULT 'text'::"text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    meeting_record RECORD;
    sender_type TEXT;
    result JSON;
BEGIN
    -- Verify the user is a participant in this meeting
    SELECT m.*, 
           CASE 
               WHEN m.requester_id = p_sender_id THEN 'requester'
               WHEN m.speaker_id IN (SELECT id FROM public.bsl_speakers WHERE user_id = p_sender_id) THEN 'speaker'
               ELSE NULL
           END as user_type
    INTO meeting_record
    FROM public.meetings m
    WHERE m.id = p_meeting_id
    AND (m.requester_id = p_sender_id OR 
         m.speaker_id IN (SELECT id FROM public.bsl_speakers WHERE user_id = p_sender_id));

    IF NOT FOUND OR meeting_record.user_type IS NULL THEN
        result := json_build_object(
            'success', false,
            'error', 'Access denied',
            'message', 'You are not authorized to send messages in this meeting'
        );
        RETURN result;
    END IF;

    -- Insert the chat message
    INSERT INTO public.meeting_chats (meeting_id, sender_id, sender_type, message, message_type)
    VALUES (p_meeting_id, p_sender_id, meeting_record.user_type, p_message, p_message_type);

    -- Update last seen for the sender
    UPDATE public.meeting_participants
    SET last_seen = NOW()
    WHERE meeting_id = p_meeting_id AND user_id = p_sender_id;

    result := json_build_object(
        'success', true,
        'message', 'Chat message sent successfully'
    );

    RETURN result;

EXCEPTION
    WHEN OTHERS THEN
        result := json_build_object(
            'success', false,
            'error', SQLERRM,
            'message', 'Failed to send chat message'
        );
        RETURN result;
END;
$$;


ALTER FUNCTION "public"."send_meeting_chat_message"("p_meeting_id" "uuid", "p_sender_id" "uuid", "p_message" "text", "p_message_type" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."send_meeting_chat_message"("p_meeting_id" "uuid", "p_sender_id" "uuid", "p_message" "text", "p_message_type" "text") IS 'Sends a message in the meeting chat';



CREATE OR REPLACE FUNCTION "public"."send_prioritized_notification"("p_speaker_id" "text", "p_requester_name" "text", "p_requester_company" "text", "p_ticket_type" "text", "p_boost_amount" numeric, "p_meeting_request_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $_$
DECLARE
    notification_id UUID;
    priority_score INTEGER;
    notification_title TEXT;
    notification_message TEXT;
BEGIN
    -- Calculate priority score
    priority_score := get_notification_priority(p_ticket_type, p_boost_amount);
    
    -- Create notification title and message based on priority
    IF p_ticket_type = 'vip' THEN
        notification_title := '🔥 VIP Meeting Request';
        notification_message := p_requester_name || ' (VIP) wants to meet with you';
    ELSIF p_ticket_type = 'business' THEN
        notification_title := '💼 Business Meeting Request';
        notification_message := p_requester_name || ' (Business) wants to meet with you';
    ELSE
        notification_title := '📋 Meeting Request';
        notification_message := p_requester_name || ' wants to meet with you';
    END IF;
    
    -- Add boost information if applicable
    IF p_boost_amount > 0 THEN
        notification_message := notification_message || ' (Boosted with $' || p_boost_amount || ' VOI)';
    END IF;
    
    -- Create notification (note: we can't use speaker_id as user_id since speakers aren't in auth.users)
    -- For now, we'll skip creating the notification since speakers don't have user accounts
    -- This could be handled differently in the future (e.g., email notifications)
    
    -- Return a dummy UUID for now
    notification_id := gen_random_uuid();
    
    RETURN notification_id;
END;
$_$;


ALTER FUNCTION "public"."send_prioritized_notification"("p_speaker_id" "text", "p_requester_name" "text", "p_requester_company" "text", "p_ticket_type" "text", "p_boost_amount" numeric, "p_meeting_request_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."toggle_user_block"("p_speaker_id" "text", "p_user_id" "uuid", "p_reason" "text" DEFAULT NULL::"text") RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    block_exists BOOLEAN;
BEGIN
    -- Check if block already exists
    SELECT EXISTS(
        SELECT 1 FROM user_blocks 
        WHERE speaker_id = p_speaker_id 
        AND blocked_user_id = p_user_id
    ) INTO block_exists;
    
    IF block_exists THEN
        -- Remove block
        DELETE FROM user_blocks 
        WHERE speaker_id = p_speaker_id 
        AND blocked_user_id = p_user_id;
        RETURN false; -- User is now unblocked
    ELSE
        -- Add block
        INSERT INTO user_blocks (speaker_id, blocked_user_id, reason)
        VALUES (p_speaker_id, p_user_id, p_reason);
        RETURN true; -- User is now blocked
    END IF;
END;
$$;


ALTER FUNCTION "public"."toggle_user_block"("p_speaker_id" "text", "p_user_id" "uuid", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_pass_after_request"("p_user_id" "uuid", "p_boost_amount" numeric DEFAULT 0) RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    user_pass RECORD;
BEGIN
    -- Get user's pass
    SELECT * INTO user_pass 
    FROM passes 
    WHERE user_id = p_user_id 
    AND event_id = 'bsl2025' 
    AND status = 'active';
    
    IF user_pass IS NULL THEN
        RETURN false;
    END IF;
    
    -- Update pass usage
    UPDATE passes 
    SET 
        used_meeting_requests = used_meeting_requests + 1,
        used_boost_amount = used_boost_amount + p_boost_amount,
        updated_at = NOW()
    WHERE id = user_pass.id;
    
    RETURN true;
END;
$$;


ALTER FUNCTION "public"."update_pass_after_request"("p_user_id" "uuid", "p_boost_amount" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_pass_after_response"("p_user_id" "uuid", "p_meeting_request_id" "uuid", "p_status" "text") RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    user_pass RECORD;
    meeting_request RECORD;
BEGIN
    -- Get meeting request details
    SELECT * INTO meeting_request 
    FROM meeting_requests 
    WHERE id = p_meeting_request_id;
    
    IF meeting_request IS NULL THEN
        RETURN false;
    END IF;
    
    -- Get user's pass
    SELECT * INTO user_pass 
    FROM passes 
    WHERE user_id = p_user_id 
    AND event_id = 'bsl2025' 
    AND status = 'active';
    
    IF user_pass IS NULL THEN
        RETURN false;
    END IF;
    
    -- Update pass based on response
    IF p_status = 'declined' THEN
        -- Refund the request and boost amount
        UPDATE passes 
        SET 
            used_meeting_requests = GREATEST(0, used_meeting_requests - 1),
            used_boost_amount = GREATEST(0, used_boost_amount - COALESCE(meeting_request.boost_amount, 0)),
            updated_at = NOW()
        WHERE id = user_pass.id;
    END IF;
    
    RETURN true;
END;
$$;


ALTER FUNCTION "public"."update_pass_after_response"("p_user_id" "uuid", "p_meeting_request_id" "uuid", "p_status" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_request_limits_after_send"("p_user_id" "uuid", "p_event_id" "text", "p_ticket_type" "text") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    next_allowed_time TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Calculate next allowed time for VIP users (15 minutes)
    IF p_ticket_type = 'vip' THEN
        next_allowed_time := NOW() + INTERVAL '15 minutes';
    END IF;
    
    -- Insert or update request limits
    INSERT INTO user_request_limits (
        user_id, event_id, ticket_type, 
        total_requests_sent, last_request_at, next_request_allowed_at
    ) VALUES (
        p_user_id, p_event_id, p_ticket_type,
        1, NOW(), next_allowed_time
    )
    ON CONFLICT (user_id, event_id)
    DO UPDATE SET
        total_requests_sent = user_request_limits.total_requests_sent + 1,
        last_request_at = NOW(),
        next_request_allowed_at = CASE 
            WHEN p_ticket_type = 'vip' THEN next_allowed_time
            ELSE user_request_limits.next_request_allowed_at
        END,
        updated_at = NOW();
END;
$$;


ALTER FUNCTION "public"."update_request_limits_after_send"("p_user_id" "uuid", "p_event_id" "text", "p_ticket_type" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."boost_transactions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "meeting_request_id" "uuid" NOT NULL,
    "amount" numeric(10,2) NOT NULL,
    "token_symbol" "text" DEFAULT 'VOI'::"text",
    "transaction_hash" "text" NOT NULL,
    "block_number" bigint,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "confirmation_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "confirmed_at" timestamp with time zone,
    CONSTRAINT "boost_transactions_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'confirmed'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."boost_transactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."bsl_audit" (
    "id" bigint NOT NULL,
    "event" "text" NOT NULL,
    "ref_id" "text",
    "actor" "uuid",
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."bsl_audit" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."bsl_audit_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."bsl_audit_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."bsl_audit_id_seq" OWNED BY "public"."bsl_audit"."id";



CREATE TABLE IF NOT EXISTS "public"."bsl_bookings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "speakerid" "text" NOT NULL,
    "attendeeid" "uuid",
    "start" timestamp with time zone NOT NULL,
    "end" timestamp with time zone NOT NULL,
    "status" "public"."booking_status" DEFAULT 'requested'::"public"."booking_status" NOT NULL,
    "createdat" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."bsl_bookings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."bsl_speakers" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "title" "text",
    "linkedin" "text",
    "bio" "text",
    "imageurl" "text",
    "tags" "text"[] DEFAULT '{}'::"text"[],
    "availability" "jsonb" DEFAULT '[]'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "company" "text",
    "twitter" "text",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "user_id" "uuid"
);


ALTER TABLE "public"."bsl_speakers" OWNER TO "postgres";


COMMENT ON COLUMN "public"."bsl_speakers"."user_id" IS 'Links speaker record to auth.users table for generic speaker detection';



CREATE TABLE IF NOT EXISTS "public"."bsl_tickets" (
    "ticketid" "text" NOT NULL,
    "userid" "uuid",
    "verified" boolean DEFAULT false,
    "used" boolean DEFAULT false,
    "issuedat" timestamp with time zone DEFAULT "now"(),
    "verifiedat" timestamp with time zone
);


ALTER TABLE "public"."bsl_tickets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."chat_messages" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "chat_id" "uuid" NOT NULL,
    "sender_id" "uuid" NOT NULL,
    "message" "text" NOT NULL,
    "message_type" "text" DEFAULT 'text'::"text",
    "is_read" boolean DEFAULT false,
    "read_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "chat_messages_message_type_check" CHECK (("message_type" = ANY (ARRAY['text'::"text", 'image'::"text", 'file'::"text", 'system'::"text"])))
);


ALTER TABLE "public"."chat_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."event_agenda" (
    "id" "text" NOT NULL,
    "event_id" "text" NOT NULL,
    "time" "text" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "speakers" "text"[],
    "type" "text" NOT NULL,
    "location" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "day" "text",
    "day_name" "text",
    CONSTRAINT "event_agenda_type_check" CHECK (("type" = ANY (ARRAY['keynote'::"text", 'panel'::"text", 'break'::"text", 'meal'::"text", 'registration'::"text"])))
);


ALTER TABLE "public"."event_agenda" OWNER TO "postgres";


COMMENT ON COLUMN "public"."event_agenda"."day_name" IS 'Thematic name for the day (e.g., "Regulación, Bancos Centrales e Infraestructura del Dinero Digital")';



CREATE TABLE IF NOT EXISTS "public"."events" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "domain" "text" NOT NULL,
    "event_type" "text" NOT NULL,
    "features" "text"[] DEFAULT '{}'::"text"[],
    "branding" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "events_event_type_check" CHECK (("event_type" = ANY (ARRAY['hashpass'::"text", 'whitelabel'::"text"])))
);


ALTER TABLE "public"."events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."meeting_chats" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "meeting_id" "uuid" NOT NULL,
    "sender_id" "uuid" NOT NULL,
    "sender_type" "text" NOT NULL,
    "message" "text" NOT NULL,
    "message_type" "text" DEFAULT 'text'::"text" NOT NULL,
    "is_read" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "meeting_chats_message_type_check" CHECK (("message_type" = ANY (ARRAY['text'::"text", 'system'::"text", 'meeting_update'::"text"]))),
    CONSTRAINT "meeting_chats_sender_type_check" CHECK (("sender_type" = ANY (ARRAY['speaker'::"text", 'requester'::"text"])))
);


ALTER TABLE "public"."meeting_chats" OWNER TO "postgres";


COMMENT ON TABLE "public"."meeting_chats" IS 'Internal chat system for meeting coordination between speakers and requesters';



CREATE TABLE IF NOT EXISTS "public"."meeting_participants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "meeting_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "user_type" "text" NOT NULL,
    "joined_at" timestamp with time zone DEFAULT "now"(),
    "last_seen" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "meeting_participants_user_type_check" CHECK (("user_type" = ANY (ARRAY['speaker'::"text", 'requester'::"text"])))
);


ALTER TABLE "public"."meeting_participants" OWNER TO "postgres";


COMMENT ON TABLE "public"."meeting_participants" IS 'Tracks meeting participants and their activity';



CREATE TABLE IF NOT EXISTS "public"."meeting_requests" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "requester_id" "uuid" NOT NULL,
    "speaker_id" "text" NOT NULL,
    "speaker_name" "text" NOT NULL,
    "requester_name" "text" NOT NULL,
    "requester_company" "text",
    "requester_title" "text",
    "requester_ticket_type" "text" NOT NULL,
    "preferred_date" "date",
    "preferred_time" time without time zone,
    "duration_minutes" integer DEFAULT 15,
    "meeting_type" "text" NOT NULL,
    "message" "text" NOT NULL,
    "note" "text",
    "boost_amount" numeric(10,2) DEFAULT 0,
    "boost_transaction_hash" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "priority_score" integer DEFAULT 0,
    "availability_window_start" timestamp with time zone,
    "availability_window_end" timestamp with time zone,
    "speaker_response" "text",
    "speaker_response_at" timestamp with time zone,
    "meeting_scheduled_at" timestamp with time zone,
    "meeting_location" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone DEFAULT ("now"() + '72:00:00'::interval),
    "meeting_id" "uuid",
    CONSTRAINT "check_note_length" CHECK (("char_length"("note") <= 120)),
    CONSTRAINT "meeting_requests_meeting_type_check" CHECK (("meeting_type" = ANY (ARRAY['networking'::"text", 'business'::"text", 'mentorship'::"text", 'collaboration'::"text"]))),
    CONSTRAINT "meeting_requests_requester_ticket_type_check" CHECK (("requester_ticket_type" = ANY (ARRAY['general'::"text", 'business'::"text", 'vip'::"text"]))),
    CONSTRAINT "meeting_requests_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'accepted'::"text", 'declined'::"text", 'expired'::"text", 'completed'::"text", 'cancelled'::"text"]))),
    CONSTRAINT "valid_boost_amount" CHECK (("boost_amount" >= (0)::numeric)),
    CONSTRAINT "valid_duration" CHECK ((("duration_minutes" >= 5) AND ("duration_minutes" <= 60))),
    CONSTRAINT "valid_priority_score" CHECK (("priority_score" >= 0))
);


ALTER TABLE "public"."meeting_requests" OWNER TO "postgres";


COMMENT ON COLUMN "public"."meeting_requests"."meeting_id" IS 'Links to the meeting created when this request is accepted';



CREATE TABLE IF NOT EXISTS "public"."meetings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "meeting_request_id" "uuid" NOT NULL,
    "speaker_id" "text" NOT NULL,
    "requester_id" "uuid" NOT NULL,
    "speaker_name" "text" NOT NULL,
    "requester_name" "text" NOT NULL,
    "requester_company" "text",
    "requester_title" "text",
    "meeting_type" "text" DEFAULT 'networking'::"text" NOT NULL,
    "status" "text" DEFAULT 'scheduled'::"text" NOT NULL,
    "scheduled_at" timestamp with time zone,
    "duration_minutes" integer DEFAULT 15,
    "location" "text",
    "meeting_link" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "meetings_status_check" CHECK (("status" = ANY (ARRAY['scheduled'::"text", 'confirmed'::"text", 'in_progress'::"text", 'completed'::"text", 'cancelled'::"text", 'no_show'::"text"])))
);


ALTER TABLE "public"."meetings" OWNER TO "postgres";


COMMENT ON TABLE "public"."meetings" IS 'Stores accepted meeting details and coordination information';



CREATE TABLE IF NOT EXISTS "public"."newsletter_subscribers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "subscribed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."newsletter_subscribers" OWNER TO "postgres";


COMMENT ON TABLE "public"."newsletter_subscribers" IS 'Stores newsletter subscribers information';



COMMENT ON COLUMN "public"."newsletter_subscribers"."email" IS 'The email address of the subscriber, must be unique';



COMMENT ON COLUMN "public"."newsletter_subscribers"."subscribed_at" IS 'When the user subscribed to the newsletter';



CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "title" "text",
    "message" "text" NOT NULL,
    "meeting_request_id" "uuid",
    "speaker_id" "uuid",
    "is_read" boolean DEFAULT false,
    "is_urgent" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "read_at" timestamp with time zone,
    "expires_at" timestamp with time zone DEFAULT ("now"() + '7 days'::interval),
    "meeting_id" "uuid",
    "sender_id" "uuid",
    CONSTRAINT "notifications_type_check" CHECK (("type" = ANY (ARRAY['meeting_request'::"text", 'meeting_accepted'::"text", 'meeting_declined'::"text", 'meeting_created'::"text", 'meeting_reminder'::"text", 'meeting_cancelled'::"text", 'system_alert'::"text", 'general'::"text", 'urgent'::"text", 'info'::"text", 'success'::"text", 'warning'::"text", 'error'::"text"])))
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


COMMENT ON COLUMN "public"."notifications"."title" IS 'Title of the notification (optional)';



COMMENT ON COLUMN "public"."notifications"."meeting_request_id" IS 'Links to the meeting request this notification is about';



COMMENT ON COLUMN "public"."notifications"."speaker_id" IS 'Links to the speaker this notification is about';



COMMENT ON COLUMN "public"."notifications"."is_urgent" IS 'Whether this notification is urgent';



COMMENT ON COLUMN "public"."notifications"."meeting_id" IS 'Links to the meeting this notification is about';



COMMENT ON COLUMN "public"."notifications"."sender_id" IS 'User who sent this notification';



COMMENT ON CONSTRAINT "notifications_type_check" ON "public"."notifications" IS 'Valid notification types including meeting-related notifications';



CREATE TABLE IF NOT EXISTS "public"."pass_request_limits" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "pass_id" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "daily_requests_sent" integer DEFAULT 0,
    "daily_requests_date" "date" DEFAULT CURRENT_DATE,
    "weekly_requests_sent" integer DEFAULT 0,
    "weekly_requests_week" "date" DEFAULT "date_trunc"('week'::"text", (CURRENT_DATE)::timestamp with time zone),
    "monthly_requests_sent" integer DEFAULT 0,
    "monthly_requests_month" "date" DEFAULT "date_trunc"('month'::"text", (CURRENT_DATE)::timestamp with time zone),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."pass_request_limits" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."passes" (
    "id" "text" NOT NULL,
    "user_id" "text" NOT NULL,
    "event_id" "text" NOT NULL,
    "pass_type" "text" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "purchase_date" timestamp with time zone DEFAULT "now"(),
    "price_usd" numeric(10,2),
    "access_features" "text"[] DEFAULT '{}'::"text"[],
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "max_meeting_requests" integer DEFAULT 5,
    "used_meeting_requests" integer DEFAULT 0,
    "max_boost_amount" numeric(10,2) DEFAULT 100.00,
    "used_boost_amount" numeric(10,2) DEFAULT 0,
    "special_perks" "text"[] DEFAULT '{}'::"text"[],
    "pass_number" "text" NOT NULL,
    CONSTRAINT "passes_pass_type_check" CHECK (("pass_type" = ANY (ARRAY['general'::"text", 'vip'::"text", 'business'::"text"]))),
    CONSTRAINT "passes_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'used'::"text", 'expired'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."passes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."speaker_availability" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "speaker_id" "uuid" NOT NULL,
    "speaker_name" "text" NOT NULL,
    "date" "date" NOT NULL,
    "start_time" time without time zone NOT NULL,
    "end_time" time without time zone NOT NULL,
    "duration_minutes" integer DEFAULT 15,
    "max_meetings_per_slot" integer DEFAULT 1,
    "current_meetings_count" integer DEFAULT 0,
    "is_available" boolean DEFAULT true,
    "requires_vip_ticket" boolean DEFAULT false,
    "requires_business_ticket" boolean DEFAULT false,
    "allows_general_ticket" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "valid_meeting_count" CHECK ((("current_meetings_count" >= 0) AND ("current_meetings_count" <= "max_meetings_per_slot"))),
    CONSTRAINT "valid_time_slot" CHECK (("end_time" > "start_time"))
);


ALTER TABLE "public"."speaker_availability" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."speed_dating_chats" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "meeting_request_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "speaker_id" "uuid" NOT NULL,
    "chat_duration_minutes" integer DEFAULT 15,
    "started_at" timestamp with time zone DEFAULT "now"(),
    "ended_at" timestamp with time zone,
    "status" "text" DEFAULT 'active'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "speed_dating_chats_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'ended'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."speed_dating_chats" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subpasses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "pass_id" "text" NOT NULL,
    "subpass_type" "public"."subpass_type" NOT NULL,
    "event_name" "text" NOT NULL,
    "status" "public"."pass_status" DEFAULT 'active'::"public"."pass_status" NOT NULL,
    "access_code" "text",
    "venue" "text",
    "start_time" timestamp with time zone,
    "end_time" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."subpasses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_blocks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "speaker_id" "text" NOT NULL,
    "blocked_user_id" "uuid" NOT NULL,
    "reason" "text",
    "blocked_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_blocks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_request_limits" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "event_id" "text" NOT NULL,
    "ticket_type" "text" NOT NULL,
    "total_requests_sent" integer DEFAULT 0,
    "successful_requests" integer DEFAULT 0,
    "rejected_requests" integer DEFAULT 0,
    "last_request_at" timestamp with time zone,
    "next_request_allowed_at" timestamp with time zone,
    "total_boosts_used" integer DEFAULT 0,
    "total_boost_amount" numeric(10,2) DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "user_request_limits_ticket_type_check" CHECK (("ticket_type" = ANY (ARRAY['general'::"text", 'business'::"text", 'vip'::"text"])))
);


ALTER TABLE "public"."user_request_limits" OWNER TO "postgres";


ALTER TABLE ONLY "public"."bsl_audit" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."bsl_audit_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."boost_transactions"
    ADD CONSTRAINT "boost_transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."boost_transactions"
    ADD CONSTRAINT "boost_transactions_transaction_hash_key" UNIQUE ("transaction_hash");



ALTER TABLE ONLY "public"."bsl_audit"
    ADD CONSTRAINT "bsl_audit_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bsl_bookings"
    ADD CONSTRAINT "bsl_bookings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bsl_bookings"
    ADD CONSTRAINT "bsl_bookings_speakerid_start_key" UNIQUE ("speakerid", "start");



ALTER TABLE ONLY "public"."bsl_speakers"
    ADD CONSTRAINT "bsl_speakers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bsl_tickets"
    ADD CONSTRAINT "bsl_tickets_pkey" PRIMARY KEY ("ticketid");



ALTER TABLE ONLY "public"."chat_messages"
    ADD CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_agenda"
    ADD CONSTRAINT "event_agenda_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."meeting_chats"
    ADD CONSTRAINT "meeting_chats_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."meeting_participants"
    ADD CONSTRAINT "meeting_participants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."meeting_requests"
    ADD CONSTRAINT "meeting_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."meetings"
    ADD CONSTRAINT "meetings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."newsletter_subscribers"
    ADD CONSTRAINT "newsletter_subscribers_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."newsletter_subscribers"
    ADD CONSTRAINT "newsletter_subscribers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pass_request_limits"
    ADD CONSTRAINT "pass_request_limits_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."passes"
    ADD CONSTRAINT "passes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."speaker_availability"
    ADD CONSTRAINT "speaker_availability_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."speed_dating_chats"
    ADD CONSTRAINT "speed_dating_chats_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subpasses"
    ADD CONSTRAINT "subpasses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pass_request_limits"
    ADD CONSTRAINT "unique_pass_limits" UNIQUE ("pass_id", "user_id");



ALTER TABLE ONLY "public"."passes"
    ADD CONSTRAINT "unique_pass_number" UNIQUE ("pass_number");



ALTER TABLE ONLY "public"."subpasses"
    ADD CONSTRAINT "unique_pass_subpass" UNIQUE ("pass_id", "subpass_type", "event_name");



ALTER TABLE ONLY "public"."user_blocks"
    ADD CONSTRAINT "unique_speaker_user_block" UNIQUE ("speaker_id", "blocked_user_id");



ALTER TABLE ONLY "public"."user_blocks"
    ADD CONSTRAINT "user_blocks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_request_limits"
    ADD CONSTRAINT "user_request_limits_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_request_limits"
    ADD CONSTRAINT "user_request_limits_user_id_event_id_key" UNIQUE ("user_id", "event_id");



CREATE INDEX "idx_boost_transactions_hash" ON "public"."boost_transactions" USING "btree" ("transaction_hash");



CREATE INDEX "idx_boost_transactions_user" ON "public"."boost_transactions" USING "btree" ("user_id");



CREATE INDEX "idx_bsl_speakers_user_id" ON "public"."bsl_speakers" USING "btree" ("user_id");



CREATE INDEX "idx_chat_messages_chat" ON "public"."chat_messages" USING "btree" ("chat_id");



CREATE INDEX "idx_chat_messages_sender" ON "public"."chat_messages" USING "btree" ("sender_id");



CREATE INDEX "idx_event_agenda_day_name" ON "public"."event_agenda" USING "btree" ("day_name");



CREATE INDEX "idx_event_agenda_event_id" ON "public"."event_agenda" USING "btree" ("event_id");



CREATE INDEX "idx_event_agenda_type" ON "public"."event_agenda" USING "btree" ("type");



CREATE INDEX "idx_events_domain" ON "public"."events" USING "btree" ("domain");



CREATE INDEX "idx_events_type" ON "public"."events" USING "btree" ("event_type");



CREATE INDEX "idx_meeting_chats_created_at" ON "public"."meeting_chats" USING "btree" ("created_at");



CREATE INDEX "idx_meeting_chats_meeting_id" ON "public"."meeting_chats" USING "btree" ("meeting_id");



CREATE INDEX "idx_meeting_participants_meeting_id" ON "public"."meeting_participants" USING "btree" ("meeting_id");



CREATE INDEX "idx_meeting_participants_user_id" ON "public"."meeting_participants" USING "btree" ("user_id");



CREATE INDEX "idx_meeting_requests_expires" ON "public"."meeting_requests" USING "btree" ("expires_at");



CREATE INDEX "idx_meeting_requests_meeting_id" ON "public"."meeting_requests" USING "btree" ("meeting_id");



CREATE INDEX "idx_meeting_requests_priority" ON "public"."meeting_requests" USING "btree" ("priority_score" DESC);



CREATE INDEX "idx_meeting_requests_requester" ON "public"."meeting_requests" USING "btree" ("requester_id");



CREATE INDEX "idx_meeting_requests_speaker" ON "public"."meeting_requests" USING "btree" ("speaker_id");



CREATE INDEX "idx_meeting_requests_status" ON "public"."meeting_requests" USING "btree" ("status");



CREATE INDEX "idx_meetings_requester_id" ON "public"."meetings" USING "btree" ("requester_id");



CREATE INDEX "idx_meetings_scheduled_at" ON "public"."meetings" USING "btree" ("scheduled_at");



CREATE INDEX "idx_meetings_speaker_id" ON "public"."meetings" USING "btree" ("speaker_id");



CREATE INDEX "idx_meetings_status" ON "public"."meetings" USING "btree" ("status");



CREATE INDEX "idx_newsletter_subscribers_email" ON "public"."newsletter_subscribers" USING "btree" ("email");



CREATE INDEX "idx_notifications_meeting_id" ON "public"."notifications" USING "btree" ("meeting_id");



CREATE INDEX "idx_notifications_meeting_request_id" ON "public"."notifications" USING "btree" ("meeting_request_id");



CREATE INDEX "idx_notifications_sender_id" ON "public"."notifications" USING "btree" ("sender_id");



CREATE INDEX "idx_notifications_speaker_id" ON "public"."notifications" USING "btree" ("speaker_id");



CREATE INDEX "idx_notifications_type" ON "public"."notifications" USING "btree" ("type");



CREATE INDEX "idx_notifications_unread" ON "public"."notifications" USING "btree" ("user_id", "is_read");



CREATE INDEX "idx_notifications_user" ON "public"."notifications" USING "btree" ("user_id");



CREATE INDEX "idx_notifications_user_id" ON "public"."notifications" USING "btree" ("user_id");



CREATE INDEX "idx_pass_request_limits_pass" ON "public"."pass_request_limits" USING "btree" ("pass_id");



CREATE INDEX "idx_passes_event_id" ON "public"."passes" USING "btree" ("event_id");



CREATE INDEX "idx_passes_pass_type" ON "public"."passes" USING "btree" ("pass_type");



CREATE INDEX "idx_passes_status" ON "public"."passes" USING "btree" ("status");



CREATE INDEX "idx_passes_type_status" ON "public"."passes" USING "btree" ("pass_type", "status");



CREATE INDEX "idx_passes_user_event" ON "public"."passes" USING "btree" ("user_id", "event_id");



CREATE INDEX "idx_passes_user_id" ON "public"."passes" USING "btree" ("user_id");



CREATE INDEX "idx_speaker_availability_available" ON "public"."speaker_availability" USING "btree" ("is_available");



CREATE INDEX "idx_speaker_availability_date" ON "public"."speaker_availability" USING "btree" ("date");



CREATE INDEX "idx_speaker_availability_speaker" ON "public"."speaker_availability" USING "btree" ("speaker_id");



CREATE INDEX "idx_speed_dating_chats_meeting_request" ON "public"."speed_dating_chats" USING "btree" ("meeting_request_id");



CREATE INDEX "idx_speed_dating_chats_users" ON "public"."speed_dating_chats" USING "btree" ("user_id", "speaker_id");



CREATE INDEX "idx_subpasses_pass_type" ON "public"."subpasses" USING "btree" ("pass_id", "subpass_type");



CREATE INDEX "idx_user_blocks_speaker" ON "public"."user_blocks" USING "btree" ("speaker_id");



CREATE INDEX "idx_user_blocks_user" ON "public"."user_blocks" USING "btree" ("blocked_user_id");



CREATE INDEX "idx_user_request_limits_ticket_type" ON "public"."user_request_limits" USING "btree" ("ticket_type");



CREATE INDEX "idx_user_request_limits_user_event" ON "public"."user_request_limits" USING "btree" ("user_id", "event_id");



CREATE OR REPLACE TRIGGER "update_bsl_speakers_updated_at" BEFORE UPDATE ON "public"."bsl_speakers" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_event_agenda_updated_at" BEFORE UPDATE ON "public"."event_agenda" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_events_updated_at" BEFORE UPDATE ON "public"."events" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_newsletter_subscribers_updated_at" BEFORE UPDATE ON "public"."newsletter_subscribers" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_pass_request_limits_updated_at" BEFORE UPDATE ON "public"."pass_request_limits" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_passes_updated_at" BEFORE UPDATE ON "public"."passes" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_subpasses_updated_at" BEFORE UPDATE ON "public"."subpasses" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."boost_transactions"
    ADD CONSTRAINT "boost_transactions_meeting_request_id_fkey" FOREIGN KEY ("meeting_request_id") REFERENCES "public"."meeting_requests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."boost_transactions"
    ADD CONSTRAINT "boost_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bsl_bookings"
    ADD CONSTRAINT "bsl_bookings_attendeeid_fkey" FOREIGN KEY ("attendeeid") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."bsl_bookings"
    ADD CONSTRAINT "bsl_bookings_speakerid_fkey" FOREIGN KEY ("speakerid") REFERENCES "public"."bsl_speakers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bsl_speakers"
    ADD CONSTRAINT "bsl_speakers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."chat_messages"
    ADD CONSTRAINT "chat_messages_chat_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "public"."speed_dating_chats"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chat_messages"
    ADD CONSTRAINT "chat_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_agenda"
    ADD CONSTRAINT "event_agenda_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bsl_tickets"
    ADD CONSTRAINT "fk_user" FOREIGN KEY ("userid") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."meeting_chats"
    ADD CONSTRAINT "meeting_chats_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."meeting_chats"
    ADD CONSTRAINT "meeting_chats_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."meeting_participants"
    ADD CONSTRAINT "meeting_participants_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."meeting_participants"
    ADD CONSTRAINT "meeting_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."meeting_requests"
    ADD CONSTRAINT "meeting_requests_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."meeting_requests"
    ADD CONSTRAINT "meeting_requests_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."meeting_requests"
    ADD CONSTRAINT "meeting_requests_speaker_id_fkey" FOREIGN KEY ("speaker_id") REFERENCES "public"."bsl_speakers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."meetings"
    ADD CONSTRAINT "meetings_meeting_request_id_fkey" FOREIGN KEY ("meeting_request_id") REFERENCES "public"."meeting_requests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."meetings"
    ADD CONSTRAINT "meetings_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."meetings"
    ADD CONSTRAINT "meetings_speaker_id_fkey" FOREIGN KEY ("speaker_id") REFERENCES "public"."bsl_speakers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_meeting_request_id_fkey" FOREIGN KEY ("meeting_request_id") REFERENCES "public"."meeting_requests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_speaker_id_fkey" FOREIGN KEY ("speaker_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pass_request_limits"
    ADD CONSTRAINT "pass_request_limits_pass_id_fkey" FOREIGN KEY ("pass_id") REFERENCES "public"."passes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pass_request_limits"
    ADD CONSTRAINT "pass_request_limits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."passes"
    ADD CONSTRAINT "passes_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."speaker_availability"
    ADD CONSTRAINT "speaker_availability_speaker_id_fkey" FOREIGN KEY ("speaker_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."speed_dating_chats"
    ADD CONSTRAINT "speed_dating_chats_meeting_request_id_fkey" FOREIGN KEY ("meeting_request_id") REFERENCES "public"."meeting_requests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."speed_dating_chats"
    ADD CONSTRAINT "speed_dating_chats_speaker_id_fkey" FOREIGN KEY ("speaker_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."speed_dating_chats"
    ADD CONSTRAINT "speed_dating_chats_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subpasses"
    ADD CONSTRAINT "subpasses_pass_id_fkey" FOREIGN KEY ("pass_id") REFERENCES "public"."passes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_blocks"
    ADD CONSTRAINT "user_blocks_blocked_user_id_fkey" FOREIGN KEY ("blocked_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_blocks"
    ADD CONSTRAINT "user_blocks_speaker_id_fkey" FOREIGN KEY ("speaker_id") REFERENCES "public"."bsl_speakers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_request_limits"
    ADD CONSTRAINT "user_request_limits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Enable insert for all users" ON "public"."newsletter_subscribers" FOR INSERT TO "authenticated", "anon" WITH CHECK (true);



CREATE POLICY "Enable read access for authenticated users" ON "public"."newsletter_subscribers" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Event agenda is insertable by service role" ON "public"."event_agenda" FOR INSERT WITH CHECK (true);



CREATE POLICY "Event agenda is updatable by service role" ON "public"."event_agenda" FOR UPDATE USING (true);



CREATE POLICY "Event agenda is viewable by everyone" ON "public"."event_agenda" FOR SELECT USING (true);



CREATE POLICY "Events are insertable by service role" ON "public"."events" FOR INSERT WITH CHECK (true);



CREATE POLICY "Events are updatable by service role" ON "public"."events" FOR UPDATE USING (true);



CREATE POLICY "Events are viewable by everyone" ON "public"."events" FOR SELECT USING (true);



CREATE POLICY "Everyone can view speaker availability" ON "public"."speaker_availability" FOR SELECT USING (true);



CREATE POLICY "Meeting participants can send messages" ON "public"."meeting_chats" FOR INSERT WITH CHECK (("meeting_id" IN ( SELECT "meetings"."id"
   FROM "public"."meetings"
  WHERE (("meetings"."requester_id" = "auth"."uid"()) OR ("meetings"."speaker_id" IN ( SELECT "bsl_speakers"."id"
           FROM "public"."bsl_speakers"
          WHERE ("bsl_speakers"."user_id" = "auth"."uid"())))))));



CREATE POLICY "Meeting participants can view chat messages" ON "public"."meeting_chats" FOR SELECT USING (("meeting_id" IN ( SELECT "meetings"."id"
   FROM "public"."meetings"
  WHERE (("meetings"."requester_id" = "auth"."uid"()) OR ("meetings"."speaker_id" IN ( SELECT "bsl_speakers"."id"
           FROM "public"."bsl_speakers"
          WHERE ("bsl_speakers"."user_id" = "auth"."uid"())))))));



CREATE POLICY "Speakers can manage blocks" ON "public"."user_blocks" USING (("speaker_id" IN ( SELECT "bsl_speakers"."id"
   FROM "public"."bsl_speakers"
  WHERE ("bsl_speakers"."id" = "user_blocks"."speaker_id"))));



CREATE POLICY "Speakers can manage their availability" ON "public"."speaker_availability" USING (("auth"."uid"() = "speaker_id"));



CREATE POLICY "Speakers can respond to requests" ON "public"."meeting_requests" FOR UPDATE USING (("speaker_id" IN ( SELECT "bsl_speakers"."id"
   FROM "public"."bsl_speakers"
  WHERE ("bsl_speakers"."user_id" = "auth"."uid"()))));



CREATE POLICY "Speakers can update their meetings" ON "public"."meetings" FOR UPDATE USING (("speaker_id" IN ( SELECT "bsl_speakers"."id"
   FROM "public"."bsl_speakers"
  WHERE ("bsl_speakers"."user_id" = "auth"."uid"()))));



CREATE POLICY "Speakers can view requests to them" ON "public"."meeting_requests" FOR SELECT USING (("speaker_id" IN ( SELECT "bsl_speakers"."id"
   FROM "public"."bsl_speakers"
  WHERE ("bsl_speakers"."user_id" = "auth"."uid"()))));



CREATE POLICY "System can create chats" ON "public"."speed_dating_chats" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") OR ("auth"."uid"() = "speaker_id")));



CREATE POLICY "System can insert passes" ON "public"."passes" FOR INSERT WITH CHECK ((("auth"."uid"())::"text" = "user_id"));



CREATE POLICY "System can insert request limits" ON "public"."user_request_limits" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "System can manage limits" ON "public"."pass_request_limits" USING (true);



CREATE POLICY "Users can create boost transactions" ON "public"."boost_transactions" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create meeting requests" ON "public"."meeting_requests" FOR INSERT WITH CHECK (("auth"."uid"() = "requester_id"));



CREATE POLICY "Users can insert their own passes" ON "public"."passes" FOR INSERT WITH CHECK (("user_id" = ("auth"."uid"())::"text"));



CREATE POLICY "Users can send messages in their chats" ON "public"."chat_messages" FOR INSERT WITH CHECK ((("sender_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."speed_dating_chats"
  WHERE (("speed_dating_chats"."id" = "chat_messages"."chat_id") AND (("speed_dating_chats"."user_id" = "auth"."uid"()) OR ("speed_dating_chats"."speaker_id" = "auth"."uid"())))))));



CREATE POLICY "Users can update their own chats" ON "public"."speed_dating_chats" FOR UPDATE USING ((("auth"."uid"() = "user_id") OR ("auth"."uid"() = "speaker_id")));



CREATE POLICY "Users can update their own messages" ON "public"."chat_messages" FOR UPDATE USING (("sender_id" = "auth"."uid"()));



CREATE POLICY "Users can update their own notifications" ON "public"."notifications" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own passes" ON "public"."passes" FOR UPDATE USING (("user_id" = ("auth"."uid"())::"text"));



CREATE POLICY "Users can update their own request limits" ON "public"."user_request_limits" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view blocks affecting them" ON "public"."user_blocks" FOR SELECT USING (("auth"."uid"() = "blocked_user_id"));



CREATE POLICY "Users can view messages in their chats" ON "public"."chat_messages" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."speed_dating_chats"
  WHERE (("speed_dating_chats"."id" = "chat_messages"."chat_id") AND (("speed_dating_chats"."user_id" = "auth"."uid"()) OR ("speed_dating_chats"."speaker_id" = "auth"."uid"()))))));



CREATE POLICY "Users can view their meeting chats" ON "public"."meeting_chats" FOR SELECT USING (("meeting_id" IN ( SELECT "meeting_participants"."meeting_id"
   FROM "public"."meeting_participants"
  WHERE ("meeting_participants"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view their meeting participants" ON "public"."meeting_participants" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR ("meeting_id" IN ( SELECT "meetings"."id"
   FROM "public"."meetings"
  WHERE ("meetings"."speaker_id" IN ( SELECT "bsl_speakers"."id"
           FROM "public"."bsl_speakers"
          WHERE ("bsl_speakers"."user_id" = "auth"."uid"())))))));



CREATE POLICY "Users can view their meetings" ON "public"."meetings" FOR SELECT USING ((("requester_id" = "auth"."uid"()) OR ("speaker_id" IN ( SELECT "bsl_speakers"."id"
   FROM "public"."bsl_speakers"
  WHERE ("bsl_speakers"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view their own boost transactions" ON "public"."boost_transactions" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own chats" ON "public"."speed_dating_chats" FOR SELECT USING ((("auth"."uid"() = "user_id") OR ("auth"."uid"() = "speaker_id")));



CREATE POLICY "Users can view their own limits" ON "public"."pass_request_limits" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own meeting requests" ON "public"."meeting_requests" FOR SELECT USING (("auth"."uid"() = "requester_id"));



CREATE POLICY "Users can view their own meetings" ON "public"."meetings" FOR SELECT USING ((("requester_id" = "auth"."uid"()) OR ("speaker_id" IN ( SELECT "bsl_speakers"."id"
   FROM "public"."bsl_speakers"
  WHERE ("bsl_speakers"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view their own notifications" ON "public"."notifications" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own passes" ON "public"."passes" FOR SELECT USING (("user_id" = ("auth"."uid"())::"text"));



CREATE POLICY "Users can view their own request limits" ON "public"."user_request_limits" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own subpasses" ON "public"."subpasses" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."passes"
  WHERE (("passes"."id" = "subpasses"."pass_id") AND ("passes"."user_id" = ("auth"."uid"())::"text")))));



CREATE POLICY "audit_select" ON "public"."bsl_audit" FOR SELECT USING (true);



CREATE POLICY "bookings_insert" ON "public"."bsl_bookings" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."bsl_tickets" "t"
  WHERE (("t"."userid" = "auth"."uid"()) AND ("t"."verified" = true)))));



CREATE POLICY "bookings_select" ON "public"."bsl_bookings" FOR SELECT USING ((("attendeeid" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."bsl_speakers" "s"
  WHERE ("s"."id" = "bsl_bookings"."speakerid")))));



CREATE POLICY "bookings_update" ON "public"."bsl_bookings" FOR UPDATE USING ((("attendeeid" = "auth"."uid"()) OR ((COALESCE("current_setting"('request.jwt.claims'::"text", true), ''::"text") <> ''::"text") AND ((("current_setting"('request.jwt.claims'::"text", true))::"jsonb" ->> 'role'::"text") = 'service_role'::"text"))));



ALTER TABLE "public"."boost_transactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."bsl_audit" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."bsl_bookings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."bsl_speakers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."bsl_tickets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."chat_messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."event_agenda" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."meeting_chats" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."meeting_participants" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."meeting_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."meetings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."newsletter_subscribers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pass_request_limits" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."passes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."speaker_availability" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "speakers_insert_own" ON "public"."bsl_speakers" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "speakers_select" ON "public"."bsl_speakers" FOR SELECT USING (true);



CREATE POLICY "speakers_update_own" ON "public"."bsl_speakers" FOR UPDATE USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."speed_dating_chats" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subpasses" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tickets_select" ON "public"."bsl_tickets" FOR SELECT USING (("auth"."uid"() = "userid"));



ALTER TABLE "public"."user_blocks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_request_limits" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."accept_meeting_request"("p_meeting_request_id" "uuid", "p_speaker_id" "text", "p_scheduled_at" timestamp with time zone, "p_location" "text", "p_meeting_link" "text", "p_notes" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."accept_meeting_request"("p_meeting_request_id" "uuid", "p_speaker_id" "text", "p_scheduled_at" timestamp with time zone, "p_location" "text", "p_meeting_link" "text", "p_notes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."accept_meeting_request"("p_meeting_request_id" "uuid", "p_speaker_id" "text", "p_scheduled_at" timestamp with time zone, "p_location" "text", "p_meeting_link" "text", "p_notes" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."accept_meeting_request_debug"("p_meeting_request_id" "uuid", "p_speaker_id" "text", "p_scheduled_at" timestamp with time zone, "p_location" "text", "p_meeting_link" "text", "p_notes" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."accept_meeting_request_debug"("p_meeting_request_id" "uuid", "p_speaker_id" "text", "p_scheduled_at" timestamp with time zone, "p_location" "text", "p_meeting_link" "text", "p_notes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."accept_meeting_request_debug"("p_meeting_request_id" "uuid", "p_speaker_id" "text", "p_scheduled_at" timestamp with time zone, "p_location" "text", "p_meeting_link" "text", "p_notes" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."add_meeting_chat_message"("p_meeting_id" "uuid", "p_sender_id" "uuid", "p_message" "text", "p_message_type" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."add_meeting_chat_message"("p_meeting_id" "uuid", "p_sender_id" "uuid", "p_message" "text", "p_message_type" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_meeting_chat_message"("p_meeting_id" "uuid", "p_sender_id" "uuid", "p_message" "text", "p_message_type" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_priority_score"("p_boost_amount" numeric, "p_ticket_type" "text", "p_created_at" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_priority_score"("p_boost_amount" numeric, "p_ticket_type" "text", "p_created_at" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_priority_score"("p_boost_amount" numeric, "p_ticket_type" "text", "p_created_at" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."can_make_meeting_request"("p_user_id" "uuid", "p_speaker_id" "text", "p_boost_amount" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."can_make_meeting_request"("p_user_id" "uuid", "p_speaker_id" "text", "p_boost_amount" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_make_meeting_request"("p_user_id" "uuid", "p_speaker_id" "text", "p_boost_amount" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."can_send_meeting_request"("p_user_id" "uuid", "p_event_id" "text", "p_ticket_type" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."can_send_meeting_request"("p_user_id" "uuid", "p_event_id" "text", "p_ticket_type" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_send_meeting_request"("p_user_id" "uuid", "p_event_id" "text", "p_ticket_type" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_default_pass"("p_user_id" "uuid", "p_pass_type" "public"."pass_type") TO "anon";
GRANT ALL ON FUNCTION "public"."create_default_pass"("p_user_id" "uuid", "p_pass_type" "public"."pass_type") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_default_pass"("p_user_id" "uuid", "p_pass_type" "public"."pass_type") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_notification"("p_user_id" "uuid", "p_type" "text", "p_title" "text", "p_message" "text", "p_meeting_request_id" "uuid", "p_speaker_id" "text", "p_is_urgent" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."create_notification"("p_user_id" "uuid", "p_type" "text", "p_title" "text", "p_message" "text", "p_meeting_request_id" "uuid", "p_speaker_id" "text", "p_is_urgent" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_notification"("p_user_id" "uuid", "p_type" "text", "p_title" "text", "p_message" "text", "p_meeting_request_id" "uuid", "p_speaker_id" "text", "p_is_urgent" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."decline_meeting_request"("p_meeting_request_id" "uuid", "p_speaker_id" "text", "p_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."decline_meeting_request"("p_meeting_request_id" "uuid", "p_speaker_id" "text", "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."decline_meeting_request"("p_meeting_request_id" "uuid", "p_speaker_id" "text", "p_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."expire_old_meeting_requests"() TO "anon";
GRANT ALL ON FUNCTION "public"."expire_old_meeting_requests"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."expire_old_meeting_requests"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_meeting_chat_messages"("p_meeting_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_meeting_chat_messages"("p_meeting_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_meeting_chat_messages"("p_meeting_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_meeting_requests_for_speaker"("p_speaker_id" "text", "p_user_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_meeting_requests_for_speaker"("p_speaker_id" "text", "p_user_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_meeting_requests_for_speaker"("p_speaker_id" "text", "p_user_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_meeting_requests_with_meeting_id"("p_user_id" "uuid", "p_speaker_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_meeting_requests_with_meeting_id"("p_user_id" "uuid", "p_speaker_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_meeting_requests_with_meeting_id"("p_user_id" "uuid", "p_speaker_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_notification_priority"("p_ticket_type" "text", "p_boost_amount" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."get_notification_priority"("p_ticket_type" "text", "p_boost_amount" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_notification_priority"("p_ticket_type" "text", "p_boost_amount" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_pass_type_limits"("p_pass_type" "public"."pass_type") TO "anon";
GRANT ALL ON FUNCTION "public"."get_pass_type_limits"("p_pass_type" "public"."pass_type") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_pass_type_limits"("p_pass_type" "public"."pass_type") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_speaker_meeting_requests"("p_speaker_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_speaker_meeting_requests"("p_speaker_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_speaker_meeting_requests"("p_speaker_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_meeting_request_counts"("p_user_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_meeting_request_counts"("p_user_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_meeting_request_counts"("p_user_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_meetings"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_meetings"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_meetings"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_pass_info"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_pass_info"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_pass_info"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."insert_meeting_request"("p_requester_id" "text", "p_speaker_id" "text", "p_speaker_name" "text", "p_requester_name" "text", "p_requester_company" "text", "p_requester_title" "text", "p_requester_ticket_type" "text", "p_meeting_type" "text", "p_message" "text", "p_note" "text", "p_boost_amount" numeric, "p_duration_minutes" integer, "p_expires_at" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."insert_meeting_request"("p_requester_id" "text", "p_speaker_id" "text", "p_speaker_name" "text", "p_requester_name" "text", "p_requester_company" "text", "p_requester_title" "text", "p_requester_ticket_type" "text", "p_meeting_type" "text", "p_message" "text", "p_note" "text", "p_boost_amount" numeric, "p_duration_minutes" integer, "p_expires_at" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."insert_meeting_request"("p_requester_id" "text", "p_speaker_id" "text", "p_speaker_name" "text", "p_requester_name" "text", "p_requester_company" "text", "p_requester_title" "text", "p_requester_ticket_type" "text", "p_meeting_type" "text", "p_message" "text", "p_note" "text", "p_boost_amount" numeric, "p_duration_minutes" integer, "p_expires_at" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."send_meeting_chat_message"("p_meeting_id" "uuid", "p_sender_id" "uuid", "p_message" "text", "p_message_type" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."send_meeting_chat_message"("p_meeting_id" "uuid", "p_sender_id" "uuid", "p_message" "text", "p_message_type" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."send_meeting_chat_message"("p_meeting_id" "uuid", "p_sender_id" "uuid", "p_message" "text", "p_message_type" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."send_prioritized_notification"("p_speaker_id" "text", "p_requester_name" "text", "p_requester_company" "text", "p_ticket_type" "text", "p_boost_amount" numeric, "p_meeting_request_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."send_prioritized_notification"("p_speaker_id" "text", "p_requester_name" "text", "p_requester_company" "text", "p_ticket_type" "text", "p_boost_amount" numeric, "p_meeting_request_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."send_prioritized_notification"("p_speaker_id" "text", "p_requester_name" "text", "p_requester_company" "text", "p_ticket_type" "text", "p_boost_amount" numeric, "p_meeting_request_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."toggle_user_block"("p_speaker_id" "text", "p_user_id" "uuid", "p_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."toggle_user_block"("p_speaker_id" "text", "p_user_id" "uuid", "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."toggle_user_block"("p_speaker_id" "text", "p_user_id" "uuid", "p_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_pass_after_request"("p_user_id" "uuid", "p_boost_amount" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."update_pass_after_request"("p_user_id" "uuid", "p_boost_amount" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_pass_after_request"("p_user_id" "uuid", "p_boost_amount" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_pass_after_response"("p_user_id" "uuid", "p_meeting_request_id" "uuid", "p_status" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."update_pass_after_response"("p_user_id" "uuid", "p_meeting_request_id" "uuid", "p_status" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_pass_after_response"("p_user_id" "uuid", "p_meeting_request_id" "uuid", "p_status" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_request_limits_after_send"("p_user_id" "uuid", "p_event_id" "text", "p_ticket_type" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."update_request_limits_after_send"("p_user_id" "uuid", "p_event_id" "text", "p_ticket_type" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_request_limits_after_send"("p_user_id" "uuid", "p_event_id" "text", "p_ticket_type" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON TABLE "public"."boost_transactions" TO "anon";
GRANT ALL ON TABLE "public"."boost_transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."boost_transactions" TO "service_role";



GRANT ALL ON TABLE "public"."bsl_audit" TO "anon";
GRANT ALL ON TABLE "public"."bsl_audit" TO "authenticated";
GRANT ALL ON TABLE "public"."bsl_audit" TO "service_role";



GRANT ALL ON SEQUENCE "public"."bsl_audit_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."bsl_audit_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."bsl_audit_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."bsl_bookings" TO "anon";
GRANT ALL ON TABLE "public"."bsl_bookings" TO "authenticated";
GRANT ALL ON TABLE "public"."bsl_bookings" TO "service_role";



GRANT ALL ON TABLE "public"."bsl_speakers" TO "anon";
GRANT ALL ON TABLE "public"."bsl_speakers" TO "authenticated";
GRANT ALL ON TABLE "public"."bsl_speakers" TO "service_role";



GRANT ALL ON TABLE "public"."bsl_tickets" TO "anon";
GRANT ALL ON TABLE "public"."bsl_tickets" TO "authenticated";
GRANT ALL ON TABLE "public"."bsl_tickets" TO "service_role";



GRANT ALL ON TABLE "public"."chat_messages" TO "anon";
GRANT ALL ON TABLE "public"."chat_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."chat_messages" TO "service_role";



GRANT ALL ON TABLE "public"."event_agenda" TO "anon";
GRANT ALL ON TABLE "public"."event_agenda" TO "authenticated";
GRANT ALL ON TABLE "public"."event_agenda" TO "service_role";



GRANT ALL ON TABLE "public"."events" TO "anon";
GRANT ALL ON TABLE "public"."events" TO "authenticated";
GRANT ALL ON TABLE "public"."events" TO "service_role";



GRANT ALL ON TABLE "public"."meeting_chats" TO "anon";
GRANT ALL ON TABLE "public"."meeting_chats" TO "authenticated";
GRANT ALL ON TABLE "public"."meeting_chats" TO "service_role";



GRANT ALL ON TABLE "public"."meeting_participants" TO "anon";
GRANT ALL ON TABLE "public"."meeting_participants" TO "authenticated";
GRANT ALL ON TABLE "public"."meeting_participants" TO "service_role";



GRANT ALL ON TABLE "public"."meeting_requests" TO "anon";
GRANT ALL ON TABLE "public"."meeting_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."meeting_requests" TO "service_role";



GRANT ALL ON TABLE "public"."meetings" TO "anon";
GRANT ALL ON TABLE "public"."meetings" TO "authenticated";
GRANT ALL ON TABLE "public"."meetings" TO "service_role";



GRANT ALL ON TABLE "public"."newsletter_subscribers" TO "anon";
GRANT ALL ON TABLE "public"."newsletter_subscribers" TO "authenticated";
GRANT ALL ON TABLE "public"."newsletter_subscribers" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."pass_request_limits" TO "anon";
GRANT ALL ON TABLE "public"."pass_request_limits" TO "authenticated";
GRANT ALL ON TABLE "public"."pass_request_limits" TO "service_role";



GRANT ALL ON TABLE "public"."passes" TO "anon";
GRANT ALL ON TABLE "public"."passes" TO "authenticated";
GRANT ALL ON TABLE "public"."passes" TO "service_role";



GRANT ALL ON TABLE "public"."speaker_availability" TO "anon";
GRANT ALL ON TABLE "public"."speaker_availability" TO "authenticated";
GRANT ALL ON TABLE "public"."speaker_availability" TO "service_role";



GRANT ALL ON TABLE "public"."speed_dating_chats" TO "anon";
GRANT ALL ON TABLE "public"."speed_dating_chats" TO "authenticated";
GRANT ALL ON TABLE "public"."speed_dating_chats" TO "service_role";



GRANT ALL ON TABLE "public"."subpasses" TO "anon";
GRANT ALL ON TABLE "public"."subpasses" TO "authenticated";
GRANT ALL ON TABLE "public"."subpasses" TO "service_role";



GRANT ALL ON TABLE "public"."user_blocks" TO "anon";
GRANT ALL ON TABLE "public"."user_blocks" TO "authenticated";
GRANT ALL ON TABLE "public"."user_blocks" TO "service_role";



GRANT ALL ON TABLE "public"."user_request_limits" TO "anon";
GRANT ALL ON TABLE "public"."user_request_limits" TO "authenticated";
GRANT ALL ON TABLE "public"."user_request_limits" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







RESET ALL;
