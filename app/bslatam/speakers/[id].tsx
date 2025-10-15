import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';

type Speaker = {
  id: string;
  name: string;
  title?: string;
  bio?: string;
  linkedin?: string;
  imageUrl?: string;
  availability?: { day: string; slots: string[] }[];
};

export default function SpeakerProfile() {
  const { id } = useLocalSearchParams();
  const { colors } = useTheme();
  const router = useRouter();
  const [speaker, setSpeaker] = useState<Speaker | null>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/bslatam/speakers/${id}`)
      .then(r => r.json())
      .then(setSpeaker)
      .catch(console.error);
  }, [id]);

  const days = useMemo(() => speaker?.availability?.map(a => a.day) || [], [speaker]);

  if (!speaker) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><Text>Cargando...</Text></View>;

  return (
    <View style={{ flex: 1, padding: 16, backgroundColor: colors.background.default }}>
      <View style={{ alignItems: 'center' }}>
        <Image source={{ uri: speaker.imageUrl || './assets/images/icon.png' }} style={{ width: 96, height: 96, borderRadius: 48 }} />
        <Text style={{ fontSize: 22, fontWeight: '700', marginTop: 8, color: colors.text.primary }}>{speaker.name}</Text>
        {speaker.title ? <Text style={{ color: colors.text.secondary }}>{speaker.title}</Text> : null}
      </View>
      {speaker.bio ? (
        <Text style={{ marginTop: 12, color: colors.text.primary }}>{speaker.bio}</Text>
      ) : null}
      {speaker.linkedin ? (
        <TouchableOpacity onPress={() => window.open(speaker.linkedin as string, '_blank')}>
          <Text style={{ color: colors.primary, marginTop: 8 }}>LinkedIn</Text>
        </TouchableOpacity>
      ) : null}
      <View style={{ marginTop: 16 }}>
        <Text style={{ fontWeight: '600', color: colors.text.primary }}>Disponibilidad</Text>
        {days.length === 0 ? (
          <Text style={{ color: colors.text.secondary, marginTop: 4 }}>Sin slots disponibles.</Text>
        ) : (
          days.map(day => (
            <TouchableOpacity key={day} onPress={() => router.push({ pathname: '/bslatam/speakers/calendar', params: { speakerId: speaker.id, day } })}>
              <Text style={{ color: colors.primary, marginTop: 8 }}>{day}</Text>
            </TouchableOpacity>
          ))
        )}
      </View>
    </View>
  );
}


