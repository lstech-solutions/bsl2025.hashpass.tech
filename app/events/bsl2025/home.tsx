import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { useEvent } from '@/contexts/EventContext';

type Speaker = {
  id: string;
  name: string;
  title?: string;
  imageUrl?: string;
  tags?: string[];
};

export default function MatchmakingHome() {
  const router = useRouter();
  const { colors } = useTheme();
  const { event, getApiEndpoint, getRoute } = useEvent();
  const [query, setQuery] = useState('');
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchSpeakers = async () => {
      setLoading(true);
      try {
        const speakersEndpoint = getApiEndpoint('/speakers');
        const res = await fetch(speakersEndpoint);
        const json = await res.json();
        setSpeakers(json.data || []);
      } catch (e) {
        console.error(e);
      } finally { setLoading(false); }
    };
    fetchSpeakers();
  }, [getApiEndpoint]);

  const filtered = speakers.filter(s => {
    const q = query.toLowerCase();
    return s.name.toLowerCase().includes(q) || (s.tags || []).some(t => t.toLowerCase().includes(q));
  });

  return (
    <View style={{ flex: 1, padding: 16, backgroundColor: colors.background.default }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', color: colors.text.primary }}>{event.name} Matchmaking</Text>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Buscar speakers por nombre o tags"
        style={{ marginTop: 12, padding: 12, borderRadius: 8, backgroundColor: colors.background.paper, color: colors.text.primary }}
      />
      <FlatList
        style={{ marginTop: 16 }}
        data={filtered}
        keyExtractor={(item) => item.id}
        refreshing={loading}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => router.push(`${getRoute('speakers')}/${item.id}` as any)}
            style={{ flexDirection: 'row', alignItems: 'center', padding: 12, marginBottom: 12, borderRadius: 8, backgroundColor: colors.background.paper }}
          >
            <Image source={{ uri: item.imageUrl || './assets/images/icon.png' }} style={{ width: 48, height: 48, borderRadius: 24, marginRight: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text.primary, fontWeight: '600' }}>{item.name}</Text>
              {item.title ? <Text style={{ color: colors.text.secondary }}>{item.title}</Text> : null}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 }}>
                {(item.tags || []).slice(0, 4).map(tag => (
                  <Text key={tag} style={{ fontSize: 12, color: colors.primary, marginRight: 6 }}>#{tag}</Text>
                ))}
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}


