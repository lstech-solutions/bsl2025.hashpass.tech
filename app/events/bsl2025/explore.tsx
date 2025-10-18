import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, FlatList, Image, Dimensions, TouchableOpacity, Animated, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { SvgUri } from 'react-native-svg';
import { useScroll } from '../../../contexts/ScrollContext';
import { useEvent } from '../../../contexts/EventContext';
import { useTheme } from '../../../hooks/useTheme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import EventBanner from '../../../components/EventBanner';
import PassesDisplay from '../../../components/PassesDisplay';
import QuickAccessGrid from '../../../components/explorer/QuickAccessGrid';
import { 
  getAvailableEvents, 
  getCurrentEvent, 
  shouldShowEventSelector,
  getEventQuickAccessItems,
  type EventInfo 
} from '../../../lib/event-detector';

// BSL2025-specific types
interface BSL2025Stats {
  speakers: number;
  sessions: number;
  attendees: number;
  sponsors: number;
  networkingSessions: number;
}

interface BSL2025Feature {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  route: string;
  highlight?: boolean;
}

const { width } = Dimensions.get('window');
const HEADER_SCROLL_DISTANCE = 100;

export default function BSL2025ExploreScreen() {
  const { scrollY, headerOpacity, headerBackground, headerHeight, setHeaderHeight } = useScroll();
  const { event } = useEvent();
  const { isDark, colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();
  const styles = getStyles(isDark, colors);
  
  // Scroll state for quick access
  
  // BSL2025 specific data
  const bsl2025Stats: BSL2025Stats = {
    speakers: 45,
    sessions: 28,
    attendees: 500,
    sponsors: 25,
    networkingSessions: 12
  };

  const bsl2025Features: BSL2025Feature[] = [
    {
      id: 'blockchain-focus',
      title: 'Blockchain Innovation',
      description: 'Latest trends in blockchain technology',
      icon: 'account-balance',
      color: '#4CAF50',
      route: '/events/bsl2025/speakers',
      highlight: true
    },
    {
      id: 'latin-america',
      title: 'Latin America Focus',
      description: 'Regional blockchain ecosystem',
      icon: 'public',
      color: '#2196F3',
      route: '/events/bsl2025/event-info'
    },
    {
      id: 'networking',
      title: 'Advanced Networking',
      description: 'AI-powered matchmaking system',
      icon: 'people-alt',
      color: '#FF9800',
      route: '/events/bsl2025/networking',
      highlight: true
    },
    {
      id: 'university',
      title: 'University Partnership',
      description: 'Hosted at Universidad EAFIT',
      icon: 'school',
      color: '#9C27B0',
      route: '/events/bsl2025/event-info'
    }
  ];

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { useNativeDriver: false }
  );


  const renderFeatureCard = (feature: BSL2025Feature, index: number) => (
    <TouchableOpacity
      key={feature.id}
      style={[
        styles.featureCard,
        { 
          marginLeft: index === 0 ? 0 : 12,
          borderColor: feature.highlight ? feature.color : colors.divider,
          borderWidth: feature.highlight ? 2 : 1,
          backgroundColor: feature.highlight ? `${feature.color}10` : colors.background.paper
        }
      ]}
      onPress={() => router.push(feature.route as any)}
    >
      <View style={[styles.featureIcon, { backgroundColor: feature.color }]}>
        <MaterialIcons name={feature.icon as any} size={24} color="white" />
      </View>
      <Text style={styles.featureTitle}>{feature.title}</Text>
      <Text style={styles.featureDescription}>{feature.description}</Text>
      {feature.highlight && (
        <View style={[styles.highlightBadge, { backgroundColor: feature.color }]}>
          <Text style={styles.highlightText}>FEATURED</Text>
        </View>
      )}
    </TouchableOpacity>
  );



  return (
    <View style={styles.container}>
      {/* BSL2025 Event Banner */}
      <EventBanner 
        title="Blockchain Summit Latin America 2025"
        subtitle="November 12-14, 2025 • Universidad EAFIT, Medellín"
        date="November 12-14, 2025"
        showCountdown={true}
        showLiveIndicator={true}
        eventStartDate="2025-11-12T09:00:00Z"
      />
      
      <Animated.ScrollView
        style={styles.scrollView}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="never"
      >

        {/* User Passes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your BSL 2025 Pass</Text>
          <PassesDisplay 
            mode="dashboard"
            showTitle={false}
            showPassComparison={false}
          />
        </View>

        {/* BSL2025 Features */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Why BSL 2025?</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalScroll}
          >
            {bsl2025Features.map((feature, index) => renderFeatureCard(feature, index))}
          </ScrollView>
        </View>

        {/* Quick Access Section */}
        <QuickAccessGrid
          items={getEventQuickAccessItems('bsl2025').map(item => ({
            id: item.id,
            title: item.title,
            subtitle: item.subtitle,
            icon: item.icon,
            color: item.color,
            route: item.route
          }))}
          title="Quick Access"
          showScrollArrows={true}
          cardWidth={160}
          cardSpacing={12}
        />


        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
      </Animated.ScrollView>
    </View>
  );
}

const getStyles = (isDark: boolean, colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.default,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 16,
  },
  horizontalScroll: {
    paddingRight: 20,
  },
  featureCard: {
    width: 180,
    backgroundColor: colors.background.paper,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    position: 'relative',
    shadowColor: colors.text.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  featureIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  featureDescription: {
    fontSize: 12,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 16,
  },
  highlightBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  highlightText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  bottomSpacing: {
    height: 40,
  },
});
