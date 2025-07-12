import React, { useEffect, useState } from 'react';
import { useTranslation , getCurrentLocale} from '../i18n/i18n';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { ThemeAndLanguageSwitcher } from '../components/ThemeAndLanguageSwitcher';
import { BackToTop } from '../components/BackToTop';
import Testimonials from '../components/Testimonials';
import Animated, {
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Extrapolation,
  withDelay,
  interpolate,
  useAnimatedReaction,
  withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { GlowingEffect } from '../components/GlowingEffect';


const AnimatedImage = Animated.createAnimatedComponent(Image);

export default function HomeScreen() {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const [userName, setUserName] = useState<string | null>(null);
  const { t } = useTranslation('index');
  const styles = getStyles(isDark, colors);
  const bgAnimation = useSharedValue(0);
  const scrollRef = React.useRef<any>(null);
  const feature1Anim = useSharedValue(0);
  const feature2Anim = useSharedValue(0);
  const feature3Anim = useSharedValue(0);


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
  const buttonAnimation = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });


  useEffect(() => {
    if (user) {
      setUserName(user.email || user.user_metadata?.full_name || user.id);
    } else {
      setUserName(null);
    }
  }, [user]);

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

  // Animate features based on scroll position
  useAnimatedReaction(
    () => scrollY.value,
    (currentScrollY) => {
      // Start animating when the features section comes into view
      if (currentScrollY > 150) {
        feature1Anim.value = withTiming(1, { duration: 500 });
        feature2Anim.value = withDelay(200, withTiming(1, { duration: 500 }));
        feature3Anim.value = withDelay(400, withTiming(1, { duration: 500 }));
      } else {
        // Reset animations when scrolling back up
        feature1Anim.value = 0;
        feature2Anim.value = 0;
        feature3Anim.value = 0;
      }
    },
    []
  );

  // Animated styles for each feature
  const feature1Style = useAnimatedStyle(() => ({
    opacity: feature1Anim.value,
    transform: [
      {
        translateY: withTiming((1 - feature1Anim.value) * 30, { duration: 500 })
      }
    ],
  }));

  const feature2Style = useAnimatedStyle(() => ({
    opacity: feature2Anim.value,
    transform: [
      {
        translateY: withTiming((1 - feature2Anim.value) * 30, { duration: 500 })
      }
    ],
  }));

  const feature3Style = useAnimatedStyle(() => ({
    opacity: feature3Anim.value,
    transform: [
      {
        translateY: withTiming((1 - feature3Anim.value) * 30, { duration: 500 })
      }
    ],
  }));


  return (
    <Animated.View style={[styles.container, animatedBackground]}>

      <BackToTop scrollY={scrollY} scrollRef={scrollRef} colors={colors} />

      <Animated.ScrollView
        ref={scrollRef}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        <ThemeAndLanguageSwitcher />
        
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
            <Text style={[styles.tagline, { color: colors.text.primary }]}>{t('tagline')}</Text>
          </Animated.View>

        </View>


        <Animated.View style={[styles.features, featuresAnimatedStyle]}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>{t('unlockPotential')}</Text>

          {/* Feature 1 - Security */}
          <Animated.View style={[styles.feature, feature1Style]}>
            <GlowingEffect
              spread={40}
              glow={true}
              disabled={false}
              proximity={64}
              inactiveZone={0.01}
              borderWidth={3}
            />
            <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons name="shield-checkmark" size={24} color={colors.primary} />
            </View>
            <Text style={[styles.featureTitle, { color: colors.text.onSurface }]}>{t('features.secure.title')}</Text>
            <Text style={[styles.featureDescription, { color: colors.text.onSurfaceVariant }]}>{t('features.secure.description')}</Text>
          </Animated.View>

          {/* Feature 2 - Management */}
          <Animated.View style={[styles.feature, feature2Style]}>
            <GlowingEffect
              spread={40}
              glow={true}
              disabled={false}
              proximity={64}
              inactiveZone={0.01}
              borderWidth={3}
            />
            <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons name="key" size={24} color={colors.primary} />
            </View>
            <Text style={[styles.featureTitle, { color: colors.text.onSurface }]}>{t('features.management.title')}</Text>
            <Text style={[styles.featureDescription, { color: colors.text.onSurfaceVariant }]}>{t('features.management.description')}</Text>
          </Animated.View>

          {/* Feature 3 - Sync */}
          <Animated.View style={[styles.feature, feature3Style]}>
            <GlowingEffect
              spread={40}
              glow={true}
              disabled={false}
              proximity={64}
              inactiveZone={0.01}
              borderWidth={3}
            />
            <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons name="sync" size={24} color={colors.primary} />
            </View>
            <Text style={[styles.featureTitle, { color: colors.text.onSurface }]}>{t('features.sync.title')}</Text>
            <Text style={[styles.featureDescription, { color: colors.text.onSurfaceVariant }]}>{t('features.sync.description')}</Text>
          </Animated.View>
        </Animated.View>


        <Animated.View style={[styles.cta, ctaAnimatedStyle]}>
          {userName ? (
            <>

              <Text style={styles.ctaHeadline}>{t('welcomeBack')} <br />{userName}</Text>
              <Animated.View style={styles.ctaButton}>
                <TouchableOpacity
                  onPress={() => router.push('/(tabs)/wallet')}
                  activeOpacity={0.9}
                  onPressIn={() => {
                    buttonAnimation.value = withSpring(1);
                  }}
                  onPressOut={() => {
                    buttonAnimation.value = withSpring(0);
                  }}
                >
                  <Animated.View>
                    <Text style={styles.ctaButtonText}>{t('goToApp')}</Text>
                  </Animated.View>
                </TouchableOpacity>
              </Animated.View>
            </>
          ) : (
            <>
              <Text style={styles.ctaHeadline}>{t('readyToSimplify')}</Text>
              <Animated.View style={styles.ctaButton}>
                <TouchableOpacity
                  onPress={() => router.push('/auth')}
                  activeOpacity={0.9}
                  onPressIn={() => {
                    buttonAnimation.value = withSpring(1);
                  }}
                  onPressOut={() => {
                    buttonAnimation.value = withSpring(0);
                  }}
                >
                  <Animated.View>
                    <Text style={styles.ctaButtonText}>{t('getStartedNow')}</Text>
                  </Animated.View>
                </TouchableOpacity>
              </Animated.View>
            </>
          )}
        </Animated.View>

        <Animated.View style={[styles.socialProof, featuresAnimatedStyle]}>
          {/* <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>{t('trustedByThousands')}</Text>
          {((t('testimonials', { returnObjects: true }) as unknown) as Array<{ text: string, author: string }>).map((testimonial, index) => (
            <View
              key={index}
              style={[styles.testimonialContainer, {
                backgroundColor: colors.surface,
                marginTop: index > 0 ? 16 : 0
              }]}
            >
              <Text style={[styles.testimonialText, { color: colors.text.primary }]}>{testimonial.text}</Text>
              <Text style={[styles.testimonialAuthor, { color: colors.text.primary }]}>{testimonial.author}</Text>
            </View>
          ))} */}
          <Testimonials locale={getCurrentLocale()} />
        </Animated.View>


        <View style={styles.footer}>
          <Text style={styles.footerText}>{t('copyright')}</Text>
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
    backgroundColor: 'transparent',
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 32,
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
    alignItems: 'center',
    textAlign: 'center',
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 16,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
  featureTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
    letterSpacing: -0.3,
    textAlign: 'center',
    width: '100%',
  },
  featureDescription: {
    fontSize: 16,
    lineHeight: 24,
    opacity: 0.9,
    letterSpacing: 0.1,
    textAlign: 'center',
    width: '100%',
  },
  cta: {
    padding: 32,
    borderRadius: 20,
    marginHorizontal: 16,
    alignItems: 'center',
    marginBottom: 32,
    shadowColor: '#9E7FFF',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.7,
    shadowRadius: 20,
    elevation: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    position: 'relative',
    color: isDark ? '#FFFFFF' : '#121212',

  },
  ctaHeadline: {
    fontSize: 32,
    fontWeight: '800',
    color: isDark ? '#FFFFFF' : '#121212',
    textAlign: 'center',
    marginBottom: 24,
    marginTop: 24,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    letterSpacing: -0.5,
    lineHeight: 40,
  },
  ctaButton: {
    paddingVertical: 18,
    paddingHorizontal: 45,
    borderRadius: 14,
    shadowColor: 'rgba(0, 0, 0, 0.3)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    transform: [{ scale: 1 }],
    overflow: 'hidden',
  },
  ctaButtonText: {
    fontSize: 20,
    fontWeight: '700',
    color: isDark ? '#FFFFFF' : '#121212',
    letterSpacing: 0.5,
  },
  glossyOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '60%',
    backgroundColor: 'transparent',
    opacity: 0.3,
    pointerEvents: 'none',
  },
  socialProof: {
    paddingHorizontal: 24,
    paddingVertical: 32,
    backgroundColor: 'transparent',
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 32,
  },
  testimonialContainer: {
    backgroundColor: 'transparent',
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