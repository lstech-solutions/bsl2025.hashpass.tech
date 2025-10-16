import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useEvent } from '@/contexts/EventContext';

export default function BSL2025Home() {
  const router = useRouter();
  const { colors } = useTheme();
  const { event } = useEvent();

  const quickAccessItems = [
    {
      id: 'speakers',
      title: 'Featured Speakers',
      subtitle: 'Meet the experts',
      icon: 'people',
      color: '#007AFF',
      route: '/events/bsl2025/speakers'
    },
    {
      id: 'agenda',
      title: 'Event Agenda',
      subtitle: '3 Days Schedule',
      icon: 'event',
      color: '#34A853',
      route: '/events/bsl2025/agenda'
    },
    {
      id: 'event-info',
      title: 'Event Information',
      subtitle: 'Details & Logistics',
      icon: 'info',
      color: '#FF9500',
      route: '/events/bsl2025/event-info'
    },
    {
      id: 'my-bookings',
      title: 'My Bookings',
      subtitle: 'Your sessions',
      icon: 'bookmark',
      color: '#AF52DE',
      route: '/events/bsl2025/my-bookings'
    }
  ];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background.default }}>
      {/* Header */}
      <View style={{ 
        padding: 20, 
        backgroundColor: colors.background.paper,
        borderBottomWidth: 1,
        borderBottomColor: colors.divider
      }}>
        <Text style={{ 
          fontSize: 28, 
          fontWeight: 'bold', 
          color: colors.text.primary,
          marginBottom: 8
        }}>
          BSL 2025
        </Text>
        <Text style={{ 
          fontSize: 16, 
          color: colors.text.secondary,
          marginBottom: 4
        }}>
          Blockchain Summit Latam
        </Text>
        <Text style={{ 
          fontSize: 14, 
          color: colors.text.secondary
        }}>
          November 12-14, 2025 • Universidad EAFIT, Medellín
        </Text>
      </View>

      {/* Quick Access Grid */}
      <View style={{ padding: 20 }}>
        <Text style={{ 
          fontSize: 20, 
          fontWeight: '600', 
          color: colors.text.primary,
          marginBottom: 16
        }}>
          Quick Access
        </Text>
        
        <View style={{ 
          flexDirection: 'row', 
          flexWrap: 'wrap', 
          justifyContent: 'space-between',
          gap: 12
        }}>
          {quickAccessItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={{
                width: '48%',
                backgroundColor: colors.background.paper,
                borderRadius: 12,
                padding: 16,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: colors.divider,
                shadowColor: colors.text.primary,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 3,
              }}
              onPress={() => router.push(item.route as any)}
            >
              <View style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: `${item.color}20`,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 12
              }}>
                <MaterialIcons name={item.icon as any} size={24} color={item.color} />
              </View>
              <Text style={{
                fontSize: 16,
                fontWeight: '600',
                color: colors.text.primary,
                textAlign: 'center',
                marginBottom: 4
              }}>
                {item.title}
              </Text>
              <Text style={{
                fontSize: 12,
                color: colors.text.secondary,
                textAlign: 'center'
              }}>
                {item.subtitle}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Event Banner */}
      <View style={{ 
        margin: 20, 
        backgroundColor: colors.background.paper,
        borderRadius: 12,
        padding: 20,
        borderWidth: 1,
        borderColor: colors.divider
      }}>
        <Text style={{
          fontSize: 18,
          fontWeight: '600',
          color: colors.text.primary,
          marginBottom: 8
        }}>
          About BSL 2025
        </Text>
        <Text style={{
          fontSize: 14,
          color: colors.text.secondary,
          lineHeight: 20
        }}>
          Join us for the premier blockchain and digital assets conference in Latin America. 
          Connect with industry leaders, explore the latest innovations, and discover the 
          future of digital finance.
        </Text>
      </View>
    </ScrollView>
  );
}


