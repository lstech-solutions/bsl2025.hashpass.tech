import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface SpeakerAvatarProps {
  name?: string;
  size?: number;
  style?: any;
  showBorder?: boolean;
}

export default function SpeakerAvatar({ 
  name, 
  size = 50, 
  style, 
  showBorder = false
}: SpeakerAvatarProps) {
  // Helper to get initials (always two letters or '??')
  const getInitials = (n?: string) => {
    if (!n || typeof n !== 'string' || !n.trim()) return '??';
    const parts = n.trim().split(' ');
    if (parts.length === 1) return (parts[0][0] + (parts[0][1] || parts[0][0])).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };
  const styles = getStyles(size, showBorder);
  return (
    <View style={[styles.container, style]}>
      <View style={styles.placeholderContainer}>
        <Text style={styles.initialsText}>{getInitials(name)}</Text>
      </View>
    </View>
  );
}

const getStyles = (size: number, showBorder: boolean) => StyleSheet.create({
  container: {
    width: size,
    height: size,
    borderRadius: size / 2,
  },
  placeholderContainer: {
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: showBorder ? 2 : 0,
    borderColor: showBorder ? '#007AFF' : 'transparent',
  },
  initialsText: {
    fontSize: size * 0.35,
    fontWeight: '600',
    color: '#666666',
    textAlign: 'center',
  },
});
