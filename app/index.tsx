import React, { useRef, useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet, Animated, TouchableOpacity } from 'react-native'; // Added TouchableOpacity
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import type { Session } from '@supabase/supabase-js';

const AnimatedImage = Animated.createAnimatedComponent(Image);

export default function HomeScreen() {
  const [session, setSession] = useState<Session | null>(null);
  const [userName, setUserName] = useState<string | null>(null);

  const router = useRouter();
  const scrollY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Get current session
    const getSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (data?.session) {
        setSession(data.session);
        setUserName(
          data.session.user.email || data.session.user.user_metadata?.full_name || data.session.user.id
        );
      } else {
        setSession(null);
        setUserName(null);
      }
    };
    getSession();

    // Subscribe to session changes
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (session && session.user) {
        setUserName(
          session.user.email || session.user.user_metadata?.full_name || session.user.id
        );
      } else {
        setUserName(null);
      }
    });
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Animations with Easing functions for smoother transitions
  // Header opacity fades out as user scrolls down
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  // Hero image scales down and fades out slightly as user scrolls
  const heroImageScale = scrollY.interpolate({
    inputRange: [0, 200],
    outputRange: [1, 0.9], // subtle scale down effect
    extrapolate: 'clamp',
  });
  const heroImageOpacity = scrollY.interpolate({
    inputRange: [0, 200],
    outputRange: [1, 0], // Fades out completely
    extrapolate: 'clamp',
  });

  // Features section fades in and scales up as it comes into view
  const featuresOpacity = scrollY.interpolate({
    inputRange: [0, 250, 400], // Start fading in earlier
    outputRange: [0, 0.5, 1],
    extrapolate: 'clamp',
  });
  const featuresScale = scrollY.interpolate({
    inputRange: [0, 250, 400],
    outputRange: [0.9, 0.95, 1], // subtle scale up effect
    extrapolate: 'clamp',
  });

  // Call to Action section fades in and scales up
  const ctaOpacity = scrollY.interpolate({
    inputRange: [300, 500], // Appears after features
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const ctaScale = scrollY.interpolate({
    inputRange: [300, 500],
    outputRange: [0.9, 1], // subtle scale up effect
    extrapolate: 'clamp',
  });

  return (
    <SafeAreaView style={styles.container}>
      <Animated.ScrollView
        style={styles.scrollView}
        scrollEventThrottle={16} // Update scroll position frequently for smooth animations
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true } // Use native driver for performance
        )}
      >
        {/* Hero Section - Immersive background with fading text */}
        <View style={styles.hero}>
          <Animated.View style={{ transform: [{ scale: heroImageScale }], opacity: heroImageOpacity }}>
            <AnimatedImage
              source={{ uri: 'https://images.pexels.com/photos/7096461/pexels-photo-7096461.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2' }} // Abstract background
              style={styles.heroImage}
              resizeMode="cover"
            />
          </Animated.View>
          <Animated.View style={[styles.heroTextContainer, { opacity: headerOpacity }]}>
            <Text style={styles.headline}>HashPass</Text>
            <Text style={styles.tagline}>Your Digital Life, Simplified.</Text>
          </Animated.View>
        </View>

        {/* Features Section - Animated reveal of key benefits */}
        <Animated.View style={[styles.features, { opacity: featuresOpacity, transform: [{ scale: featuresScale }] }]}>
          <Text style={styles.sectionTitle}>Unlock Your Potential</Text>
          {/* Feature 1 */}
          <View style={styles.feature}>
            <Image source={{ uri: 'https://images.pexels.com/photos/11816764/pexels-photo-11816764.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2' }} style={styles.featureIcon} />
            <Text style={styles.featureTitle}>Secure & Private</Text>
            <Text style={styles.featureDescription}>Your data is encrypted and protected with industry-leading security protocols. We prioritize your privacy above all else.</Text>
          </View>
          {/* Feature 2 */}
          <View style={styles.feature}>
            <Image source={{ uri: 'https://images.pexels.com/photos/11816764/pexels-photo-11816764.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2' }} style={styles.featureIcon} />
            <Text style={styles.featureTitle}>Effortless Management</Text>
            <Text style={styles.featureDescription}>Organize all your digital credentials, loyalty cards, and important notes in one intuitive place.</Text>
          </View>
          {/* Feature 3 */}
          <View style={styles.feature}>
            <Image source={{ uri: 'https://images.pexels.com/photos/11816764/pexels-photo-11816764.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2' }} style={styles.featureIcon} />
            <Text style={styles.featureTitle}>Cross-Platform Sync</Text>
            <Text style={styles.featureDescription}>Access your HashPass vault seamlessly across all your devices, anytime, anywhere.</Text>
          </View>
        </Animated.View>

        {/* Call to Action or User Info - Prominent and inviting */}
        <Animated.View style={[styles.cta, { opacity: ctaOpacity, transform: [{ scale: ctaScale }] }]}> 
          {userName ? (
            <>
              <Text style={styles.ctaHeadline}>Welcome back! <br />{userName}</Text>
              <TouchableOpacity style={styles.ctaButton} onPress={() => router.push('/(tabs)/home')}>
                <Text style={styles.ctaButtonText}>Go to App</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.ctaHeadline}>Ready to Simplify Your Digital Life?</Text>
              <TouchableOpacity style={styles.ctaButton} onPress={() => router.push('/auth')}>
                <Text style={styles.ctaButtonText}>Get Started Now</Text>
              </TouchableOpacity>
            </>
          )}
        </Animated.View>

        {/* Social Proof Section - Build trust and credibility */}
        <Animated.View style={[styles.socialProof, { opacity: featuresOpacity, transform: [{ scale: featuresScale }] }]}>
          <Text style={styles.sectionTitle}>Trusted by Thousands</Text>
          <View style={styles.testimonialContainer}>
            <Text style={styles.testimonialText}>"HashPass has revolutionized how I manage my online accounts. It's secure, fast, and incredibly easy to use!"</Text>
            <Text style={styles.testimonialAuthor}>- Alex P., Tech Enthusiast</Text>
          </View>
          <View style={styles.testimonialContainer}>
            <Text style={styles.testimonialText}>"Finally, a digital wallet that I can truly trust. The peace of mind is priceless."</Text>
            <Text style={styles.testimonialAuthor}>- Sarah L., Small Business Owner</Text>
          </View>
          {/* Add more testimonials or partner logos here */}
        </Animated.View>

        {/* Footer or additional content */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>© 2025 HashPass. All rights reserved.</Text>
        </View>
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#171717', // Background color from palette
  },
  scrollView: {
    flex: 1,
  },
  hero: {
    width: '100%',
    height: 500, // Adjust height as needed
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 16, // Rounded corners
    marginBottom: 32,
  },
  heroImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    borderRadius: 16,
  },
  heroTextContainer: {
    position: 'absolute',
    zIndex: 1,
    alignItems: 'center',
    padding: 24,
    backgroundColor: 'rgba(0,0,0,0.4)', // Semi-transparent overlay for readability
    borderRadius: 16,
  },
  headline: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFFFFF', // Text color from palette
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  tagline: {
    fontSize: 22,
    color: '#A3A3A3', // Secondary text color
    textAlign: 'center',
    maxWidth: '80%',
    lineHeight: 30,
  },
  sectionTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 24,
    marginTop: 40,
  },
  features: {
    paddingHorizontal: 24,
    paddingVertical: 32,
    backgroundColor: '#262626', // Surface color
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
    alignItems: 'center',
    marginBottom: 32,
    padding: 16,
    backgroundColor: '#171717', // Darker background for individual features
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2F2F2F', // Border color
  },
  featureIcon: {
    width: 80,
    height: 80,
    marginBottom: 16,
    borderRadius: 40, // Make icons circular
    backgroundColor: '#38bdf8', // Secondary color for icon background
  },
  featureTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  featureDescription: {
    fontSize: 16,
    color: '#A3A3A3',
    textAlign: 'center',
    lineHeight: 24,
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
    backgroundColor: '#262626',
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
    backgroundColor: '#171717',
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
  footer: {
    padding: 24,
    alignItems: 'center',
    backgroundColor: '#171717',
    borderTopWidth: 1,
    borderColor: '#2F2F2F',
  },
  footerText: {
    fontSize: 14,
    color: '#A3A3A3',
  },
});
