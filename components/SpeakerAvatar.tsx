import React, { useState, useEffect } from 'react';
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
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null);

  // Generate initial avatar URL - prefer provided imageUrl, otherwise generate from name
  const initialAvatarUrl = imageUrl || (name ? getSpeakerAvatarUrl(name) : null);
  
  // Check if initial URL is S3 and generate fallback URL
  const isS3Url = initialAvatarUrl?.includes('s3.amazonaws.com') || initialAvatarUrl?.includes('hashpass-assets');
  const fallbackBlockchainUrl = name && isS3Url 
    ? `https://blockchainsummit.la/wp-content/uploads/2025/09/foto-${name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')}.png`
    : null;
  
  // Use fallback URL if S3 failed, otherwise use initial URL
  const avatarUrl = fallbackUrl || initialAvatarUrl;

  // Reset error state when imageUrl changes
  useEffect(() => {
    // Reset fallback when imageUrl prop changes
    setFallbackUrl(null);
    
    if (initialAvatarUrl) {
      console.log(`[SpeakerAvatar] Attempting to load image for ${name}:`, initialAvatarUrl);
      setImageError(false);
      setImageLoading(true);
      setImageTimeout(false);
      
      // Set timeout for image loading (10 seconds - increased for S3)
      const timeoutId = setTimeout(() => {
        console.log(`[SpeakerAvatar] Image load timeout for ${name}:`, initialAvatarUrl);
        // Try fallback if S3 times out
        if (isS3Url && fallbackBlockchainUrl && !fallbackUrl) {
          console.log(`[SpeakerAvatar] Trying fallback URL after timeout for ${name}:`, fallbackBlockchainUrl);
          setFallbackUrl(fallbackBlockchainUrl);
          setImageError(false);
          setImageLoading(true);
        } else {
          setImageTimeout(true);
          setImageLoading(false);
        }
      }, 10000);

      return () => clearTimeout(timeoutId);
    } else {
      setImageError(true);
      setImageLoading(false);
    }
  }, [imageUrl, name]); // Reset when imageUrl or name changes

  // Helper to get initials (always two letters or '??')
  const getInitials = (n?: string) => {
    if (!n || typeof n !== 'string' || !n.trim()) return '??';
    const parts = n.trim().split(' ');
    if (parts.length === 1) return (parts[0][0] + (parts[0][1] || parts[0][0])).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  const styles = getStyles(size, showBorder);
  // Show image if we have a URL and haven't had an error or timeout yet
  const showImage = avatarUrl && !imageError && !imageTimeout;
  const showPlaceholder = !showImage || imageError || imageTimeout;

  return (
    <View style={[styles.container, style]}>
      {/* Placeholder (always rendered, behind image) */}
      <View style={styles.placeholderContainer}>
        <Text style={styles.initialsText}>{getInitials(name)}</Text>
      </View>
      {/* Image (rendered on top if available and no error) */}
      {showImage && (
        <Image
          source={{ uri: avatarUrl }}
          style={styles.image}
          onError={(error) => {
            console.log(`[SpeakerAvatar] Image load error for ${name}:`, avatarUrl, error.nativeEvent?.error);
            // If S3 URL failed, try fallback to blockchainsummit.la
            if (isS3Url && fallbackBlockchainUrl && !fallbackUrl) {
              console.log(`[SpeakerAvatar] Trying fallback URL for ${name}:`, fallbackBlockchainUrl);
              setFallbackUrl(fallbackBlockchainUrl);
              setImageError(false);
              setImageLoading(true);
              setImageTimeout(false);
            } else {
              setImageError(true);
              setImageLoading(false);
            }
          }}
          onLoad={() => {
            console.log(`[SpeakerAvatar] Image loaded successfully for ${name}:`, avatarUrl);
            setImageLoading(false);
            setImageTimeout(false);
          }}
          onLoadEnd={() => {
            setImageLoading(false);
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
    backgroundColor: 'transparent',
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
  },
  initialsText: {
    fontSize: size * 0.35,
    fontWeight: '600',
    color: '#666666',
    textAlign: 'center',
  },
});
