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
  // Initial state: start with loading=false, will be set to true when we have URLs to load
  // This ensures we show initials immediately if no URLs are available
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(false); // Start with false, will be set to true when loading starts
  const [imageTimeout, setImageTimeout] = useState(false);
  // Track failed URLs to prevent infinite retry loops
  const failedUrlsRef = useRef<Set<string>>(new Set());
  const currentUrlRef = useRef<string | null>(null);
  const loadSuccessRef = useRef<boolean>(false); // Track if onLoad was called
  // Animated value for smooth fade-in
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Track which URL we're currently trying (local optimized, S3, or null)
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string | null>(null);
  const [urlSource, setUrlSource] = useState<'local' | 's3' | null>(null);
  
  // Store URLs in refs to prevent dependency issues
  const localOptimizedUrlRef = useRef<string | null>(null);
  const s3UrlRef = useRef<string | null>(null);
  const previousAvatarUrlRef = useRef<string | null>(null);
  
  // Memoize computed values to determine avatar URL priority
  const { localOptimizedUrl, s3Url } = useMemo(() => {
    // Normalize imageUrl: treat null, undefined, or empty string as null
    const normalizedImageUrl = (imageUrl && typeof imageUrl === 'string' && imageUrl.trim() !== '') 
      ? imageUrl.trim() 
      : null;
    
    // Priority 1: Check for local optimized avatar in public folder
    const localUrl = name ? getLocalOptimizedAvatarUrl(name) : null;
    
    // Priority 2: Use provided imageUrl (if valid) or generate S3 URL from name
    const s3 = normalizedImageUrl || (name ? getSpeakerAvatarUrl(name) : null);
    
    return { localOptimizedUrl: localUrl, s3Url: s3 };
  }, [imageUrl, name]);
  
  // Update refs when URLs change
  useEffect(() => {
    localOptimizedUrlRef.current = localOptimizedUrl;
    s3UrlRef.current = s3Url;
  }, [localOptimizedUrl, s3Url]);
  
  // Determine which URL to use (prioritize local optimized)
  // This effect only runs when the computed URLs change, not when avatarUrl changes
  useEffect(() => {
    // Reset states when URLs change
    setImageError(false);
    setImageTimeout(false);
    loadSuccessRef.current = false;
    
    if (localOptimizedUrl) {
      // Try local optimized first - set loading state and URL
      setImageLoading(true);
      setCurrentAvatarUrl(localOptimizedUrl);
      setUrlSource('local');
      previousAvatarUrlRef.current = localOptimizedUrl;
    } else if (s3Url) {
      // Fallback to S3 - set loading state and URL
      setImageLoading(true);
      setCurrentAvatarUrl(s3Url);
      setUrlSource('s3');
      previousAvatarUrlRef.current = s3Url;
    } else {
      // No URLs available - show initials immediately (no loader needed)
      setCurrentAvatarUrl(null);
      setUrlSource(null);
      previousAvatarUrlRef.current = null;
      setImageLoading(false);
      setImageError(true);
      setImageTimeout(true);
    }
  }, [localOptimizedUrl, s3Url]);
  
  const avatarUrl = currentAvatarUrl;

  // Handle timeouts and loading state - only runs when avatarUrl actually changes
  useEffect(() => {
    // Skip if URL hasn't actually changed
    if (avatarUrl === previousAvatarUrlRef.current) {
      return;
    }
    
    previousAvatarUrlRef.current = avatarUrl;
    
    if (avatarUrl) {
      currentUrlRef.current = avatarUrl;
      
      // Check if this URL has already failed - if so, try fallback
      if (failedUrlsRef.current.has(avatarUrl)) {
        // If local optimized failed, try S3
        if (urlSource === 'local' && s3UrlRef.current && s3UrlRef.current !== avatarUrl) {
          console.log(`[SpeakerAvatar] Local optimized failed for ${name}, trying S3:`, s3UrlRef.current);
          // Use setTimeout to break the update cycle
          setTimeout(() => {
            setCurrentAvatarUrl(s3UrlRef.current);
            setUrlSource('s3');
            // Reset states for new attempt
            setImageError(false);
            setImageLoading(true);
            setImageTimeout(false);
          }, 0);
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
        localOptimizedUrl: localOptimizedUrlRef.current,
        s3Url: s3UrlRef.current,
      });
      
      // Reset all states and start loading
      setImageError(false);
      setImageLoading(true);
      setImageTimeout(false);
      loadSuccessRef.current = false; // Reset load success flag
      // Reset fade animation when URL changes
      fadeAnim.setValue(0);
      
      // For local optimized, use a very short timeout (2 seconds) since it should be instant
      // For S3, use longer timeout (15 seconds) to handle slow connections
      const timeoutDuration = urlSource === 'local' ? 2000 : 15000;
      const timeoutId = setTimeout(() => {
        // Check if URL is still the same (might have changed)
        if (currentUrlRef.current !== avatarUrl) {
          return; // URL changed, ignore this timeout
        }
        
        console.warn(`[SpeakerAvatar] ⏱️ Image load timeout (${timeoutDuration}ms) for ${name} from ${urlSource}:`, avatarUrl);
        // Mark URL as failed
        if (avatarUrl) {
          failedUrlsRef.current.add(avatarUrl);
        }
        
        // If local optimized failed, try S3 fallback immediately
        if (urlSource === 'local' && s3UrlRef.current && s3UrlRef.current !== avatarUrl) {
          console.log(`[SpeakerAvatar] ⏱️ Local optimized timeout (likely 404), falling back to S3 for ${name}:`, s3UrlRef.current);
          
          // Reset load success flag for new attempt
          loadSuccessRef.current = false;
          
          // Immediately switch to S3 URL
          setCurrentAvatarUrl(s3UrlRef.current);
          setUrlSource('s3');
          // Reset error state to allow S3 to try
          setImageError(false);
          setImageLoading(true);
          setImageTimeout(false);
          // Update currentUrlRef so we track the new URL
          currentUrlRef.current = s3UrlRef.current;
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
  }, [avatarUrl, urlSource, name, imageUrl]); // Removed s3Url and localOptimizedUrl from deps

  // Helper to get initials (always two letters or '??')
  const getInitials = (n?: string) => {
    if (!n || typeof n !== 'string' || !n.trim()) return '??';
    const parts = n.trim().split(' ');
    if (parts.length === 1) return (parts[0][0] + (parts[0][1] || parts[0][0])).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  const styles = getStyles(size, showBorder);
  // Show image when we have a URL and it loaded successfully (not loading, no errors)
  // Show loading state when:
  //   - Actively loading (has URL, loading=true, no errors yet), OR
  //   - We have URLs available but haven't set avatarUrl yet (initial load)
  // Show placeholder (initials) only when:
  //   - No URL available at all, OR
  //   - All sources failed (error + timeout) and not currently loading
  const hasUrlsAvailable = !!(localOptimizedUrl || s3Url);
  // Show image when loaded successfully (not loading, no errors, has URL)
  // Note: We check !imageLoading && !imageError && !imageTimeout to ensure image is ready
  const showImage = avatarUrl && !imageError && !imageTimeout && !imageLoading;
  // Show loading when:
  // - Actively loading (imageLoading=true and have URL)
  // BUT NOT when we have errors/timeouts (those should show placeholder)
  const showLoading = imageLoading && avatarUrl && !imageError && !imageTimeout;
  // Show placeholder when:
  // - No URLs available at all, OR
  // - All sources failed (error or timeout) and not currently loading
  const showPlaceholder = (!hasUrlsAvailable && !avatarUrl) || 
                          (!imageLoading && (imageError || imageTimeout));

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
      
      {/* Image - Always render when we have a URL to load, even while loading
          This ensures onLoad/onError callbacks fire properly */}
      {avatarUrl && (
        <Animated.View
          style={[
            styles.imageContainer,
            { 
              opacity: showImage ? fadeAnim : 0, // Hide while loading, show when loaded
              zIndex: showImage ? 2 : 1 // Show on top when loaded
            }
          ]}
          pointerEvents={showImage ? "auto" : "none"}
        >
          <Image
            key={avatarUrl} // Force re-render when URL changes
            source={{ uri: avatarUrl }}
            style={styles.image}
            resizeMode="cover"
            pointerEvents="auto"
          onError={(error) => {
            const errorMessage = error.nativeEvent?.error || error.message || 'Unknown error';
            const statusCode = error.nativeEvent?.statusCode || error.statusCode || 'unknown';
            
            // Mark as not successfully loaded
            loadSuccessRef.current = false;
            
            // Always log errors to help debug
            console.error(`[SpeakerAvatar] ❌ ${urlSource} image load error for ${name}:`, {
              url: avatarUrl,
              error: errorMessage,
              statusCode: statusCode,
              source: urlSource,
              hasS3Fallback: !!(s3UrlRef.current && s3UrlRef.current !== avatarUrl),
              s3Url: s3UrlRef.current,
              localOptimizedUrl: localOptimizedUrlRef.current,
              errorObject: error,
            });
            
            // Mark URL as failed
            if (avatarUrl) {
              failedUrlsRef.current.add(avatarUrl);
            }
            
            // If local optimized failed (404 or any error), try S3 fallback immediately
            if (urlSource === 'local' && s3UrlRef.current && s3UrlRef.current !== avatarUrl) {
              console.log(`[SpeakerAvatar] 🔄 Local optimized failed (status: ${statusCode}), falling back to S3 for ${name}`);
              console.log(`[SpeakerAvatar] 🔄 Switching from local: ${avatarUrl} to S3: ${s3UrlRef.current}`);
              
              // Reset load success flag for new attempt
              loadSuccessRef.current = false;
              
              // Immediately switch to S3 URL - don't use setTimeout to avoid delays
              setCurrentAvatarUrl(s3UrlRef.current);
              setUrlSource('s3');
              // Reset error state to allow S3 to try
              setImageError(false);
              setImageLoading(true);
              setImageTimeout(false);
              // Reset fade animation for new image
              fadeAnim.setValue(0);
              
              // Update currentUrlRef so timeout handler knows URL changed
              currentUrlRef.current = s3UrlRef.current;
            } else {
              // S3 also failed or no fallback - show initials
              console.warn(`[SpeakerAvatar] ❌ All image sources failed for ${name}, showing initials`);
              setImageError(true);
              setImageLoading(false);
              setImageTimeout(true);
            }
          }}
          onLoad={() => {
            console.log(`[SpeakerAvatar] ✅ Image loaded successfully for ${name} from ${urlSource}:`, avatarUrl);
            // Mark as successfully loaded
            loadSuccessRef.current = true;
            // Always clear loading state when image loads
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
            // onLoadEnd fires after both success and error
            // Check if onLoad was called - if so, image loaded successfully
            // If onLoad wasn't called, onError should have been called instead
            // Use a small delay to allow onLoad/onError to update loadSuccessRef
            setTimeout(() => {
              if (loadSuccessRef.current) {
                // Image loaded successfully - ensure loading is false
                setImageLoading(false);
                setImageError(false);
                setImageTimeout(false);
              }
              // If loadSuccessRef is false, onError should have handled it
              // But if somehow neither fired, we'll rely on the timeout
            }, 100);
          }}
          onLoadStart={() => {
            // Only reset error if this URL hasn't failed before
            // This prevents infinite retry loops for missing images
            if (avatarUrl && !failedUrlsRef.current.has(avatarUrl)) {
              setImageError(false);
              setImageTimeout(false);
              // Set loading to true when starting to load
              setImageLoading(true);
            }
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
