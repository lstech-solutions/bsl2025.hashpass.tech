import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { getSpeakerAvatarUrl } from '../lib/string-utils';

interface SpeakerAvatarProps {
  name?: string;
  imageUrl?: string | null;
  size?: number;
  style?: any;
  showBorder?: boolean;
}

export default function SpeakerAvatar({ 
  name, 
  imageUrl,
  size = 50, 
  style, 
  showBorder = false
}: SpeakerAvatarProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageTimeout, setImageTimeout] = useState(false);

  // Memoize computed values to prevent infinite loops in useEffect
  const { initialAvatarUrl, isS3Url } = useMemo(() => {
    // Generate initial avatar URL - prefer provided imageUrl, otherwise generate from name
    // getSpeakerAvatarUrl always generates S3 URL now (no blockchainsummit.la fallback)
    const initial = imageUrl || (name ? getSpeakerAvatarUrl(name) : null);
    
    // Check if initial URL is S3
    // S3 URLs can be in format: https://bucket.s3.region.amazonaws.com/path or https://bucket.s3.amazonaws.com/path
    const isS3 = initial ? (
      initial.includes('s3.amazonaws.com') || 
      initial.includes('hashpass-assets.s3') ||
      (initial.includes('s3.') && initial.includes('amazonaws.com'))
    ) : false;
    
    return { initialAvatarUrl: initial, isS3Url: isS3 };
  }, [imageUrl, name]);
  
  // Use initial URL only - no fallback to blockchainsummit.la
  const avatarUrl = initialAvatarUrl;

  // Reset error state when imageUrl or name changes
  useEffect(() => {
    if (initialAvatarUrl) {
      console.log(`[SpeakerAvatar] Loading S3 image for ${name}:`, {
        url: initialAvatarUrl,
        isS3Url: isS3Url,
        hasImageUrl: !!imageUrl,
      });
      setImageError(false);
      setImageLoading(true);
      setImageTimeout(false);
      
      // Reduced timeout since images are now optimized (~70KB instead of 1.3MB)
      const timeoutDuration = 10000; // Increased to 10 seconds to account for S3 policy propagation
      const timeoutId = setTimeout(() => {
        console.warn(`[SpeakerAvatar] Image load timeout (${timeoutDuration}ms) for ${name}:`, initialAvatarUrl);
        setImageTimeout(true);
        setImageLoading(false);
        // Don't try fallback - just show initials if S3 fails
      }, timeoutDuration);

      return () => clearTimeout(timeoutId);
    } else {
      setImageError(true);
      setImageLoading(false);
    }
  }, [imageUrl, name, initialAvatarUrl, isS3Url]); // Removed fallbackBlockchainUrl

  // Helper to get initials (always two letters or '??')
  const getInitials = (n?: string) => {
    if (!n || typeof n !== 'string' || !n.trim()) return '??';
    const parts = n.trim().split(' ');
    if (parts.length === 1) return (parts[0][0] + (parts[0][1] || parts[0][0])).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  const styles = getStyles(size, showBorder);
  // Show image when we have a URL - it will load and appear smoothly
  // Only show placeholder if image failed to load or timed out
  // Image is hidden initially (opacity 0) and fades in when loaded to prevent flicker
  const showImage = avatarUrl && !imageError && !imageTimeout;
  const showPlaceholder = !avatarUrl || imageError || imageTimeout;
  
  // Debug: Log what URL we're trying to load
  useEffect(() => {
    if (avatarUrl) {
      console.log(`[SpeakerAvatar] Attempting to load avatar:`, {
        name,
        imageUrl: imageUrl || 'none (generated)',
        finalUrl: avatarUrl,
        isS3Url,
      });
    }
  }, [avatarUrl, name, imageUrl, isS3Url]);

  return (
    <View style={[styles.container, style]}>
      {/* Placeholder (always rendered, behind image) */}
      <View 
        style={styles.placeholderContainer}
        pointerEvents={showImage ? "none" : "auto"}
      >
        <Text style={styles.initialsText}>{getInitials(name)}</Text>
      </View>
      {/* Image (rendered on top if available and no error) */}
      {showImage && (
        <Image
          source={{ uri: avatarUrl }}
          style={[
            styles.image,
            // Hide image until loaded to prevent flicker between initials and image
            { opacity: imageLoading ? 0 : 1 }
          ]}
          resizeMode="cover"
          pointerEvents="auto"
          onError={(error) => {
            const errorMessage = error.nativeEvent?.error || error.message || 'Unknown error';
            const statusCode = error.nativeEvent?.statusCode || error.statusCode || 'unknown';
            console.error(`[SpeakerAvatar] S3 image load error for ${name}:`, {
              url: avatarUrl,
              error: errorMessage,
              statusCode: statusCode,
              isS3Url: isS3Url,
            });
            // No fallback - just show initials if S3 fails
            setImageError(true);
            setImageLoading(false);
          }}
          onLoad={() => {
            console.log(`[SpeakerAvatar] Image loaded successfully for ${name}:`, avatarUrl);
            setImageLoading(false);
            setImageTimeout(false);
            setImageError(false);
          }}
          onLoadEnd={() => {
            setImageLoading(false);
          }}
          onLoadStart={() => {
            // Reset error when starting to load
            setImageError(false);
            setImageLoading(true);
          }}
        />
      )}
    </View>
  );
}

const getStyles = (size: number, showBorder: boolean) => StyleSheet.create({
  container: {
    width: size,
    height: size,
    borderRadius: size / 2,
    overflow: 'hidden',
    position: 'relative',
  },
  image: {
    width: size,
    height: size,
    borderRadius: size / 2,
    borderWidth: showBorder ? 2 : 0,
    borderColor: showBorder ? '#007AFF' : 'transparent',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 1,
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
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },
  initialsText: {
    fontSize: size * 0.35,
    fontWeight: '600',
    color: '#666666',
    textAlign: 'center',
  },
});
