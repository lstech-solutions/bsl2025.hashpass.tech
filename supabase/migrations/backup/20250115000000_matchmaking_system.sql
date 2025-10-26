-- Matchmaking System Database Schema
-- BSL2025 Real-time Meeting Requests and Notifications

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Meeting Requests Table
CREATE TABLE IF NOT EXISTS meeting_requests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    speaker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    speaker_name TEXT NOT NULL,
    requester_name TEXT NOT NULL,
    requester_company TEXT,
    requester_title TEXT,
    requester_ticket_type TEXT NOT NULL CHECK (requester_ticket_type IN ('general', 'business', 'vip')),
    
    -- Meeting Details
    preferred_date DATE,
    preferred_time TIME,
    duration_minutes INTEGER DEFAULT 15,
    meeting_type TEXT NOT NULL CHECK (meeting_type IN ('networking', 'business', 'mentorship', 'collaboration')),
    
    -- Request Content
    message TEXT NOT NULL,
    note TEXT, -- Special note to catch speaker attention
    boost_amount DECIMAL(10,2) DEFAULT 0, -- $VOI token boost
    boost_transaction_hash TEXT, -- Blockchain transaction hash
    
    -- Status and Timing
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired', 'completed', 'cancelled')),
    priority_score INTEGER DEFAULT 0, -- Calculated based on boost, ticket type, timing
    
    -- Availability Window
    availability_window_start TIMESTAMP WITH TIME ZONE,
    availability_window_end TIMESTAMP WITH TIME ZONE,
    
    -- Response Details
    speaker_response TEXT,
    speaker_response_at TIMESTAMP WITH TIME ZONE,
    meeting_scheduled_at TIMESTAMP WITH TIME ZONE,
    meeting_location TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '72 hours') -- 3 days window
    
    -- Constraints
    CONSTRAINT valid_boost_amount CHECK (boost_amount >= 0),
    CONSTRAINT valid_duration CHECK (duration_minutes BETWEEN 5 AND 60),
    CONSTRAINT valid_priority_score CHECK (priority_score >= 0)
);

-- Speaker Availability Table
CREATE TABLE IF NOT EXISTS speaker_availability (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    speaker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    speaker_name TEXT NOT NULL,
    
    -- Time Slots
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    duration_minutes INTEGER DEFAULT 15,
    
    -- Availability Details
    max_meetings_per_slot INTEGER DEFAULT 1,
    current_meetings_count INTEGER DEFAULT 0,
    is_available BOOLEAN DEFAULT true,
    
    -- Special Constraints
    requires_vip_ticket BOOLEAN DEFAULT false,
    requires_business_ticket BOOLEAN DEFAULT false,
    allows_general_ticket BOOLEAN DEFAULT true,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_time_slot CHECK (end_time > start_time),
    CONSTRAINT valid_meeting_count CHECK (current_meetings_count >= 0 AND current_meetings_count <= max_meetings_per_slot)
);

-- Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Notification Details
    type TEXT NOT NULL CHECK (type IN ('meeting_request', 'meeting_accepted', 'meeting_declined', 'meeting_reminder', 'boost_received', 'system_alert')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    
    -- Related Data
    meeting_request_id UUID REFERENCES meeting_requests(id) ON DELETE CASCADE,
    speaker_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Status
    is_read BOOLEAN DEFAULT false,
    is_urgent BOOLEAN DEFAULT false,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days')
);

-- Crypto Boost Transactions Table
CREATE TABLE IF NOT EXISTS boost_transactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    meeting_request_id UUID NOT NULL REFERENCES meeting_requests(id) ON DELETE CASCADE,
    
    -- Transaction Details
    amount DECIMAL(10,2) NOT NULL,
    token_symbol TEXT DEFAULT 'VOI',
    transaction_hash TEXT NOT NULL UNIQUE,
    block_number BIGINT,
    
    -- Status
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed')),
    confirmation_count INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    confirmed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_meeting_requests_requester ON meeting_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_meeting_requests_speaker ON meeting_requests(speaker_id);
CREATE INDEX IF NOT EXISTS idx_meeting_requests_status ON meeting_requests(status);
CREATE INDEX IF NOT EXISTS idx_meeting_requests_priority ON meeting_requests(priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_meeting_requests_expires ON meeting_requests(expires_at);

CREATE INDEX IF NOT EXISTS idx_speaker_availability_speaker ON speaker_availability(speaker_id);
CREATE INDEX IF NOT EXISTS idx_speaker_availability_date ON speaker_availability(date);
CREATE INDEX IF NOT EXISTS idx_speaker_availability_available ON speaker_availability(is_available);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

CREATE INDEX IF NOT EXISTS idx_boost_transactions_user ON boost_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_boost_transactions_hash ON boost_transactions(transaction_hash);

-- Row Level Security Policies

-- Meeting Requests Policies
ALTER TABLE meeting_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own meeting requests" ON meeting_requests
    FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = speaker_id);

CREATE POLICY "Users can create meeting requests" ON meeting_requests
    FOR INSERT WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Speakers can update their meeting requests" ON meeting_requests
    FOR UPDATE USING (auth.uid() = speaker_id);

-- Speaker Availability Policies
ALTER TABLE speaker_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view speaker availability" ON speaker_availability
    FOR SELECT USING (true);

CREATE POLICY "Speakers can manage their availability" ON speaker_availability
    FOR ALL USING (auth.uid() = speaker_id);

-- Notifications Policies
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications" ON notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- Boost Transactions Policies
ALTER TABLE boost_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own boost transactions" ON boost_transactions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create boost transactions" ON boost_transactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Functions

-- Function to calculate priority score
CREATE OR REPLACE FUNCTION calculate_priority_score(
    p_boost_amount DECIMAL,
    p_ticket_type TEXT,
    p_created_at TIMESTAMP WITH TIME ZONE
) RETURNS INTEGER AS $$
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
$$ LANGUAGE plpgsql;

-- Function to update meeting request priority
CREATE OR REPLACE FUNCTION update_meeting_priority() RETURNS TRIGGER AS $$
BEGIN
    NEW.priority_score := calculate_priority_score(
        NEW.boost_amount,
        NEW.requester_ticket_type,
        NEW.created_at
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update priority score
CREATE TRIGGER trigger_update_meeting_priority
    BEFORE INSERT OR UPDATE ON meeting_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_meeting_priority();

-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
    p_user_id UUID,
    p_type TEXT,
    p_title TEXT,
    p_message TEXT,
    p_meeting_request_id UUID DEFAULT NULL,
    p_speaker_id UUID DEFAULT NULL,
    p_is_urgent BOOLEAN DEFAULT false
) RETURNS UUID AS $$
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
$$ LANGUAGE plpgsql;

-- Function to check and expire old meeting requests
CREATE OR REPLACE FUNCTION expire_old_meeting_requests() RETURNS INTEGER AS $$
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
$$ LANGUAGE plpgsql;

-- Real-time triggers for notifications

-- Trigger when meeting request is created
CREATE OR REPLACE FUNCTION notify_meeting_request_created() RETURNS TRIGGER AS $$
BEGIN
    -- Notify the speaker
    PERFORM create_notification(
        NEW.speaker_id,
        'meeting_request',
        'New Meeting Request',
        NEW.requester_name || ' (' || NEW.requester_company || ') wants to meet with you',
        NEW.id,
        NEW.speaker_id,
        NEW.boost_amount > 0 -- Urgent if boosted
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_meeting_request_created
    AFTER INSERT ON meeting_requests
    FOR EACH ROW
    EXECUTE FUNCTION notify_meeting_request_created();

-- Trigger when meeting request status changes
CREATE OR REPLACE FUNCTION notify_meeting_status_change() RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status != NEW.status THEN
        CASE NEW.status
            WHEN 'accepted' THEN
                PERFORM create_notification(
                    NEW.requester_id,
                    'meeting_accepted',
                    'Meeting Request Accepted!',
                    NEW.speaker_name || ' has accepted your meeting request',
                    NEW.id,
                    NEW.speaker_id,
                    true
                );
            WHEN 'declined' THEN
                PERFORM create_notification(
                    NEW.requester_id,
                    'meeting_declined',
                    'Meeting Request Declined',
                    NEW.speaker_name || ' has declined your meeting request',
                    NEW.id,
                    NEW.speaker_id,
                    false
                );
        END CASE;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_meeting_status_change
    AFTER UPDATE ON meeting_requests
    FOR EACH ROW
    EXECUTE FUNCTION notify_meeting_status_change();

-- Sample data will be inserted separately after users are created

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
