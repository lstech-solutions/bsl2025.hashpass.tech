import React, { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { ThemeAndLanguageSwitcher } from '../components/ThemeAndLanguageSwitcher';
import Animated, {
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  interpolate,
  Extrapolation,
  withTiming,
} from 'react-native-reanimated';

const AnimatedImage = Animated.createAnimatedComponent(Image);

export default function HomeScreen() {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const [userName, setUserName] = useState<string | null>(null);
  
  const styles = getStyles(isDark, colors);
  const systemColorScheme = useColorScheme();
  const [isMounted, setIsMounted] = React.useState(false);

  // Prevent flash of incorrect theme on mount
  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  // Smooth background transition
  const bgAnimation = useSharedValue(0);
  
  useEffect(() => {
    bgAnimation.value = withTiming(1, { duration: 300 });
  }, [isDark]);

  const animatedBackground = useAnimatedStyle(() => ({
    opacity: bgAnimation.value,
    backgroundColor: withTiming(
      isDark ? '#121212' : '#FFFFFF',
      { duration: 300 }
    )
  }));

  const router = useRouter();
  const scrollY = useSharedValue(0);

  useEffect(() => {
    if (user) {
      setUserName(user.email || user.user_metadata?.full_name || user.id);
    } else {
      setUserName(null);
    }
  }, [user]);

  // Animation styles using Reanimated v3
  const headerAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [0, 100],
      [1, 0],
      { extrapolateLeft: Extrapolation.CLAMP, extrapolateRight: Extrapolation.CLAMP }
    );
    return {
      opacity: withTiming(opacity, { duration: 100 })
    };
  });

  const heroImageAnimatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      scrollY.value,
      [0, 200],
      [1, 0.9],
      { extrapolateLeft: Extrapolation.CLAMP, extrapolateRight: Extrapolation.CLAMP }
    );
    const opacity = interpolate(
      scrollY.value,
      [0, 200],
      [1, 0],
      { extrapolateLeft: Extrapolation.CLAMP, extrapolateRight: Extrapolation.CLAMP }
    );
    return {
      transform: [{ scale: withTiming(scale, { duration: 100 }) }],
      opacity: withTiming(opacity, { duration: 100 })
    };
  });

  const featuresAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [0, 250, 400],
      [0, 0.5, 1],
      { extrapolateLeft: Extrapolation.CLAMP, extrapolateRight: Extrapolation.CLAMP }
    );
    const scale = interpolate(
      scrollY.value,
      [0, 250, 400],
      [0.9, 0.95, 1],
      { extrapolateLeft: Extrapolation.CLAMP, extrapolateRight: Extrapolation.CLAMP }
    );
    return {
      opacity: withTiming(opacity, { duration: 100 }),
      transform: [{ scale: withTiming(scale, { duration: 100 }) }]
    };
  });

  const ctaAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [300, 500],
      [0, 1],
      { extrapolateLeft: Extrapolation.CLAMP, extrapolateRight: Extrapolation.CLAMP }
    );
    const scale = interpolate(
      scrollY.value,
      [300, 500],
      [0.9, 1],
      { extrapolateLeft: Extrapolation.CLAMP, extrapolateRight: Extrapolation.CLAMP }
    );
    return {
      opacity: withTiming(opacity, { duration: 100 }),
      transform: [{ scale: withTiming(scale, { duration: 100 }) }]
    };
  });

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  if (!isMounted) {
    return (
      <View style={{ flex: 1, backgroundColor: systemColorScheme === 'dark' ? '#121212' : '#FFFFFF' }} />
    );
  }

  return (
    <Animated.View style={[styles.container, animatedBackground]}>
      <ThemeAndLanguageSwitcher />
      <Animated.ScrollView
        style={styles.scrollView}
        scrollEventThrottle={16}
        onScroll={scrollHandler}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section - Immersive background with fading text */}
        <View style={styles.hero}>
          <Animated.View style={heroImageAnimatedStyle}>
            <AnimatedImage
              source={{ uri: 'https://images.pexels.com/photos/7096461/pexels-photo-7096461.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2' }}
              style={styles.heroImage}
              resizeMode="cover"
              sharedTransitionTag="heroImage"
            />
          </Animated.View>
          <Animated.View style={[styles.heroTextContainer, headerAnimatedStyle]}>
            <Image 
              source={isDark 
                ? require('../assets/logos/logo-full-hashpass-black.svg')
                : require('../assets/logos/logo-full-hashpass-white.svg')
              } 
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={[styles.tagline, { color: colors.text.primary }]}>YOUR EVENT - YOUR COMMUNITY - YOUR BENEFITS</Text>
          </Animated.View>
          
        </View>

        {/* Features Section - Animated reveal of key benefits */}
        <Animated.View style={[styles.features, featuresAnimatedStyle]}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Unlock Your Potential</Text>
          {/* Feature 1 */}
          <View style={styles.feature}>
            <Image source={{ uri: 'https://images.pexels.com/photos/11816764/pexels-photo-11816764.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2' }} style={styles.featureIcon} />
            <Text style={[styles.featureTitle, { color: colors.text.onSurface }]}>Secure & Private</Text>
            <Text style={[styles.featureDescription, { color: colors.text.onSurfaceVariant }]}>Your data is encrypted and protected with industry-leading security protocols. We prioritize your privacy above all else.</Text>
          </View>
          {/* Feature 2 */}
          <View style={styles.feature}>
            <Image source={{ uri: 'https://images.pexels.com/photos/11816764/pexels-photo-11816764.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2' }} style={styles.featureIcon} />
            <Text style={[styles.featureTitle, { color: colors.text.onSurface }]}>Effortless Management</Text>
            <Text style={[styles.featureDescription, { color: colors.text.onSurfaceVariant }]}>Organize all your digital credentials, loyalty cards, and important notes in one intuitive place.</Text>
          </View>
          {/* Feature 3 */}
          <View style={styles.feature}>
            <Image source={{ uri: 'https://images.pexels.com/photos/11816764/pexels-photo-11816764.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2' }} style={styles.featureIcon} />
            <Text style={[styles.featureTitle, { color: colors.text.onSurface }]}>Cross-Platform Sync</Text>
            <Text style={[styles.featureDescription, { color: colors.text.onSurfaceVariant }]}>Access your data across all your devices with our secure cloud sync. Your information is always up to date, everywhere.</Text>
          </View>
        </Animated.View>

        {/* Call to Action or User Info - Prominent and inviting */}
        <Animated.View style={[styles.cta, ctaAnimatedStyle, { backgroundColor: colors.background.paper }]}>
          {userName ? (
            <>
              <Text style={[styles.ctaHeadline, { color: colors.text.onSurface }]}>Welcome back! <br />{userName}</Text>
              <TouchableOpacity 
                style={[styles.ctaButton, { backgroundColor: colors.primary }]} 
                onPress={() => router.push('/(tabs)/wallet')}
              >
                <Text style={[styles.ctaButtonText, { color: colors.primaryContrastText }]}>Go to App</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={[styles.ctaHeadline, { color: colors.text.primary }]}>Ready to Simplify Your Digital Life?</Text>
              <TouchableOpacity 
                style={[styles.ctaButton, { backgroundColor: colors.primary }]} 
                onPress={() => router.push('/auth')}
              >
                <Text style={[styles.ctaButtonText, { color: colors.primaryContrastText }]}>Get Started Now</Text>
              </TouchableOpacity>
            </>
          )}
        </Animated.View>

        {/* Social Proof Section - Build trust and credibility */}
        <Animated.View style={[styles.socialProof, featuresAnimatedStyle]}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Trusted by Thousands</Text>
          <View style={[styles.testimonialContainer, { backgroundColor: colors.surface }]}>
            <Text style={[styles.testimonialText, { color: colors.text.primary }]}>"HashPass has revolutionized how I manage my online accounts. It's secure, fast, and incredibly easy to use!"</Text>
            <Text style={[styles.testimonialAuthor, { color: colors.text.primary }]}>- Alex P., Tech Enthusiast</Text>
          </View>
          <View style={[styles.testimonialContainer, { backgroundColor: colors.surface, marginTop: 16 }]}>
            <Text style={[styles.testimonialText, { color: colors.text.primary }]}>"Finally, a digital wallet that I can truly trust. The peace of mind is priceless."</Text>
            <Text style={[styles.testimonialAuthor, { color: colors.text.primary }]}>- Sarah L., Small Business Owner</Text>
          </View>
        </Animated.View>

        {/* Footer or additional content */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>© 2025 HashPass. All rights reserved.</Text>
        </View>
      </Animated.ScrollView>
    </Animated.View>

  );
}

const getStyles = (isDark: boolean, colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  scrollView: {
    flex: 1,
  },
  hero: {
    height: 400,
    position: 'relative',
    overflow: 'hidden',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  heroImage: {
    width: '100%',
    height: '100%',
    opacity: isDark ? 0.8 : 1,
  },
  heroTextContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    width: '100%',
  },
  logo: {
    width: 300,
    height: 100,
    marginBottom: 15,
  },
  headline: {
    fontSize: 48,
    fontWeight: '800',
    marginBottom: 10,
    letterSpacing: -1,
    lineHeight: 48,
  },
  tagline: {
    fontSize: 16,
    opacity: 0.9,
    marginTop: 10,
    fontWeight: '400',
    letterSpacing: 1,
    textAlign: 'center',
    width: '100%',
    maxWidth: 400,
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 30,
    textAlign: 'center',
    letterSpacing: -0.5,
    marginTop: 10,
  },
  footer: {
    padding: 20,
    backgroundColor: colors.background.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerText: {
    fontSize: 14,
    color: colors.text.primary,
    textAlign: 'center',
  },
  features: {
    paddingHorizontal: 24,
    paddingVertical: 32,
    backgroundColor: colors.background.paper, // Surface color
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  feature: {
    marginBottom: 30,
    padding: 25,
    borderRadius: 20,
    backgroundColor: colors.surface,
    shadowColor: isDark ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.05)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
    transform: [{ scale: 1 }],
  },
  featureIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    marginBottom: 20,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  featureTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  featureDescription: {
    fontSize: 16,
    lineHeight: 24,
    opacity: 0.9,
    letterSpacing: 0.1,
  },
  cta: {
    backgroundColor: '#9E7FFF', // Primary color
    padding: 32,
    borderRadius: 16,
    marginHorizontal: 16,
    alignItems: 'center',
    marginBottom: 32,
    shadowColor: '#9E7FFF',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.6,
    shadowRadius: 15,
    elevation: 15,
  },
  ctaHeadline: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 24,
  },
  ctaButton: {
    backgroundColor: '#f472b6', // Accent color
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 12,
    shadowColor: '#f472b6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  ctaButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  socialProof: {
    paddingHorizontal: 24,
    paddingVertical: 32,
    backgroundColor: colors.background.paper,
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  testimonialContainer: {
    backgroundColor: colors.background.paper,
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#2F2F2F',
  },
  testimonialText: {
    fontSize: 18,
    fontStyle: 'italic',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 26,
  },
  testimonialAuthor: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#A3A3A3',
    textAlign: 'right',
  },
});