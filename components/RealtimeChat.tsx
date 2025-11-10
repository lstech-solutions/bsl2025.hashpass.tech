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
import SpeakerAvatar from './SpeakerAvatar';
import { supabase } from '../lib/supabase';

interface RealtimeChatProps {
  roomName: string;
  username: string;
  meetingId: string;
  messages?: ChatMessage[];
  onMessage?: (messages: ChatMessage[]) => void;
  otherParticipantId?: string; // User ID of the other participant
  otherParticipantName?: string; // Name of the other participant
  otherParticipantAvatar?: string; // Avatar URL of the other participant
}

// Helper function to generate user avatar URL
const generateUserAvatarUrl = (name: string): string => {
  const seed = name.toLowerCase().replace(/\s+/g, '-');
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
};

export default function RealtimeChat({ 
  roomName, 
  username, 
  meetingId,
  messages: initialMessages,
  onMessage,
  otherParticipantId,
  otherParticipantName,
  otherParticipantAvatar,
}: RealtimeChatProps) {
  const { isDark, colors } = useTheme();
  const { user } = useAuth();
  const styles = getStyles(isDark, colors);

  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [otherUserAvatar, setOtherUserAvatar] = useState<string | null>(null);
  const [presence, setPresence] = useState<{ [userId: string]: { isOnline: boolean; lastSeen: Date } }>({});

  // Load user avatar
  useEffect(() => {
    const loadUserAvatar = async () => {
      if (!user) return;
      
      // Try to get avatar from user metadata
      const avatarUrl = user.user_metadata?.avatar_url;
      if (avatarUrl) {
        setUserAvatar(avatarUrl);
      } else {
        // Generate avatar from name
        const name = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
        setUserAvatar(generateUserAvatarUrl(name));
      }
    };
    
    loadUserAvatar();
  }, [user]);

  // Load other participant avatar
  useEffect(() => {
    if (otherParticipantAvatar) {
      setOtherUserAvatar(otherParticipantAvatar);
    } else if (otherParticipantName) {
      setOtherUserAvatar(generateUserAvatarUrl(otherParticipantName));
    }
  }, [otherParticipantAvatar, otherParticipantName]);

  // Use real-time chat hook with presence tracking
  const { messages: realtimeMessages, sendMessage, isConnected, presence: chatPresence } = useRealtimeChat({
    roomName,
    username,
    userId: user?.id || '',
    otherParticipantId,
  });

  // Update presence state from hook
  useEffect(() => {
    if (chatPresence) {
      setPresence(chatPresence);
    }
  }, [chatPresence]);

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
    const isOwnMessage = message.user.id === user?.id || message.user.id === user?.email;
    const isSystemMessage = message.messageType === 'system';
    const messageAvatar = isOwnMessage ? userAvatar : otherUserAvatar;
    const messageName = isOwnMessage 
      ? (user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'You')
      : (otherParticipantName || message.user.name);

    return (
      <View
        key={message.id}
        style={[
          styles.messageWrapper,
          isOwnMessage && styles.ownMessageWrapper,
        ]}
      >
        {!isSystemMessage && (
          <View style={[
            styles.messageContainer,
            isOwnMessage && styles.ownMessage,
            isSystemMessage && styles.systemMessage,
          ]}>
            {!isOwnMessage && (
              <View style={styles.avatarContainer}>
                <SpeakerAvatar
                  name={messageName}
                  imageUrl={messageAvatar || undefined}
                  size={36}
                  showBorder={false}
                />
              </View>
            )}
            <View style={[
              styles.messageContent,
              isOwnMessage && styles.ownMessageContent,
            ]}>
              {!isOwnMessage && (
                <Text style={styles.senderName}>
                  {messageName}
                </Text>
              )}
              <View style={[
                styles.messageBubble,
                isOwnMessage && styles.ownMessageBubble,
              ]}>
                <Text style={[
                  styles.messageText,
                  isSystemMessage && styles.systemMessageText,
                  isOwnMessage && styles.ownMessageText,
                ]}>
                  {message.content}
                </Text>
              </View>
              <Text style={[
                styles.messageTime,
                isOwnMessage && styles.ownMessageTime,
              ]}>
                {formatTime(message.createdAt)}
              </Text>
            </View>
            {isOwnMessage && (
              <View style={styles.avatarContainer}>
                <SpeakerAvatar
                  name={messageName}
                  imageUrl={messageAvatar || undefined}
                  size={36}
                  showBorder={false}
                />
              </View>
            )}
          </View>
        )}
        {isSystemMessage && (
          <View style={styles.systemMessageContainer}>
            <Text style={styles.systemMessageText}>
              {message.content}
            </Text>
          </View>
        )}
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
      {/* Connection Status and Presence */}
      <View style={styles.statusBar}>
        <View style={styles.statusLeft}>
          <View style={[styles.statusIndicator, { backgroundColor: isConnected ? '#4CAF50' : '#F44336' }]} />
          <Text style={styles.statusText}>
            {isConnected ? 'Connected' : 'Connecting...'}
          </Text>
        </View>
        {otherParticipantId && presence[otherParticipantId] && (
          <View style={styles.presenceContainer}>
            <View style={[
              styles.presenceIndicator,
              { backgroundColor: presence[otherParticipantId].isOnline ? '#4CAF50' : '#9E9E9E' }
            ]} />
            <Text style={styles.presenceText}>
              {presence[otherParticipantId].isOnline 
                ? `${otherParticipantName || 'User'} is online`
                : `${otherParticipantName || 'User'} is offline`
              }
            </Text>
          </View>
        )}
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.background?.paper || (isDark ? '#1a1a1a' : '#f5f5f5'),
    borderBottomWidth: 1,
    borderBottomColor: isDark ? '#333333' : '#e0e0e0',
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
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
  presenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  presenceIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  presenceText: {
    fontSize: 11,
    color: colors.text?.secondary || (isDark ? '#cccccc' : '#666666'),
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 8,
  },
  messageWrapper: {
    marginBottom: 12,
    width: '100%',
  },
  ownMessageWrapper: {
    alignItems: 'flex-end',
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    maxWidth: '80%',
    gap: 8,
  },
  ownMessage: {
    flexDirection: 'row-reverse',
    alignSelf: 'flex-end',
  },
  systemMessage: {
    alignSelf: 'center',
    maxWidth: '100%',
  },
  avatarContainer: {
    width: 36,
    height: 36,
  },
  messageContent: {
    flex: 1,
    alignItems: 'flex-start',
  },
  ownMessageContent: {
    alignItems: 'flex-end',
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text?.secondary || (isDark ? '#cccccc' : '#666666'),
    marginBottom: 4,
    marginLeft: 4,
  },
  messageBubble: {
    backgroundColor: isDark ? '#2a2a2a' : '#f5f5f5',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    borderTopLeftRadius: 4,
    maxWidth: '100%',
  },
  ownMessageBubble: {
    backgroundColor: colors.primary || '#007AFF',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
    color: colors.text?.primary || (isDark ? '#ffffff' : '#000000'),
  },
  ownMessageText: {
    color: 'white',
  },
  messageTime: {
    fontSize: 11,
    color: colors.text?.secondary || (isDark ? '#888888' : '#999999'),
    marginTop: 4,
    marginLeft: 4,
  },
  ownMessageTime: {
    marginLeft: 0,
    marginRight: 4,
  },
  systemMessageContainer: {
    alignSelf: 'center',
    maxWidth: '90%',
    marginVertical: 8,
  },
  systemMessageText: {
    backgroundColor: 'transparent',
    color: colors.text?.secondary || (isDark ? '#cccccc' : '#666666'),
    textAlign: 'center',
    fontStyle: 'italic',
    padding: 8,
    fontSize: 13,
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
