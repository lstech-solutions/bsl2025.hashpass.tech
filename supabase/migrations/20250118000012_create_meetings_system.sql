-- Create comprehensive meetings system
-- This migration creates tables and functions for meeting management

-- 1. Create meetings table
CREATE TABLE IF NOT EXISTS public.meetings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_request_id UUID NOT NULL REFERENCES public.meeting_requests(id) ON DELETE CASCADE,
    speaker_id TEXT NOT NULL REFERENCES public.bsl_speakers(id) ON DELETE CASCADE,
    requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    speaker_name TEXT NOT NULL,
    requester_name TEXT NOT NULL,
    requester_company TEXT,
    requester_title TEXT,
    meeting_type TEXT NOT NULL DEFAULT 'networking',
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show')),
    scheduled_at TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER DEFAULT 15,
    location TEXT,
    meeting_link TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create meeting_chats table for internal coordination
CREATE TABLE IF NOT EXISTS public.meeting_chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    sender_type TEXT NOT NULL CHECK (sender_type IN ('speaker', 'requester')),
    message TEXT NOT NULL,
    message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'system', 'meeting_update')),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create meeting_participants table for easy access
CREATE TABLE IF NOT EXISTS public.meeting_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_type TEXT NOT NULL CHECK (user_type IN ('speaker', 'requester')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_meetings_speaker_id ON public.meetings(speaker_id);
CREATE INDEX IF NOT EXISTS idx_meetings_requester_id ON public.meetings(requester_id);
CREATE INDEX IF NOT EXISTS idx_meetings_status ON public.meetings(status);
CREATE INDEX IF NOT EXISTS idx_meetings_scheduled_at ON public.meetings(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_meeting_chats_meeting_id ON public.meeting_chats(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_chats_created_at ON public.meeting_chats(created_at);
CREATE INDEX IF NOT EXISTS idx_meeting_participants_meeting_id ON public.meeting_participants(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_participants_user_id ON public.meeting_participants(user_id);

-- 5. Create RLS policies for meetings
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_participants ENABLE ROW LEVEL SECURITY;

-- Meetings policies
CREATE POLICY "Users can view their own meetings" ON public.meetings
    FOR SELECT USING (
        requester_id = auth.uid() OR 
        speaker_id IN (SELECT id FROM public.bsl_speakers WHERE user_id = auth.uid())
    );

CREATE POLICY "Speakers can update their meetings" ON public.meetings
    FOR UPDATE USING (
        speaker_id IN (SELECT id FROM public.bsl_speakers WHERE user_id = auth.uid())
    );

-- Meeting chats policies
CREATE POLICY "Meeting participants can view chat messages" ON public.meeting_chats
    FOR SELECT USING (
        meeting_id IN (
            SELECT id FROM public.meetings 
            WHERE requester_id = auth.uid() OR 
            speaker_id IN (SELECT id FROM public.bsl_speakers WHERE user_id = auth.uid())
        )
    );

CREATE POLICY "Meeting participants can send messages" ON public.meeting_chats
    FOR INSERT WITH CHECK (
        meeting_id IN (
            SELECT id FROM public.meetings 
            WHERE requester_id = auth.uid() OR 
            speaker_id IN (SELECT id FROM public.bsl_speakers WHERE user_id = auth.uid())
        )
    );

-- Meeting participants policies
CREATE POLICY "Users can view their meeting participants" ON public.meeting_participants
    FOR SELECT USING (
        user_id = auth.uid() OR
        meeting_id IN (
            SELECT id FROM public.meetings 
            WHERE requester_id = auth.uid() OR 
            speaker_id IN (SELECT id FROM public.bsl_speakers WHERE user_id = auth.uid())
        )
    );

-- 6. Create function to accept meeting request and create meeting
CREATE OR REPLACE FUNCTION accept_meeting_request(
    p_meeting_request_id UUID,
    p_speaker_id TEXT,
    p_scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_location TEXT DEFAULT NULL,
    p_meeting_link TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
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

    -- Send system message to chat
    INSERT INTO public.meeting_chats (meeting_id, sender_id, sender_type, message, message_type)
    VALUES (
        new_meeting_id,
        (SELECT user_id FROM public.bsl_speakers WHERE id = p_speaker_id),
        'speaker',
        'Meeting accepted! You can now coordinate the details here.',
        'system'
    );

    -- Create notifications
    INSERT INTO public.notifications (user_id, type, message, meeting_id, sender_id)
    VALUES 
        (request_record.requester_id, 'meeting_accepted', 
         'Your meeting request with ' || request_record.speaker_name || ' has been accepted!', 
         new_meeting_id, (SELECT user_id FROM public.bsl_speakers WHERE id = p_speaker_id)),
        ((SELECT user_id FROM public.bsl_speakers WHERE id = p_speaker_id), 'meeting_created',
         'You have accepted a meeting with ' || request_record.requester_name || '. Coordinate details in the chat.',
         new_meeting_id, request_record.requester_id);

    result := json_build_object(
        'success', true,
        'meeting_id', new_meeting_id,
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

-- 7. Create function to decline meeting request
CREATE OR REPLACE FUNCTION decline_meeting_request(
    p_meeting_request_id UUID,
    p_speaker_id TEXT,
    p_reason TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    request_record RECORD;
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
        speaker_response = COALESCE(p_reason, 'Meeting request declined'),
        updated_at = NOW()
    WHERE id = p_meeting_request_id;

    -- Create notification
    INSERT INTO public.notifications (user_id, type, message, meeting_request_id, sender_id)
    VALUES (
        request_record.requester_id, 
        'meeting_declined', 
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

-- 8. Create function to send chat message
CREATE OR REPLACE FUNCTION send_meeting_chat_message(
    p_meeting_id UUID,
    p_sender_id UUID,
    p_message TEXT,
    p_message_type TEXT DEFAULT 'text'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
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

-- 9. Create function to get meeting chat messages
CREATE OR REPLACE FUNCTION get_meeting_chat_messages(
    p_meeting_id UUID,
    p_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
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

-- 10. Grant permissions
GRANT EXECUTE ON FUNCTION accept_meeting_request(UUID, TEXT, TIMESTAMP WITH TIME ZONE, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION decline_meeting_request(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION send_meeting_chat_message(UUID, UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_meeting_chat_messages(UUID, UUID) TO authenticated;

-- 11. Add comments
COMMENT ON TABLE public.meetings IS 'Stores accepted meeting details and coordination information';
COMMENT ON TABLE public.meeting_chats IS 'Internal chat system for meeting coordination between speakers and requesters';
COMMENT ON TABLE public.meeting_participants IS 'Tracks meeting participants and their activity';
COMMENT ON FUNCTION accept_meeting_request IS 'Accepts a meeting request and creates a meeting with chat system';
COMMENT ON FUNCTION decline_meeting_request IS 'Declines a meeting request with optional reason';
COMMENT ON FUNCTION send_meeting_chat_message IS 'Sends a message in the meeting chat';
COMMENT ON FUNCTION get_meeting_chat_messages IS 'Retrieves chat messages for a meeting';
