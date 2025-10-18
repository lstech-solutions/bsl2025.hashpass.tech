import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../../hooks/useTheme';
import { useAuth } from '../../../hooks/useAuth';
import RealtimeChat from '../../../components/RealtimeChat';
import { useMessagesQuery } from '../../../hooks/useMessagesQuery';
import { storeMessages } from '../../../lib/store-messages';
import { ChatMessage } from '../../../hooks/useRealtimeChat';

export default function ChatExamplePage() {
  const { isDark, colors } = useTheme();
  const { user } = useAuth();
  const styles = getStyles(isDark, colors);

  // Example meeting ID - in real usage, this would come from props or navigation
  const meetingId = 'example-meeting-id';
  const roomName = 'my-chat-room';
  const username = user?.email || 'john_doe';

  // Load initial messages
  const { data: messages } = useMessagesQuery({
    meetingId,
    userId: user?.id || '',
  });

  // Handle new messages
  const handleMessage = async (newMessages: ChatMessage[]) => {
    try {
      // Store messages in your database
      await storeMessages(newMessages, meetingId, user?.id || '');
    } catch (error) {
      console.error('Error storing messages:', error);
    }
  };

  return (
    <View style={styles.container}>
      <RealtimeChat
        roomName={roomName}
        username={username}
        meetingId={meetingId}
        messages={messages}
        onMessage={handleMessage}
      />
    </View>
  );
}

const getStyles = (isDark: boolean, colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background?.default || (isDark ? '#000000' : '#ffffff'),
  },
});
