import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, Image, Animated, ActivityIndicator } from 'react-native';
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
  // Initial state: start with loading=true if we expect to have a URL
  // This ensures we show loading spinner initially, not initials
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(false); // Will be set to true when URL is determined
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
    // Reset loading state when URLs change
    setImageLoading(true);
    setImageError(false);
    setImageTimeout(false);
    
    if (localOptimizedUrl) {
      // Try local optimized first
      setCurrentAvatarUrl(localOptimizedUrl);
      setUrlSource('local');
    } else if (s3Url) {
      // Fallback to S3
      setCurrentAvatarUrl(s3Url);
      setUrlSource('s3');
    } else {
      // No URLs available - show initials immediately
      setCurrentAvatarUrl(null);
      setUrlSource(null);
      setImageLoading(false);
      setImageError(true);
      setImageTimeout(true);
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
          console.log(`[SpeakerAvatar] Local optimized failed for ${name}, trying S3:`, s3Url);
          setCurrentAvatarUrl(s3Url);
          setUrlSource('s3');
          // Reset states for new attempt
          setImageError(false);
          setImageLoading(true);
          setImageTimeout(false);
          return;
        }
        
        // If S3 also failed or no fallback, show initials
        console.warn(`[SpeakerAvatar] All URLs failed for ${name}, showing initials`);
        setImageError(true);
        setImageLoading(false);
        setImageTimeout(true);
        return;
      }
      
      // Always log to help debug avatar loading issues
      console.log(`[SpeakerAvatar] Loading ${urlSource} image for ${name}:`, {
        url: avatarUrl,
        source: urlSource,
        hasImageUrl: !!imageUrl,
        localOptimizedUrl,
        s3Url,
      });
      
      // Reset all states and start loading
      setImageError(false);
      setImageLoading(true);
      setImageTimeout(false);
      // Reset fade animation when URL changes
      fadeAnim.setValue(0);
      
      // For local optimized, use a very short timeout (2 seconds) since it should be instant
      // For S3, use longer timeout (15 seconds) to handle slow connections
      const timeoutDuration = urlSource === 'local' ? 2000 : 15000;
      const timeoutId = setTimeout(() => {
        console.warn(`[SpeakerAvatar] ⏱️ Image load timeout (${timeoutDuration}ms) for ${name} from ${urlSource}:`, avatarUrl);
        // Mark URL as failed
        if (avatarUrl) {
          failedUrlsRef.current.add(avatarUrl);
        }
        
        // If local optimized failed, try S3 fallback immediately
        if (urlSource === 'local' && s3Url && s3Url !== avatarUrl) {
          console.log(`[SpeakerAvatar] Local optimized timeout (likely 404), falling back to S3 for ${name}:`, s3Url);
          setCurrentAvatarUrl(s3Url);
          setUrlSource('s3');
          // Reset error state to allow S3 to try
          setImageError(false);
          setImageLoading(true);
          setImageTimeout(false);
          // Don't set error yet - try S3 first
        } else {
          // S3 also failed or no fallback - show initials
          console.warn(`[SpeakerAvatar] All image sources timed out for ${name}, showing initials`);
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
  // Show image when we have a URL and it loaded successfully (not loading, no errors)
  // Show loading state when actively loading (has URL, loading=true, no errors yet)
  // Show placeholder (initials) only when:
  //   - No URL available at all, OR
  //   - All sources failed (error + timeout) and not currently loading
  const showImage = avatarUrl && !imageError && !imageTimeout && !imageLoading;
  const showLoading = imageLoading && avatarUrl && !imageError && !imageTimeout;
  const showPlaceholder = !avatarUrl || (!imageLoading && (imageError || imageTimeout));

  return (
    <View style={[styles.container, style]}>
      {/* Placeholder with initials (shown when no image or all sources failed) */}
      {showPlaceholder && (
        <View 
          style={styles.placeholderContainer}
          pointerEvents={showImage ? "none" : "auto"}
        >
          <Text style={styles.initialsText}>{getInitials(name)}</Text>
        </View>
      )}
      
      {/* Loading indicator (shown while loading) */}
      {showLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator 
            size={size < 40 ? 'small' : 'small'} 
            color="#007AFF" 
          />
        </View>
      )}
      
      {/* Image (rendered on top when loaded successfully) */}
      {showImage && avatarUrl && (
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
            
            // Always log errors to help debug
            console.error(`[SpeakerAvatar] ${urlSource} image load error for ${name}:`, {
              url: avatarUrl,
              error: errorMessage,
              statusCode: statusCode,
              source: urlSource,
              hasS3Fallback: !!(s3Url && s3Url !== avatarUrl),
              errorObject: error,
            });
            
            // Mark URL as failed
            if (avatarUrl) {
              failedUrlsRef.current.add(avatarUrl);
            }
            
            // If local optimized failed (404 or any error), try S3 fallback immediately
            if (urlSource === 'local' && s3Url && s3Url !== avatarUrl) {
              console.log(`[SpeakerAvatar] Local optimized failed (status: ${statusCode}), falling back to S3 for ${name}:`, s3Url);
              setCurrentAvatarUrl(s3Url);
              setUrlSource('s3');
              // Reset error state to allow S3 to try
              setImageError(false);
              setImageLoading(true);
              setImageTimeout(false);
              // Don't set error yet - try S3 first
            } else {
              // S3 also failed or no fallback - show initials
              console.warn(`[SpeakerAvatar] All image sources failed for ${name}, showing initials`);
              setImageError(true);
              setImageLoading(false);
              setImageTimeout(true);
            }
          }}
          onLoad={() => {
            console.log(`[SpeakerAvatar] ✅ Image loaded successfully for ${name} from ${urlSource}:`, avatarUrl);
            setImageLoading(false);
            setImageTimeout(false);
            setImageError(false);
            // Clear from failed URLs since it loaded successfully
            if (avatarUrl) {
              failedUrlsRef.current.delete(avatarUrl);
            }
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
  loadingContainer: {
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: showBorder ? 2 : 0,
    borderColor: showBorder ? '#007AFF' : 'transparent',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  initialsText: {
    fontSize: size * 0.35,
    fontWeight: '600',
    color: '#666666',
    textAlign: 'center',
  },
});
