import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/useAuth';

type Booking = { id: string; speakerId: string; start: string; end: string; status: string };

export default function AttendeeBookings() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);

  const load = async () => {
    if (!user) return;
    const res = await fetch(`/api/bslatam/bookings?user=${user.id}`);
    const json = await res.json();
    setBookings(json.data || []);
  };

  useEffect(() => { load(); }, [user]);

  const cancelBooking = async (id: string) => {
    const res = await fetch(`/api/bslatam/bookings/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'cancelled' }) });
    if (!res.ok) {
      const json = await res.json();
      Alert.alert('Error', json.error || 'No se pudo cancelar');
    } else {
      load();
    }
  };

  return (
    <View style={{ flex: 1, padding: 16, backgroundColor: colors.background.default }}>
      <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text.primary }}>Mis Reservas</Text>
      {bookings.length === 0 ? (
        <Text style={{ marginTop: 12, color: colors.text.secondary }}>No tienes reservas.</Text>
      ) : (
        bookings.map(b => (
          <View key={b.id} style={{ marginTop: 12, padding: 12, backgroundColor: colors.background.paper, borderRadius: 8 }}>
            <Text style={{ color: colors.text.primary }}>Speaker: {b.speakerId}</Text>
            <Text style={{ color: colors.text.primary }}>Inicio: {new Date(b.start).toLocaleString()}</Text>
            <Text style={{ color: colors.text.primary }}>Estado: {b.status}</Text>
            {b.status !== 'cancelled' && (
              <TouchableOpacity onPress={() => cancelBooking(b.id)} style={{ marginTop: 8 }}>
                <Text style={{ color: colors.primary }}>Cancelar</Text>
              </TouchableOpacity>
            )}
          </View>
        ))
      )}
    </View>
  );
}


