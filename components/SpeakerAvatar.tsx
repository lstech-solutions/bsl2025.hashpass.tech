import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, ActivityIndicator, Animated } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';

interface SpeakerAvatarProps {
  imageUrl?: string;
  name?: string;
  size?: number;
  style?: any;
  showBorder?: boolean;
}

export default function SpeakerAvatar({ 
  imageUrl, 
  name, 
  size = 50, 
  style, 
  showBorder = false 
}: SpeakerAvatarProps) {
  const { isDark, colors } = useTheme();
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));

  const styles = getStyles(isDark, colors, size, showBorder);

  // Generate initials from name
  const getInitials = (name: string | undefined) => {
    if (!name || typeof name !== 'string') {
      return '??';
    }
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Handle image load success
  const handleImageLoad = () => {
    setImageLoading(false);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  // Handle image load error
  const handleImageError = () => {
    setImageLoading(false);
    setImageError(true);
    console.warn(`❌ Failed to load image for ${name}: ${imageUrl}`);
  };

  // Reset states when imageUrl changes
  useEffect(() => {
    if (imageUrl) {
      console.log(`🖼️ Loading image for ${name}: ${imageUrl}`);
      setImageLoading(true);
      setImageError(false);
      fadeAnim.setValue(0);
    } else {
      console.log(`⚠️ No image URL for ${name}`);
    }
  }, [imageUrl, name]);

  return (
    <View style={[styles.container, style]}>
      {imageUrl && !imageError ? (
        <View style={styles.imageContainer}>
          {imageLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator 
                size="small" 
                color={isDark ? '#FFFFFF' : '#007AFF'} 
              />
            </View>
          )}
          <Animated.View style={[styles.imageWrapper, { opacity: fadeAnim }]}>
            <Image
              source={{ 
                uri: imageUrl,
                cache: 'force-cache' // Enable aggressive caching
              }}
              style={styles.image}
              onLoad={handleImageLoad}
              onError={handleImageError}
              resizeMode="cover"
            />
          </Animated.View>
        </View>
      ) : (
        <View style={styles.placeholderContainer}>
          <Text style={styles.initialsText}>
            {getInitials(name)}
          </Text>
        </View>
      )}
    </View>
  );
}

const getStyles = (isDark: boolean, colors: any, size: number, showBorder: boolean) => StyleSheet.create({
  container: {
    width: size,
    height: size,
    borderRadius: size / 2,
  },
  imageContainer: {
    width: size,
    height: size,
    borderRadius: size / 2,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: showBorder ? 2 : 0,
    borderColor: showBorder ? '#007AFF' : 'transparent',
  },
  imageWrapper: {
    width: size,
    height: size,
    borderRadius: size / 2,
  },
  image: {
    width: size,
    height: size,
    borderRadius: size / 2,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: size / 2,
  },
  placeholderContainer: {
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: showBorder ? 2 : 0,
    borderColor: showBorder ? '#007AFF' : 'transparent',
  },
  initialsText: {
    fontSize: size * 0.35,
    fontWeight: '600',
    color: isDark ? '#FFFFFF' : '#666666',
    textAlign: 'center',
  },
});
