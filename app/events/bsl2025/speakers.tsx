import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/useAuth';

type Booking = { id: string; speakerId: string; attendeeId: string; start: string; status: string };

export default function SpeakerDashboard() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);

  const load = async () => {
    if (!user) return;
    // For simplicity, fetch all bookings for now and filter by speakerId client-side
    const res = await fetch(`/api/bslatam/bookings?user=${user.id}`);
    const json = await res.json();
    setBookings((json.data || []).filter((b: Booking) => !!b.speakerId));
  };

  useEffect(() => { load(); }, [user]);

  const update = async (id: string, status: string) => {
    const res = await fetch(`/api/bslatam/bookings/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
    if (!res.ok) {
      const json = await res.json();
      Alert.alert('Error', json.error || 'No se pudo actualizar');
    } else {
      load();
    }
  };

  return (
    <View style={{ flex: 1, padding: 16, backgroundColor: colors.background.default }}>
      <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text.primary }}>Solicitudes de Citas</Text>
      {bookings.length === 0 ? (
        <Text style={{ marginTop: 12, color: colors.text.secondary }}>No hay solicitudes.</Text>
      ) : (
        bookings.map(b => (
          <View key={b.id} style={{ marginTop: 12, padding: 12, backgroundColor: colors.background.paper, borderRadius: 8 }}>
            <Text style={{ color: colors.text.primary }}>Attendee: {b.attendeeId}</Text>
            <Text style={{ color: colors.text.primary }}>Inicio: {new Date(b.start).toLocaleString()}</Text>
            <Text style={{ color: colors.text.primary }}>Estado: {b.status}</Text>
            {b.status === 'requested' && (
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
                <TouchableOpacity onPress={() => update(b.id, 'accepted')}>
                  <Text style={{ color: 'green' }}>Aceptar</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => update(b.id, 'rejected')}>
                  <Text style={{ color: 'red' }}>Rechazar</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))
      )}
    </View>
  );
}


