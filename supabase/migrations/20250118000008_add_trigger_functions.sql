-- Add missing trigger functions for meeting_requests table

-- 1. calculate_priority_score function
CREATE OR REPLACE FUNCTION calculate_priority_score(
    p_boost_amount numeric,
    p_ticket_type text,
    p_created_at timestamp with time zone
)
RETURNS integer
LANGUAGE plpgsql
AS $$
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
$$;

-- 2. update_meeting_priority function
CREATE OR REPLACE FUNCTION update_meeting_priority()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.priority_score := calculate_priority_score(
        NEW.boost_amount,
        NEW.requester_ticket_type,
        NEW.created_at
    );
    RETURN NEW;
END;
$$;

-- 3. notify_meeting_request_created function
CREATE OR REPLACE FUNCTION notify_meeting_request_created()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    -- Send notification to speaker
    PERFORM pg_notify(
        'meeting_request_created',
        json_build_object(
            'request_id', NEW.id,
            'speaker_id', NEW.speaker_id,
            'requester_name', NEW.requester_name,
            'meeting_type', NEW.meeting_type
        )::text
    );
    RETURN NEW;
END;
$$;

-- 4. notify_meeting_status_change function
CREATE OR REPLACE FUNCTION notify_meeting_status_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    -- Only notify if status actually changed
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        PERFORM pg_notify(
            'meeting_status_changed',
            json_build_object(
                'request_id', NEW.id,
                'requester_id', NEW.requester_id,
                'old_status', OLD.status,
                'new_status', NEW.status
            )::text
        );
    END IF;
    RETURN NEW;
END;
$$;

-- 5. create_speed_dating_chat function
CREATE OR REPLACE FUNCTION create_speed_dating_chat()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    -- Only create chat if status changed to 'accepted'
    IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'accepted' THEN
        INSERT INTO speed_dating_chats (
            meeting_request_id,
            speaker_id,
            requester_id,
            status,
            created_at
        ) VALUES (
            NEW.id,
            NEW.speaker_id,
            NEW.requester_id,
            'active',
            NOW()
        );
    END IF;
    RETURN NEW;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION calculate_priority_score(numeric, text, timestamp with time zone) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_priority_score(numeric, text, timestamp with time zone) TO anon;
GRANT EXECUTE ON FUNCTION update_meeting_priority() TO authenticated;
GRANT EXECUTE ON FUNCTION update_meeting_priority() TO anon;
GRANT EXECUTE ON FUNCTION notify_meeting_request_created() TO authenticated;
GRANT EXECUTE ON FUNCTION notify_meeting_request_created() TO anon;
GRANT EXECUTE ON FUNCTION notify_meeting_status_change() TO authenticated;
GRANT EXECUTE ON FUNCTION notify_meeting_status_change() TO anon;
GRANT EXECUTE ON FUNCTION create_speed_dating_chat() TO authenticated;
GRANT EXECUTE ON FUNCTION create_speed_dating_chat() TO anon;

-- Add comments
COMMENT ON FUNCTION calculate_priority_score(numeric, text, timestamp with time zone) IS 'Calculates priority score for meeting requests';
COMMENT ON FUNCTION update_meeting_priority() IS 'Updates meeting request priority score on insert/update';
COMMENT ON FUNCTION notify_meeting_request_created() IS 'Notifies when a new meeting request is created';
COMMENT ON FUNCTION notify_meeting_status_change() IS 'Notifies when meeting request status changes';
COMMENT ON FUNCTION create_speed_dating_chat() IS 'Creates speed dating chat when meeting request is accepted';
