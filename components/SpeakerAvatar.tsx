import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, Image, Animated } from 'react-native';
import { getSpeakerAvatarUrl, getLocalOptimizedAvatarUrl } from '../lib/string-utils';

interface SpeakerAvatarProps {
  name?: string;
  imageUrl?: string | null;
  size?: number;
  style?: any;
  showBorder?: boolean;
  isOnline?: boolean; // Accept but don't use (for compatibility)
}

export default function SpeakerAvatar({ 
  name, 
  imageUrl,
  size = 50, 
  style, 
  showBorder = false,
  isOnline // Accept but don't use
}: SpeakerAvatarProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageTimeout, setImageTimeout] = useState(false);
  // Track failed URLs to prevent infinite retry loops
  const failedUrlsRef = useRef<Set<string>>(new Set());
  const currentUrlRef = useRef<string | null>(null);
  // Animated value for smooth fade-in
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Track which URL we're currently trying (local optimized, S3, or null)
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string | null>(null);
  const [urlSource, setUrlSource] = useState<'local' | 's3' | null>(null);
  
  // Memoize computed values to determine avatar URL priority
  const { localOptimizedUrl, s3Url } = useMemo(() => {
    // Priority 1: Check for local optimized avatar in public folder
    const localUrl = name ? getLocalOptimizedAvatarUrl(name) : null;
    
    // Priority 2: Use provided imageUrl or generate S3 URL
    const s3 = imageUrl || (name ? getSpeakerAvatarUrl(name) : null);
    
    return { localOptimizedUrl: localUrl, s3Url: s3 };
  }, [imageUrl, name]);
  
  // Determine which URL to use (prioritize local optimized)
  useEffect(() => {
    if (localOptimizedUrl) {
      // Try local optimized first
      setCurrentAvatarUrl(localOptimizedUrl);
      setUrlSource('local');
    } else if (s3Url) {
      // Fallback to S3
      setCurrentAvatarUrl(s3Url);
      setUrlSource('s3');
    } else {
      setCurrentAvatarUrl(null);
      setUrlSource(null);
    }
  }, [localOptimizedUrl, s3Url]);
  
  const avatarUrl = currentAvatarUrl;
  const isS3Url = urlSource === 's3';

  // Reset error state when avatarUrl changes
  useEffect(() => {
    if (avatarUrl) {
      currentUrlRef.current = avatarUrl;
      
      // Check if this URL has already failed - if so, try fallback
      if (failedUrlsRef.current.has(avatarUrl)) {
        // If local optimized failed, try S3
        if (urlSource === 'local' && s3Url && s3Url !== avatarUrl) {
          // Only log in development
          if (process.env.NODE_ENV !== 'production') {
            console.log(`[SpeakerAvatar] Local optimized failed for ${name}, trying S3:`, s3Url);
          }
          setCurrentAvatarUrl(s3Url);
          setUrlSource('s3');
          return;
        }
        
        // If S3 also failed or no fallback, show initials
        if (process.env.NODE_ENV !== 'production') {
          console.warn(`[SpeakerAvatar] All URLs failed for ${name}, showing initials`);
        }
        setImageError(true);
        setImageLoading(false);
        setImageTimeout(false);
        return;
      }
      
      // Only log in development to reduce console noise
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[SpeakerAvatar] Loading ${urlSource} image for ${name}:`, {
          url: avatarUrl,
          source: urlSource,
          hasImageUrl: !!imageUrl,
        });
      }
      setImageError(false);
      setImageLoading(true);
      setImageTimeout(false);
      // Reset fade animation when URL changes
      fadeAnim.setValue(0);
      
      // Shorter timeout for local optimized (should be instant), longer for S3
      const timeoutDuration = urlSource === 'local' ? 3000 : 10000;
      const timeoutId = setTimeout(() => {
        if (process.env.NODE_ENV !== 'production') {
          console.warn(`[SpeakerAvatar] Image load timeout (${timeoutDuration}ms) for ${name}:`, avatarUrl);
        }
        // Mark URL as failed
        failedUrlsRef.current.add(avatarUrl);
        
        // If local optimized failed, try S3 fallback
        if (urlSource === 'local' && s3Url && s3Url !== avatarUrl) {
          if (process.env.NODE_ENV !== 'production') {
            console.log(`[SpeakerAvatar] Local optimized timeout, falling back to S3 for ${name}`);
          }
          setCurrentAvatarUrl(s3Url);
          setUrlSource('s3');
          // Don't set error yet - try S3 first
        } else {
          // S3 also failed or no fallback - show initials
          setImageTimeout(true);
          setImageLoading(false);
        }
      }, timeoutDuration);

      return () => clearTimeout(timeoutId);
    } else {
      setImageError(true);
      setImageLoading(false);
    }
  }, [avatarUrl, urlSource, name, imageUrl, s3Url]);

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
        <Animated.View
          style={[
            styles.imageContainer,
            { opacity: fadeAnim }
          ]}
        >
          <Image
            source={{ uri: avatarUrl }}
            style={styles.image}
            resizeMode="cover"
            pointerEvents="auto"
          onError={(error) => {
            const errorMessage = error.nativeEvent?.error || error.message || 'Unknown error';
            const statusCode = error.nativeEvent?.statusCode || error.statusCode || 'unknown';
            
            if (process.env.NODE_ENV !== 'production') {
              console.error(`[SpeakerAvatar] ${urlSource} image load error for ${name}:`, {
                url: avatarUrl,
                error: errorMessage,
                statusCode: statusCode,
                source: urlSource,
              });
            }
            
            // Mark URL as failed
            if (avatarUrl) {
              failedUrlsRef.current.add(avatarUrl);
            }
            
            // If local optimized failed, try S3 fallback
            if (urlSource === 'local' && s3Url && s3Url !== avatarUrl) {
              if (process.env.NODE_ENV !== 'production') {
                console.log(`[SpeakerAvatar] Local optimized failed, falling back to S3 for ${name}`);
              }
              setCurrentAvatarUrl(s3Url);
              setUrlSource('s3');
              // Don't set error yet - try S3 first
            } else {
              // S3 also failed or no fallback - show initials
              setImageError(true);
              setImageLoading(false);
            }
          }}
          onLoad={() => {
            // Only log in development
            if (process.env.NODE_ENV !== 'production') {
              console.log(`[SpeakerAvatar] Image loaded successfully for ${name}:`, avatarUrl);
            }
            setImageLoading(false);
            setImageTimeout(false);
            setImageError(false);
            // Fade in the image smoothly
            Animated.timing(fadeAnim, {
              toValue: 1,
              duration: 200,
              useNativeDriver: true,
            }).start();
          }}
          onLoadEnd={() => {
            setImageLoading(false);
          }}
          onLoadStart={() => {
            // Only reset error if this URL hasn't failed before
            // This prevents infinite retry loops for missing images
            if (avatarUrl && !failedUrlsRef.current.has(avatarUrl)) {
              setImageError(false);
            }
            setImageLoading(true);
            // Reset fade animation when starting to load
            fadeAnim.setValue(0);
          }}
        />
        </Animated.View>
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
  imageContainer: {
    width: size,
    height: size,
    borderRadius: size / 2,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  image: {
    width: size,
    height: size,
    borderRadius: size / 2,
    borderWidth: showBorder ? 2 : 0,
    borderColor: showBorder ? '#007AFF' : 'transparent',
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
