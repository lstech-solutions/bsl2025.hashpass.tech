import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../hooks/useAuth';
import { MaterialIcons } from '@expo/vector-icons';
import { useRealtimeChat, ChatMessage } from '../hooks/useRealtimeChat';
import { useChatScroll } from '../hooks/useChatScroll';
import { useMessagesQuery } from '../hooks/useMessagesQuery';
import { storeMessages } from '../lib/store-messages';

interface RealtimeChatProps {
  roomName: string;
  username: string;
  meetingId: string;
  messages?: ChatMessage[];
  onMessage?: (messages: ChatMessage[]) => void;
}

export default function RealtimeChat({ 
  roomName, 
  username, 
  meetingId,
  messages: initialMessages,
  onMessage 
}: RealtimeChatProps) {
  const { isDark, colors } = useTheme();
  const { user } = useAuth();
  const styles = getStyles(isDark, colors);

  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);

  // Use real-time chat hook
  const { messages: realtimeMessages, sendMessage, isConnected } = useRealtimeChat({
    roomName,
    username,
  });

  // Use messages query for persistence - only when user is available
  const { data: persistedMessages, loading, error, storeMessages: storeMessagesFn } = useMessagesQuery({
    meetingId,
    userId: user?.id || '', // Will be validated in the hook
  });

  // Use chat scroll hook
  const { containerRef, scrollToBottom } = useChatScroll();

  // Combine initial messages, persisted messages, and real-time messages
  const allMessages = [
    ...(initialMessages || []),
    ...(persistedMessages || []),
    ...realtimeMessages,
  ].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [allMessages.length, scrollToBottom]);

  // Handle message sending
  const handleSendMessage = async () => {
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      // Send via real-time chat
      await sendMessage(newMessage.trim(), 'text');
      
      // Store in database
      if (onMessage) {
        const newChatMessage: ChatMessage = {
          id: crypto.randomUUID(),
          content: newMessage.trim(),
          user: {
            name: username,
            id: user?.id || username,
          },
          createdAt: new Date().toISOString(),
          messageType: 'text',
        };
        
        onMessage([...allMessages, newChatMessage]);
      }

      // Also store via the query hook
      if (storeMessagesFn) {
        const newChatMessage: ChatMessage = {
          id: crypto.randomUUID(),
          content: newMessage.trim(),
          user: {
            name: username,
            id: user?.id || username,
          },
          createdAt: new Date().toISOString(),
          messageType: 'text',
        };
        
        await storeMessages([newChatMessage], meetingId, user?.id || '');
      }

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessage = (message: ChatMessage, index: number) => {
    const isOwnMessage = message.user.id === user?.id;
    const isSystemMessage = message.messageType === 'system';

    return (
      <View
        key={message.id}
        style={[
          styles.messageContainer,
          isOwnMessage && styles.ownMessage,
          isSystemMessage && styles.systemMessage,
        ]}
      >
        {!isSystemMessage && (
          <View style={styles.messageHeader}>
            <Text style={styles.senderName}>
              {message.user.name}
            </Text>
            <Text style={styles.messageTime}>
              {formatTime(message.createdAt)}
            </Text>
          </View>
        )}
        <Text style={[
          styles.messageText,
          isSystemMessage && styles.systemMessageText,
          isOwnMessage && !isSystemMessage && styles.ownMessageText,
        ]}>
          {message.content}
        </Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading chat...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <MaterialIcons name="error-outline" size={48} color="#F44336" />
        <Text style={styles.errorTitle}>Failed to Load Chat</Text>
        <Text style={styles.errorMessage}>{error}</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Connection Status */}
      <View style={styles.statusBar}>
        <View style={[styles.statusIndicator, { backgroundColor: isConnected ? '#4CAF50' : '#F44336' }]} />
        <Text style={styles.statusText}>
          {isConnected ? 'Connected' : 'Connecting...'}
        </Text>
      </View>

      {/* Messages */}
      <ScrollView
        ref={containerRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
      >
        {allMessages.map((message, index) => renderMessage(message, index))}
      </ScrollView>

      {/* Message Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="Type your message..."
          placeholderTextColor={colors.text.secondary}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!newMessage.trim() || sending) && styles.sendButtonDisabled]}
          onPress={handleSendMessage}
          disabled={!newMessage.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <MaterialIcons name="send" size={20} color="white" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const getStyles = (isDark: boolean, colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background?.default || (isDark ? '#000000' : '#ffffff'),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background?.default || (isDark ? '#000000' : '#ffffff'),
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.text?.secondary || (isDark ? '#cccccc' : '#666666'),
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: colors.background?.default || (isDark ? '#000000' : '#ffffff'),
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text?.primary || (isDark ? '#ffffff' : '#000000'),
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: colors.text?.secondary || (isDark ? '#cccccc' : '#666666'),
    textAlign: 'center',
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.background?.paper || (isDark ? '#1a1a1a' : '#f5f5f5'),
    borderBottomWidth: 1,
    borderBottomColor: isDark ? '#333333' : '#e0e0e0',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 12,
    color: colors.text?.secondary || (isDark ? '#cccccc' : '#666666'),
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 8,
  },
  messageContainer: {
    marginBottom: 12,
    maxWidth: '80%',
  },
  ownMessage: {
    alignSelf: 'flex-end',
  },
  systemMessage: {
    alignSelf: 'center',
    maxWidth: '100%',
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text?.secondary || (isDark ? '#cccccc' : '#666666'),
  },
  messageTime: {
    fontSize: 12,
    color: colors.text?.secondary || (isDark ? '#cccccc' : '#666666'),
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
    color: colors.text?.primary || (isDark ? '#ffffff' : '#000000'),
    backgroundColor: isDark ? '#2a2a2a' : '#f5f5f5',
    padding: 12,
    borderRadius: 16,
  },
  ownMessageText: {
    backgroundColor: colors.primary || '#007AFF',
    color: 'white',
  },
  systemMessageText: {
    backgroundColor: 'transparent',
    color: colors.text?.secondary || (isDark ? '#cccccc' : '#666666'),
    textAlign: 'center',
    fontStyle: 'italic',
    padding: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: isDark ? '#333333' : '#f0f0f0',
    backgroundColor: colors.background?.paper || (isDark ? '#1a1a1a' : '#ffffff'),
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: isDark ? '#333333' : '#e0e0e0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 12,
    fontSize: 16,
    color: colors.text?.primary || (isDark ? '#ffffff' : '#000000'),
    backgroundColor: colors.background?.default || (isDark ? '#000000' : '#ffffff'),
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: colors.primary || '#007AFF',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: isDark ? '#333333' : '#e0e0e0',
  },
});
