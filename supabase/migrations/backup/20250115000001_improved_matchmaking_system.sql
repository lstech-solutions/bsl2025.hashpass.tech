-- Improved Matchmaking System
-- BSL2025 Speed Dating with Ticket-based Access Levels

-- Add request limits tracking table
CREATE TABLE IF NOT EXISTS user_request_limits (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    event_id TEXT NOT NULL,
    ticket_type TEXT NOT NULL CHECK (ticket_type IN ('general', 'business', 'vip')),
    
    -- Request counters
    total_requests_sent INTEGER DEFAULT 0,
    successful_requests INTEGER DEFAULT 0,
    rejected_requests INTEGER DEFAULT 0,
    
    -- Time-based limits
    last_request_at TIMESTAMP WITH TIME ZONE,
    next_request_allowed_at TIMESTAMP WITH TIME ZONE,
    
    -- Boost tracking
    total_boosts_used INTEGER DEFAULT 0,
    total_boost_amount DECIMAL(10,2) DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(user_id, event_id)
);

-- Add speed dating chat table
CREATE TABLE IF NOT EXISTS speed_dating_chats (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    meeting_request_id UUID NOT NULL REFERENCES meeting_requests(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    speaker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Chat details
    chat_duration_minutes INTEGER DEFAULT 15,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    
    -- Chat status
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'ended', 'cancelled')),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add chat messages table
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    chat_id UUID NOT NULL REFERENCES speed_dating_chats(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Message content
    message TEXT NOT NULL,
    message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),
    
    -- Status
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Update meeting_requests table to add note field constraint
ALTER TABLE meeting_requests 
ADD CONSTRAINT check_note_length CHECK (char_length(note) <= 120);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_request_limits_user_event ON user_request_limits(user_id, event_id);
CREATE INDEX IF NOT EXISTS idx_user_request_limits_ticket_type ON user_request_limits(ticket_type);
CREATE INDEX IF NOT EXISTS idx_speed_dating_chats_meeting_request ON speed_dating_chats(meeting_request_id);
CREATE INDEX IF NOT EXISTS idx_speed_dating_chats_users ON speed_dating_chats(user_id, speaker_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_chat ON chat_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON chat_messages(sender_id);

-- Row Level Security Policies

-- User Request Limits Policies
ALTER TABLE user_request_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own request limits" ON user_request_limits
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own request limits" ON user_request_limits
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can insert request limits" ON user_request_limits
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Speed Dating Chats Policies
ALTER TABLE speed_dating_chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own chats" ON speed_dating_chats
    FOR SELECT USING (auth.uid() = user_id OR auth.uid() = speaker_id);

CREATE POLICY "Users can update their own chats" ON speed_dating_chats
    FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = speaker_id);

CREATE POLICY "System can create chats" ON speed_dating_chats
    FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.uid() = speaker_id);

-- Chat Messages Policies
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages in their chats" ON chat_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM speed_dating_chats 
            WHERE id = chat_messages.chat_id 
            AND (user_id = auth.uid() OR speaker_id = auth.uid())
        )
    );

CREATE POLICY "Users can send messages in their chats" ON chat_messages
    FOR INSERT WITH CHECK (
        sender_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM speed_dating_chats 
            WHERE id = chat_messages.chat_id 
            AND (user_id = auth.uid() OR speaker_id = auth.uid())
        )
    );

CREATE POLICY "Users can update their own messages" ON chat_messages
    FOR UPDATE USING (sender_id = auth.uid());

-- Functions

-- Function to check if user can send request
CREATE OR REPLACE FUNCTION can_send_meeting_request(
    p_user_id UUID,
    p_event_id TEXT,
    p_ticket_type TEXT
) RETURNS BOOLEAN AS $$
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
$$ LANGUAGE plpgsql;

-- Function to update request limits after sending request
CREATE OR REPLACE FUNCTION update_request_limits_after_send(
    p_user_id UUID,
    p_event_id TEXT,
    p_ticket_type TEXT
) RETURNS VOID AS $$
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
$$ LANGUAGE plpgsql;

-- Function to create speed dating chat when meeting is accepted
CREATE OR REPLACE FUNCTION create_speed_dating_chat() RETURNS TRIGGER AS $$
BEGIN
    -- Only create chat when status changes to 'accepted'
    IF OLD.status != 'accepted' AND NEW.status = 'accepted' THEN
        INSERT INTO speed_dating_chats (
            meeting_request_id, user_id, speaker_id, chat_duration_minutes
        ) VALUES (
            NEW.id, NEW.requester_id, NEW.speaker_id, NEW.duration_minutes
        );
        
        -- Create system message in chat
        INSERT INTO chat_messages (chat_id, sender_id, message, message_type)
        SELECT 
            sc.id,
            NEW.speaker_id,
            'Meeting accepted! You can now chat for ' || NEW.duration_minutes || ' minutes.',
            'system'
        FROM speed_dating_chats sc
        WHERE sc.meeting_request_id = NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create chat when meeting is accepted
CREATE TRIGGER trigger_create_speed_dating_chat
    AFTER UPDATE ON meeting_requests
    FOR EACH ROW
    EXECUTE FUNCTION create_speed_dating_chat();

-- Function to get notification priority
CREATE OR REPLACE FUNCTION get_notification_priority(
    p_ticket_type TEXT,
    p_boost_amount DECIMAL
) RETURNS INTEGER AS $$
BEGIN
    -- Priority scoring: VIP > Business > General
    CASE p_ticket_type
        WHEN 'vip' THEN RETURN 100 + p_boost_amount;
        WHEN 'business' THEN RETURN 50 + p_boost_amount;
        WHEN 'general' THEN RETURN 10 + p_boost_amount;
        ELSE RETURN 0;
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- Function to send prioritized notification
CREATE OR REPLACE FUNCTION send_prioritized_notification(
    p_speaker_id UUID,
    p_requester_name TEXT,
    p_requester_company TEXT,
    p_ticket_type TEXT,
    p_boost_amount DECIMAL,
    p_meeting_request_id UUID
) RETURNS UUID AS $$
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
    
    -- Create notification
    INSERT INTO notifications (
        user_id, type, title, message, 
        meeting_request_id, speaker_id, is_urgent
    ) VALUES (
        p_speaker_id, 'meeting_request', notification_title, notification_message,
        p_meeting_request_id, p_speaker_id, p_boost_amount > 0 OR p_ticket_type = 'vip'
    ) RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$$ LANGUAGE plpgsql;

-- Update the meeting request creation trigger to use new notification system
CREATE OR REPLACE FUNCTION notify_meeting_request_created() RETURNS TRIGGER AS $$
BEGIN
    -- Send prioritized notification
    PERFORM send_prioritized_notification(
        NEW.speaker_id,
        NEW.requester_name,
        NEW.requester_company,
        NEW.requester_ticket_type,
        NEW.boost_amount,
        NEW.id
    );
    
    -- Update request limits
    PERFORM update_request_limits_after_send(
        NEW.requester_id,
        'bsl2025', -- Event ID
        NEW.requester_ticket_type
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT ALL ON user_request_limits TO authenticated;
GRANT ALL ON speed_dating_chats TO authenticated;
GRANT ALL ON chat_messages TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
