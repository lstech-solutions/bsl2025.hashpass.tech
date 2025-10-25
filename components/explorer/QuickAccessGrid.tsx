import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../hooks/useTheme';

interface QuickAccessItem {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  icon: string;
  color: string;
  route: string;
}

interface QuickAccessGridProps {
  items: QuickAccessItem[];
  title?: string;
  showScrollArrows?: boolean;
  onItemPress?: (item: QuickAccessItem) => void;
  cardWidth?: number;
  cardSpacing?: number;
}

export default function QuickAccessGrid({ 
  items, 
  title = "Quick Access", 
  showScrollArrows = false,
  onItemPress,
  cardWidth = 140,
  cardSpacing = 12
}: QuickAccessGridProps) {
  const { isDark, colors } = useTheme();
  const router = useRouter();
  const styles = getStyles(isDark, colors, cardWidth, cardSpacing);
  
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(showScrollArrows);
  const scrollRef = useRef<ScrollView>(null);

  const handleScroll = (event: any) => {
    if (!showScrollArrows) return;
    
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const scrollX = contentOffset.x;
    const maxScrollX = contentSize.width - layoutMeasurement.width;
    
    setShowLeftArrow(scrollX > 0);
    setShowRightArrow(scrollX < maxScrollX - 10);
  };

  const scrollTo = (direction: 'left' | 'right') => {
    const scrollAmount = 200;
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        x: direction === 'left' ? -scrollAmount : scrollAmount,
        animated: true
      });
    }
  };

  const handleItemPress = (item: QuickAccessItem) => {
    if (onItemPress) {
      onItemPress(item);
    } else {
      router.push(item.route as any);
    }
  };

  const renderQuickAccessItem = (item: QuickAccessItem, index: number) => (
    <TouchableOpacity
      key={item.id}
      style={[
        styles.quickAccessCard,
        { marginLeft: index === 0 ? 0 : cardSpacing }
      ]}
      onPress={() => handleItemPress(item)}
    >
      <View style={[styles.cardIcon, { backgroundColor: item.color + '20' }]}>
        <MaterialIcons name={item.icon as any} size={32} color={item.color} />
      </View>
      <Text style={styles.cardTitle}>{item.title}</Text>
      <Text style={styles.cardDescription}>
        {item.subtitle || item.description}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.quickAccessContainer}>
        {showScrollArrows && showLeftArrow && (
          <TouchableOpacity
            style={[styles.scrollArrow, styles.leftArrow]}
            onPress={() => scrollTo('left')}
          >
            <MaterialIcons name="chevron-left" size={24} color={colors.primary} />
          </TouchableOpacity>
        )}
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalScroll}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          {items.map((item, index) => renderQuickAccessItem(item, index))}
        </ScrollView>
        {showScrollArrows && showRightArrow && (
          <TouchableOpacity
            style={[styles.scrollArrow, styles.rightArrow]}
            onPress={() => scrollTo('right')}
          >
            <MaterialIcons name="chevron-right" size={24} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const getStyles = (isDark: boolean, colors: any, cardWidth: number, cardSpacing: number) => StyleSheet.create({
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text?.primary || (isDark ? '#ffffff' : '#000000'),
    marginBottom: 16,
  },
  horizontalScroll: {
    paddingRight: 20,
  },
  quickAccessContainer: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  scrollArrow: {
    position: 'absolute',
    zIndex: 1,
    backgroundColor: colors.background?.paper || (isDark ? '#1E1E1E' : '#F5F5F7'),
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: isDark ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.3 : 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
  },
  leftArrow: {
    left: -10,
  },
  rightArrow: {
    right: -10,
  },
  quickAccessCard: {
    width: cardWidth,
    backgroundColor: colors.background?.paper || (isDark ? '#1E1E1E' : '#F5F5F7'),
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: isDark ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.3 : 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
  },
  cardIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text?.primary || (isDark ? '#ffffff' : '#000000'),
    textAlign: 'center',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 12,
    color: colors.text?.secondary || (isDark ? '#cccccc' : '#666666'),
    textAlign: 'center',
    lineHeight: 16,
  },
});
