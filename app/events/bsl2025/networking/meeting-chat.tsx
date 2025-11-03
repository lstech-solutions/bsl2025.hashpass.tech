import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/useAuth';
import MeetingChat from '@/components/MeetingChat';
import LoadingScreen from '@/components/LoadingScreen';

export default function MeetingChatPage() {
  const router = useRouter();
  const { meetingId } = useLocalSearchParams<{ meetingId: string }>();
  const { colors } = useTheme();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [meetingInfo, setMeetingInfo] = useState<any>(null);

  useEffect(() => {
    if (meetingId) {
      loadMeetingInfo();
    } else {
      Alert.alert('Error', 'No meeting ID provided');
      router.back();
    }
  }, [meetingId]);

  const loadMeetingInfo = async () => {
    try {
      setLoading(true);
      // You can add logic here to fetch meeting details if needed
      // For now, we'll just set basic info
      setMeetingInfo({
        id: meetingId,
        title: 'Meeting Chat'
      });
    } catch (error) {
      console.error('Error loading meeting info:', error);
      Alert.alert('Error', 'Failed to load meeting information');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    router.back();
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background?.default }]}>
        <Stack.Screen 
          options={{ 
            title: 'Loading...',
            headerBackTitle: 'Speaker Dashboard',
          }} 
        />
        <LoadingScreen
          icon="chat"
          message="Loading meeting chat..."
          fullScreen={true}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background?.default }]}>
      <Stack.Screen 
        options={{ 
          title: '',  // Empty title to hide it
          headerBackTitle: 'Back',
          headerShadowVisible: false,  // Remove header shadow for cleaner look
          headerStyle: {
            backgroundColor: colors.background?.default,
          },
          headerRight: () => (
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleClose}
            >
              <MaterialIcons name="close" size={24} color={colors.text.primary} />
            </TouchableOpacity>
          ),
        }} 
      />
      
      <MeetingChat
        meetingId={meetingId!}
        onClose={handleClose}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  closeButton: {
    padding: 8,
    marginRight: 8,
  },
});
