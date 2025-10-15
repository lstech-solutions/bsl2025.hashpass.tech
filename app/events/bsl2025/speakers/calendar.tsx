import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/useAuth';

export default function BookingCalendar() {
  const { speakerId, day } = useLocalSearchParams<{ speakerId: string; day: string }>();
  const { colors } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const [availability, setAvailability] = useState<{ day: string; slots: string[] }[]>([]);

  useEffect(() => {
    if (!speakerId) return;
    fetch(`/api/bslatam/speakers/${speakerId}`)
      .then(r => r.json())
      .then((s) => setAvailability(s.availability || []))
      .catch(console.error);
  }, [speakerId]);

  const slots = useMemo(() => availability.find(a => a.day === day)?.slots || [], [availability, day]);

  const requestSlot = async (time: string) => {
    if (!user) {
      Alert.alert('Inicia sesión para reservar');
      return;
    }
    // Verify ticket or assume verified if already done; minimal happy-path
    await fetch('/api/bslatam/verify-ticket', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ticketId: `mock-${user.id}`, userId: user.id }) });
    const start = `${day}T${time}:00-05:00`;
    const endDate = new Date(start);
    endDate.setMinutes(endDate.getMinutes() + 10);
    const end = endDate.toISOString();
    const res = await fetch('/api/bslatam/bookings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ speakerId, attendeeId: user.id, start, end }) });
    const json = await res.json();
    if (!res.ok) {
      Alert.alert('Error', json.error || 'No se pudo crear la reserva');
    } else {
      Alert.alert('Solicitud enviada');
      router.replace('/bslatam/my-bookings');
    }
  };

  return (
    <View style={{ flex: 1, padding: 16, backgroundColor: colors.background.default }}>
      <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text.primary }}>Selecciona un slot - {day}</Text>
      <View style={{ marginTop: 12, flexDirection: 'row', flexWrap: 'wrap' }}>
        {slots.length === 0 ? (
          <Text style={{ color: colors.text.secondary }}>Sin disponibilidad</Text>
        ) : (
          slots.map(t => (
            <TouchableOpacity key={t} onPress={() => requestSlot(t)} style={{ padding: 10, margin: 6, borderRadius: 8, backgroundColor: colors.background.paper }}>
              <Text style={{ color: colors.text.primary }}>{t}</Text>
            </TouchableOpacity>
          ))
        )}
      </View>
    </View>
  );
}


