import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';

export default function AdminPanel() {
  const { colors } = useTheme();
  const router = useRouter();
  const [metrics, setMetrics] = useState<any>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    // Check if user is authorized to access admin panel
    // For now, we'll add a simple check - in production, this should be proper authentication
    const checkAuth = async () => {
      try {
        // Add your authentication logic here
        // For now, we'll deny access by default
        setIsAuthorized(false);
      } catch (error) {
        console.error('Auth check failed:', error);
        setIsAuthorized(false);
      }
    };

    checkAuth();
  }, []);

  useEffect(() => {
    if (isAuthorized) {
      fetch('/api/bslatam/analytics').then(r => r.json()).then(setMetrics).catch(console.error);
    }
  }, [isAuthorized]);

  if (!isAuthorized) {
    return (
      <View style={{ 
        flex: 1, 
        padding: 16, 
        backgroundColor: colors.background.default,
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <MaterialIcons name="lock" size={64} color={colors.text.secondary} />
        <Text style={{ 
          fontSize: 24, 
          fontWeight: '700', 
          color: colors.text.primary,
          marginTop: 16,
          marginBottom: 8
        }}>
          Access Denied
        </Text>
        <Text style={{ 
          fontSize: 16, 
          color: colors.text.secondary,
          textAlign: 'center',
          marginBottom: 24
        }}>
          You don't have permission to access the admin panel.
        </Text>
        <TouchableOpacity
          style={{
            backgroundColor: colors.primary,
            paddingHorizontal: 24,
            paddingVertical: 12,
            borderRadius: 8,
          }}
          onPress={() => router.back()}
        >
          <Text style={{
            color: '#fff',
            fontSize: 16,
            fontWeight: '600'
          }}>
            Go Back
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 16, backgroundColor: colors.background.default }}>
      <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text.primary }}>Admin Analytics</Text>
      {metrics ? (
        <View style={{ marginTop: 12 }}>
          <Text style={{ color: colors.text.primary }}>Total: {metrics.total}</Text>
          <Text style={{ color: colors.text.primary }}>Accepted: {metrics.accepted}</Text>
          <Text style={{ color: colors.text.primary }}>Requested: {metrics.requested}</Text>
          <Text style={{ color: colors.text.primary }}>Acceptance Rate: {metrics.acceptanceRate}%</Text>
        </View>
      ) : (
        <Text style={{ marginTop: 12, color: colors.text.secondary }}>Cargando...</Text>
      )}
    </View>
  );
}


