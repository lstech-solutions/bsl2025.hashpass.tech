import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

export default function AdminPanel() {
  const { colors } = useTheme();
  const [metrics, setMetrics] = useState<any>(null);
  useEffect(() => {
    fetch('/api/bslatam/analytics').then(r => r.json()).then(setMetrics).catch(console.error);
  }, []);
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


