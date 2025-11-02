import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, Image, Platform, Animated as RNAnimated } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming, interpolate, withSpring, useAnimatedProps } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname, useNavigation as useExpoNavigation } from 'expo-router';
import { Drawer } from 'expo-router/drawer';
import { DrawerActions, useNavigation } from '@react-navigation/native';
import type { DrawerNavigationProp } from '@react-navigation/drawer';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/types/navigation';
import { useTheme } from '../../../hooks/useTheme';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { useAuth } from '../../../hooks/useAuth';
import { useLanguage } from '../../../providers/LanguageProvider';
import { color } from 'motion/react';
import { ScrollProvider, useScroll } from '../../../contexts/ScrollContext';
import { NotificationProvider } from '../../../contexts/NotificationContext';
import { AnimationProvider, useAnimations } from '../../../providers/AnimationProvider';
import VersionDisplay from '../../../components/VersionDisplay';
import QRScanner from '../../../components/QRScanner';
import AdminQRScanner from '../../../components/AdminQRScanner';
import { isAdmin } from '../../../lib/admin-utils';

// Define the type for our drawer navigation
type DrawerNavigation = CompositeNavigationProp<
  DrawerNavigationProp<RootStackParamList>,
  NativeStackNavigationProp<RootStackParamList>
>;


// Custom drawer content component
function CustomDrawerContent() {
  const { colors, isDark, toggleTheme } = useTheme();
  const { signOut } = useAuth();
  const { locale, setLocale } = useLanguage();
  const { animationsEnabled } = useAnimations();
  const router = useRouter();
  const pathname = usePathname();
  const navigation = useNavigation<DrawerNavigation>();
  const isMobile = useIsMobile();
  const styles = getStyles(isDark, colors, isMobile);

  // Animated fluid gradient effect with multiple layers
  const gradientAnimation1 = useSharedValue(0);
  const gradientAnimation2 = useSharedValue(0);
  const gradientAnimation3 = useSharedValue(0);
  const gradientAnimation4 = useSharedValue(0);
  
  // Logo zoom animation
  const logoScale = useSharedValue(1);
  
  useEffect(() => {
    // Only start animations if animations are enabled
    if (animationsEnabled) {
      // Start all animations with different durations and delays for fluid movement
      console.log('Starting fluid gradient animations');
      gradientAnimation1.value = withRepeat(
        withTiming(1, { duration: 4000 }),
        -1,
        true
      );
      gradientAnimation2.value = withRepeat(
        withTiming(1, { duration: 5000 }),
        -1,
        true
      );
      gradientAnimation3.value = withRepeat(
        withTiming(1, { duration: 6000 }),
        -1,
        true
      );
      gradientAnimation4.value = withRepeat(
        withTiming(1, { duration: 3500 }),
        -1,
        true
      );
    } else {
      // Stop all animations and reset to initial state
      console.log('Stopping fluid gradient animations');
      gradientAnimation1.value = 0;
      gradientAnimation2.value = 0;
      gradientAnimation3.value = 0;
      gradientAnimation4.value = 0;
    }
  }, [animationsEnabled]);

  // Animated styles for each gradient layer - only when animations enabled
  const animatedGradientStyle1 = useAnimatedStyle(() => {
    if (!animationsEnabled) {
      return {
        transform: [{ translateX: 0 }, { translateY: 0 }, { scale: 1 }],
        opacity: 0.3,
      };
    }
    const translateX = interpolate(gradientAnimation1.value, [0, 1], [-80, 80]);
    const translateY = interpolate(gradientAnimation1.value, [0, 1], [-50, 50]);
    const scale = interpolate(gradientAnimation1.value, [0, 0.5, 1], [0.7, 1.3, 0.7]);
    return {
      transform: [{ translateX }, { translateY }, { scale }],
      opacity: interpolate(gradientAnimation1.value, [0, 0.5, 1], [0.3, 0.5, 0.3]),
    };
  });

  const animatedGradientStyle2 = useAnimatedStyle(() => {
    if (!animationsEnabled) {
      return {
        transform: [{ translateX: 0 }, { translateY: 0 }, { scale: 1 }],
        opacity: 0.25,
      };
    }
    const translateX = interpolate(gradientAnimation2.value, [0, 1], [80, -80]);
    const translateY = interpolate(gradientAnimation2.value, [0, 1], [50, -50]);
    const scale = interpolate(gradientAnimation2.value, [0, 0.5, 1], [1.0, 0.8, 1.0]);
    return {
      transform: [{ translateX }, { translateY }, { scale }],
      opacity: interpolate(gradientAnimation2.value, [0, 0.5, 1], [0.25, 0.45, 0.25]),
    };
  });

  const animatedGradientStyle3 = useAnimatedStyle(() => {
    if (!animationsEnabled) {
      return {
        transform: [{ translateX: 0 }, { translateY: 0 }, { scale: 1 }],
        opacity: 0.2,
      };
    }
    const translateX = interpolate(gradientAnimation3.value, [0, 1], [-60, 60]);
    const translateY = interpolate(gradientAnimation3.value, [0, 1], [-80, 80]);
    const scale = interpolate(gradientAnimation3.value, [0, 0.5, 1], [0.8, 1.2, 0.8]);
    return {
      transform: [{ translateX }, { translateY }, { scale }],
      opacity: interpolate(gradientAnimation3.value, [0, 0.5, 1], [0.2, 0.4, 0.2]),
    };
  });

  const animatedGradientStyle4 = useAnimatedStyle(() => {
    if (!animationsEnabled) {
      return {
        transform: [{ translateX: 0 }, { translateY: 0 }, { scale: 1 }],
        opacity: 0.15,
      };
    }
    const translateX = interpolate(gradientAnimation4.value, [0, 1], [60, -60]);
    const translateY = interpolate(gradientAnimation4.value, [0, 1], [80, -80]);
    const scale = interpolate(gradientAnimation4.value, [0, 0.5, 1], [1.2, 0.7, 1.2]);
    return {
      transform: [{ translateX }, { translateY }, { scale }],
      opacity: interpolate(gradientAnimation4.value, [0, 0.5, 1], [0.15, 0.35, 0.15]),
    };
  });

  const menuItems = [
    { label: 'Explore', icon: 'compass-outline', route: './explore' as const },
    { label: 'Wallet', icon: 'wallet-outline', route: './wallet' as const },
    { label: 'Notifications', icon: 'notifications-outline', route: './notifications' as const },
    { label: 'Profile', icon: 'person-outline', route: './profile' as const },
    { label: 'Settings', icon: 'settings-outline', route: './settings' as const },
  ] as const;

  const handleNavigation = (route: typeof menuItems[number]['route']) => {
    // Close the drawer
    navigation.dispatch(DrawerActions.closeDrawer());

    // Only navigate if we're not already on this screen
    if (pathname !== route) {
      // Navigate to the route
      router.push(route);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      router.replace('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleLanguageToggle = async () => {
    const locales = ['en', 'es', 'ko'];
    const currentIndex = locales.indexOf(locale);
    const nextIndex = (currentIndex + 1) % locales.length;
    await setLocale(locales[nextIndex]);
  };

  const getLanguageFlag = (locale: string) => {
    switch (locale) {
      case 'en': return '🇺🇸';
      case 'es': return '🇪🇸';
      case 'ko': return '🇰🇷';
      default: return '🇺🇸';
    }
  };

  // Logo zoom animation style
  const logoAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: logoScale.value }],
    };
  });

  const handleLogoPress = () => {
    navigation.dispatch(DrawerActions.closeDrawer());
    router.push('/home' as any);
  };

  const handleLogoPressIn = () => {
    logoScale.value = withSpring(1.1, {
      damping: 10,
      stiffness: 300,
    });
  };

  const handleLogoPressOut = () => {
    logoScale.value = withSpring(1, {
      damping: 10,
      stiffness: 300,
    });
  };

  const handleLogoHoverIn = () => {
    if (Platform.OS === 'web') {
      logoScale.value = withSpring(1.1, {
        damping: 10,
        stiffness: 300,
      });
    }
  };

  const handleLogoHoverOut = () => {
    if (Platform.OS === 'web') {
      logoScale.value = withSpring(1, {
        damping: 10,
        stiffness: 300,
      });
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background.default, flex: 1 }]}>
      {/* Drawer Header */}
      <View style={[styles.drawerHeader, { 
        backgroundColor: isDark ? colors.primaryLight : colors.primaryDark, // Red in dark mode, blue in light mode
        borderBottomWidth: 2,
        borderBottomColor: colors.primaryContrastText + '33', // 20% opacity white
        shadowColor: isDark ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.2)',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
      }]}>
        {/* Animated Fluid Gradient Background Layers - only render when animations enabled */}
        {animationsEnabled ? (
          <>
            <Animated.View 
              style={[
                styles.fluidGradientLayer,
                {
                  backgroundColor: isDark 
                    ? 'rgba(175, 13, 1, 0.6)' // Red with high opacity
                    : 'rgba(30, 58, 138, 0.5)', // Blue with high opacity
                },
                animatedGradientStyle1
              ]}
            />
            <Animated.View 
              style={[
                styles.fluidGradientLayer,
                {
                  backgroundColor: isDark 
                    ? 'rgba(161, 209, 214, 0.5)' // Cyan with high opacity
                    : 'rgba(0, 122, 255, 0.4)', // Blue with high opacity
                },
                animatedGradientStyle2
              ]}
            />
            <Animated.View 
              style={[
                styles.fluidGradientLayer,
                {
                  backgroundColor: isDark 
                    ? 'rgba(255, 215, 0, 0.45)' // Gold with high opacity
                    : 'rgba(100, 181, 246, 0.35)', // Light blue with high opacity
                },
                animatedGradientStyle3
              ]}
            />
            <Animated.View 
              style={[
                styles.fluidGradientLayer,
                {
                  backgroundColor: isDark 
                    ? 'rgba(255, 87, 34, 0.45)' // Orange with high opacity
                    : 'rgba(63, 81, 181, 0.35)', // Indigo with high opacity
                },
                animatedGradientStyle4
              ]}
            />
          </>
        ) : null}
        <View style={[styles.brandingContainer, { zIndex: 1, position: 'relative' }]}>
          <View style={styles.logoContainer}>
            <TouchableOpacity
              onPress={handleLogoPress}
              onPressIn={handleLogoPressIn}
              onPressOut={handleLogoPressOut}
              activeOpacity={1}
              // @ts-ignore - Web-specific hover handlers
              onMouseEnter={handleLogoHoverIn}
              onMouseLeave={handleLogoHoverOut}
            >
              <Animated.View style={[
                styles.logoPill,
                {
                  backgroundColor: isDark ? colors.primaryLight : colors.primaryDark, // Solid background matching drawer header
                  borderColor: colors.primaryContrastText + '66', // White border with opacity
                  zIndex: 10, // Ensure logo card is above animated background
                },
                logoAnimatedStyle
              ]}>
                <Image 
                  source={isDark 
                    ? require('../../../assets/logos/logo-full-hashpass-white-cyan.svg')
                    : require('../../../assets/logos/logo-full-hashpass-white.svg')
                  } 
                  style={styles.logoImage}
                  resizeMode="contain"
                />
              </Animated.View>
            </TouchableOpacity>
          </View>
          <View style={styles.brandingSection}>
            <Text style={styles.brandSubtitle}>Digital Event Platform</Text>
            <View style={[styles.brandBadge, { backgroundColor: '#007AFF' }]}>
              <Text style={styles.brandBadgeText}>BSL2025</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Menu Items */}
      <View style={[styles.menuItems, { 
        backgroundColor: 'transparent',
        flex: 1,
        paddingTop: 24,
        paddingBottom: 16,
      }]}>
        {menuItems.map((item) => {
          const isActive = pathname === item.route;
          return (
            <TouchableOpacity
              key={item.route as string}
              style={[
                styles.menuItem,
                {
                  backgroundColor: isActive 
                    ? (isDark 
                        ? `rgba(175, 13, 1, 0.15)` // Red with transparency
                        : `rgba(175, 13, 1, 0.1)`) // Red with transparency
                    : (isDark 
                        ? 'rgba(255, 255, 255, 0.05)' 
                        : 'rgba(0, 0, 0, 0.03)'), // Subtle background
                  borderLeftWidth: isActive ? 4 : 0,
                  borderLeftColor: isActive ? colors.primaryLight : 'transparent',
                }
              ]}
              onPress={() => handleNavigation(item.route)}
              activeOpacity={0.6}
            >
              <View style={[
                styles.menuIconContainer,
                {
                  backgroundColor: isActive 
                    ? (isDark 
                        ? `rgba(175, 13, 1, 0.2)` 
                        : `rgba(175, 13, 1, 0.15)`)
                    : (isDark 
                        ? 'rgba(255, 255, 255, 0.08)' 
                        : 'rgba(0, 0, 0, 0.05)'),
                }
              ]}>
                <Ionicons
                  name={item.icon as any}
                  size={22}
                  color={isActive ? colors.primaryLight : colors.text.secondary}
                />
              </View>
              <Text
                style={[
                  styles.menuText,
                  {
                    color: isActive ? colors.text.primary : colors.text.secondary,
                    fontWeight: isActive ? '700' : '500',
                    fontSize: 15,
                  }
                ]}
              >
                {item.label}
              </Text>
              {isActive && (
                <View style={styles.activeIndicator} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Quick Settings & Actions */}
      <View style={styles.quickSettingsSection}>
        <View style={styles.quickTogglesRow}>
          {/* Theme Toggle */}
          <TouchableOpacity
            style={[
              styles.quickToggleButton,
              {
                backgroundColor: isDark 
                  ? 'rgba(255, 215, 0, 0.15)' 
                  : 'rgba(108, 99, 255, 0.1)',
                borderColor: isDark 
                  ? 'rgba(255, 215, 0, 0.3)' 
                  : 'rgba(108, 99, 255, 0.2)',
              }
            ]}
            onPress={toggleTheme}
            activeOpacity={0.6}
          >
            <Ionicons 
              name={isDark ? 'sunny' : 'moon'} 
              size={22} 
              color={isDark ? '#FFD700' : '#6C63FF'} 
            />
          </TouchableOpacity>

          {/* Language Toggle */}
          <TouchableOpacity
            style={[
              styles.quickToggleButton,
              {
                backgroundColor: isDark 
                  ? 'rgba(255, 255, 255, 0.08)' 
                  : 'rgba(0, 0, 0, 0.05)',
                borderColor: isDark 
                  ? 'rgba(255, 255, 255, 0.15)' 
                  : 'rgba(0, 0, 0, 0.1)',
              }
            ]}
            onPress={handleLanguageToggle}
            activeOpacity={0.6}
          >
            <Text style={styles.languageFlag}>{getLanguageFlag(locale)}</Text>
          </TouchableOpacity>

          {/* Logout Button */}
          <TouchableOpacity
            style={[
              styles.quickToggleButton,
              {
                backgroundColor: isDark 
                  ? 'rgba(255, 59, 48, 0.15)' 
                  : 'rgba(255, 59, 48, 0.1)',
                borderColor: isDark 
                  ? 'rgba(255, 59, 48, 0.3)' 
                  : 'rgba(255, 59, 48, 0.2)',
              }
            ]}
            onPress={handleLogout}
            activeOpacity={0.6}
          >
            <Ionicons 
              name="log-out-outline" 
              size={22} 
              color={colors.error.main} 
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Version Display */}
      <VersionDisplay showInSidebar={true} />
    </View>
  );
}

// Main Dashboard Layout
export default function DashboardLayout() {
  const { colors, isDark } = useTheme();
  const isMobile = useIsMobile();
  const styles = getStyles(isDark, colors, isMobile);

  // Header component for the drawer screens
  const Header = () => {
    const drawerNavigation = useNavigation<DrawerNavigation>();
    const { headerOpacity, headerBackground, headerTint, headerBlur, headerBorderWidth, headerShadowOpacity, headerHeight, setHeaderHeight, scrollY } = useScroll();
    const { animationsEnabled } = useAnimations();
    const { user } = useAuth();
    const [qrScannerVisible, setQrScannerVisible] = React.useState(false);
    const [adminScannerVisible, setAdminScannerVisible] = React.useState(false);
    const [isUserAdmin, setIsUserAdmin] = React.useState(false);

    // Check admin status on mount
    React.useEffect(() => {
      if (user?.id) {
        isAdmin(user.id).then(setIsUserAdmin);
      }
    }, [user]);

    // Adjust header background color based on theme to match app background
    const HEADER_SCROLL_DISTANCE = 100;
    // Extract RGB values from theme background color
    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : { r: 18, g: 18, b: 18 }; // Fallback to dark color
    };
    const bgRgb = hexToRgb(colors.background.default);
    
    // Banner colors - typically blue (#007AFF) or event-specific colors
    // When banner is visible, blend with banner color
    const bannerColor = '#007AFF'; // Default banner color
    const bannerRgb = hexToRgb(bannerColor);
    
    // Interpolate RGB values based on scroll to blend theme color with banner color
    // Only interpolate when animations are enabled
    const blendedR = animationsEnabled ? scrollY.interpolate({
      inputRange: [0, HEADER_SCROLL_DISTANCE * 0.5, HEADER_SCROLL_DISTANCE],
      outputRange: [bgRgb.r, Math.round((bgRgb.r + bannerRgb.r) / 2), bannerRgb.r],
      extrapolate: 'clamp',
    }) : bgRgb.r;
    
    const blendedG = animationsEnabled ? scrollY.interpolate({
      inputRange: [0, HEADER_SCROLL_DISTANCE * 0.5, HEADER_SCROLL_DISTANCE],
      outputRange: [bgRgb.g, Math.round((bgRgb.g + bannerRgb.g) / 2), bannerRgb.g],
      extrapolate: 'clamp',
    }) : bgRgb.g;
    
    const blendedB = animationsEnabled ? scrollY.interpolate({
      inputRange: [0, HEADER_SCROLL_DISTANCE * 0.5, HEADER_SCROLL_DISTANCE],
      outputRange: [bgRgb.b, Math.round((bgRgb.b + bannerRgb.b) / 2), bannerRgb.b],
      extrapolate: 'clamp',
    }) : bgRgb.b;
    
    // Build rgba string dynamically with smooth gradient transitions
    // More interpolation points for smoother color transitions
    // At the beginning (scrollY = 0), use full app background color (no transparency)
    // If animations disabled, use solid color like sidebar
    const adjustedHeaderBackground = animationsEnabled
      ? scrollY.interpolate({
          inputRange: [
            0, 
            HEADER_SCROLL_DISTANCE * 0.15, 
            HEADER_SCROLL_DISTANCE * 0.3, 
            HEADER_SCROLL_DISTANCE * 0.5, 
            HEADER_SCROLL_DISTANCE * 0.7, 
            HEADER_SCROLL_DISTANCE * 0.85,
            HEADER_SCROLL_DISTANCE
          ],
          outputRange: [
            `rgba(${bgRgb.r}, ${bgRgb.g}, ${bgRgb.b}, 1)`,   // Start with full app background color (100% opaque, 100% theme)
            `rgba(${Math.round(bgRgb.r * 0.9 + bannerRgb.r * 0.1)}, ${Math.round(bgRgb.g * 0.9 + bannerRgb.g * 0.1)}, ${Math.round(bgRgb.b * 0.9 + bannerRgb.b * 0.1)}, 0.9)`,   // 90% theme, 10% banner, slightly transparent
            `rgba(${Math.round(bgRgb.r * 0.7 + bannerRgb.r * 0.3)}, ${Math.round(bgRgb.g * 0.7 + bannerRgb.g * 0.3)}, ${Math.round(bgRgb.b * 0.7 + bannerRgb.b * 0.3)}, 0.7)`,   // 70% theme, 30% banner
            `rgba(${Math.round(bgRgb.r * 0.5 + bannerRgb.r * 0.5)}, ${Math.round(bgRgb.g * 0.5 + bannerRgb.g * 0.5)}, ${Math.round(bgRgb.b * 0.5 + bannerRgb.b * 0.5)}, 0.5)`,   // 50% theme, 50% banner
            `rgba(${Math.round(bgRgb.r * 0.3 + bannerRgb.r * 0.7)}, ${Math.round(bgRgb.g * 0.3 + bannerRgb.g * 0.7)}, ${Math.round(bgRgb.b * 0.3 + bannerRgb.b * 0.7)}, 0.3)`,   // 30% theme, 70% banner
            `rgba(${Math.round(bgRgb.r * 0.15 + bannerRgb.r * 0.85)}, ${Math.round(bgRgb.g * 0.15 + bannerRgb.g * 0.85)}, ${Math.round(bgRgb.b * 0.15 + bannerRgb.b * 0.85)}, 0.2)`,   // 15% theme, 85% banner
            `rgba(${bannerRgb.r}, ${bannerRgb.g}, ${bannerRgb.b}, 0.15)`   // 100% banner color when scrolled
          ],
          extrapolate: 'clamp',
        })
      : colors.background.default; // Solid color when animations disabled

    // Gloss effect animation based on scroll - disabled when animations off
    const glossOpacity = animationsEnabled
      ? scrollY.interpolate({
          inputRange: [0, HEADER_SCROLL_DISTANCE * 0.5, HEADER_SCROLL_DISTANCE],
          outputRange: [0, 0.4, 0.6], // More visible when scrolled
          extrapolate: 'clamp',
        })
      : 0; // No gloss when animations disabled

    const glossPosition = animationsEnabled
      ? scrollY.interpolate({
          inputRange: [0, HEADER_SCROLL_DISTANCE],
          outputRange: [-200, 200], // Moves from left to right as you scroll
          extrapolate: 'clamp',
        })
      : 0; // No movement when animations disabled

    // Blur intensity based on scroll - use headerBlur from context
    const blurIntensityValue = headerBlur;

    // Use regular View for styles that come from old Animated API
    // Animated.View from reanimated doesn't support old Animated.Interpolation directly
    return (
      <View
        style={[
          styles.header,
          {
            backgroundColor: 'transparent',
            borderBottomWidth: headerBorderWidth as any,
            borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)',
            shadowColor: isDark ? 'rgba(0, 0, 0, 0.4)' : 'rgba(0, 0, 0, 0.2)',
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: headerShadowOpacity as any,
            shadowRadius: 6,
            elevation: 8,
            overflow: 'hidden',
          }
        ]}
        onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}
      >
        {/* Background with blur and gloss effect */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {/* Blur effect - only when animations enabled */}
          {animationsEnabled ? (
            Platform.OS === 'web' ? (
              <RNAnimated.View
                style={[
                  StyleSheet.absoluteFill,
                  {
                    backgroundColor: adjustedHeaderBackground as any,
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                  }
                ]}
              />
            ) : (
              <>
                <BlurView
                  intensity={20}
                  tint={isDark ? 'dark' : 'light'}
                  style={StyleSheet.absoluteFill}
                />
                <RNAnimated.View
                  style={[
                    StyleSheet.absoluteFill,
                    {
                      backgroundColor: adjustedHeaderBackground as any,
                    }
                  ]}
                />
              </>
            )
          ) : (
            <View
              style={[
                StyleSheet.absoluteFill,
                {
                  backgroundColor: adjustedHeaderBackground as string,
                }
              ]}
            />
          )}
          
          {/* Gloss effect overlay - only when animations enabled */}
          {animationsEnabled && (
            <RNAnimated.View
              style={[
                StyleSheet.absoluteFill,
                {
                  opacity: glossOpacity as any,
                  transform: [{ translateX: glossPosition as any }],
                }
              ]}
              pointerEvents="none"
            >
              <View
                style={{
                  width: '200%',
                  height: '100%',
                  backgroundColor: 'transparent',
                  flexDirection: 'row',
                }}
              >
                {/* Left transparent */}
                <View style={{ flex: 1, backgroundColor: 'transparent' }} />
                {/* Center gloss highlight */}
                <View
                  style={{
                    width: '50%',
                    height: '100%',
                    backgroundColor: 'rgba(255, 255, 255, 0.4)',
                  }}
                />
                {/* Right transparent */}
                <View style={{ flex: 1, backgroundColor: 'transparent' }} />
              </View>
            </RNAnimated.View>
          )}
        </View>
        <Animated.View
          style={[
            styles.headerContent,
            animationsEnabled ? {
              opacity: headerOpacity.interpolate({
                inputRange: [0, 1],
                outputRange: [0.8, 1] // Slight fade in effect
              }),
            } : {
              opacity: 1, // No animation when disabled
            },
            {
              pointerEvents: 'auto', // Make buttons clickable
            }
          ]}
        >
          <TouchableOpacity
            onPress={() => drawerNavigation.dispatch(DrawerActions.toggleDrawer())}
            style={styles.headerIconButton}
            activeOpacity={0.8}
          >
            <Ionicons 
              name="menu" 
              size={26} 
              color={isDark ? '#FFFFFF' : '#000000'}
            />
          </TouchableOpacity>

          <View style={styles.headerLogoContainer} pointerEvents="none">
            <Image 
              source={isDark 
                ? require('../../../assets/logos/logo-full-hashpass-white-cyan.svg')
                : require('../../../assets/logos/logo-full-hashpass-white.svg')
              } 
              style={styles.headerLogoImage}
              resizeMode="contain"
            />
          </View>

          <View style={{ flexDirection: 'row', gap: 8 }}>
            {isUserAdmin && (
              <TouchableOpacity
                onPress={() => setAdminScannerVisible(true)}
                style={styles.headerIconButton}
                activeOpacity={0.8}
              >
                <Ionicons 
                  name="shield-checkmark-outline" 
                  size={26} 
                  color={isDark ? '#FF9500' : '#FF9500'}
                />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() => setQrScannerVisible(true)}
              style={styles.headerIconButton}
              activeOpacity={0.8}
            >
              <Ionicons 
                name="qr-code-outline" 
                size={26} 
                color={isDark ? '#FFFFFF' : '#000000'}
              />
            </TouchableOpacity>
          </View>
        </Animated.View>
        
        {/* Regular QR Scanner Modal */}
        <QRScanner
          visible={qrScannerVisible}
          onClose={() => setQrScannerVisible(false)}
          onScanSuccess={(result) => {
            console.log('QR Scan Success:', result);
            setQrScannerVisible(false);
            // You can add navigation or other actions here based on scan result
          }}
          onScanError={(error) => {
            console.error('QR Scan Error:', error);
            // Error is already shown in the scanner component
          }}
        />
        
        {/* Admin QR Scanner Modal */}
        {isUserAdmin && (
          <AdminQRScanner
            visible={adminScannerVisible}
            onClose={() => setAdminScannerVisible(false)}
            onScanSuccess={(result) => {
              console.log('Admin QR Scan Success:', result);
              // Admin scanner handles its own UI
            }}
          />
        )}
      </View>
    );
  };

  // Screen component with header
  const ScreenWithHeader = () => {
    const { headerHeight } = useScroll();
    
    // Header should overlay content without taking space
    // Only reserve space for StatusBar
    const statusBarHeight = StatusBar.currentHeight || 0;
    
    return (
      <View style={[styles.headerContainer, { 
        height: statusBarHeight, 
        backgroundColor: 'transparent',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
      }]}>
        <StatusBar 
          barStyle={colors.background.default === '#FFFFFF' ? 'dark-content' : 'light-content'}
          backgroundColor="transparent"
          translucent={true}
        />
        <Header />
      </View>
    );
  };


  return (
    <AnimationProvider>
      <NotificationProvider>
        <ScrollProvider>
          <View style={{ flex: 1 }}>
          <Drawer
            drawerContent={CustomDrawerContent}
            screenOptions={{
              header: () => <ScreenWithHeader />,
              drawerType: 'front',
              drawerStyle: {
                width: '80%',
              },
              overlayColor: 'rgba(0,0,0,0.5)',
              drawerPosition: 'left',
            }}
          >
            <Drawer.Screen
              name="explore"
              options={{
                headerShown: true,
                header: () => <ScreenWithHeader />,
              }}
            />
            <Drawer.Screen
              name="notifications"
              options={{
                headerShown: true,
                header: () => <ScreenWithHeader />,
              }}
            />
            <Drawer.Screen
              name="wallet"
              options={{
                headerShown: true,
                header: () => <ScreenWithHeader />,
              }}
            />
            <Drawer.Screen
              name="profile"
              options={{
                headerShown: true,
                header: () => <ScreenWithHeader />,
              }}
            />
            <Drawer.Screen
              name="settings"
              options={{
                headerShown: true,
                header: () => <ScreenWithHeader />,
              }}
            />
          </Drawer>
          </View>
        </ScrollProvider>
      </NotificationProvider>
    </AnimationProvider>
  );
}

const getStyles = (isDark: boolean, colors: any, isMobile: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.default,
  },
  headerContainer: {
    backgroundColor: 'transparent',
    zIndex: 1000,
    pointerEvents: 'box-none', // Allow scroll to pass through
  },
  header: {
    position: 'absolute',
    top: StatusBar.currentHeight || 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: 'transparent',
    borderBottomWidth: 1,
    borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    pointerEvents: 'box-none', // Allow touch events to pass through to content, but keep buttons clickable
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
  },
  headerButton: {
    padding: 12,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
    shadowColor: isDark ? 'rgba(0, 0, 0, 0.4)' : 'rgba(0, 0, 0, 0.15)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 10,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.08)',
  },
  headerIconButton: {
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  headerLogoContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: -1, // Place behind buttons
  },
  headerLogoImage: {
    width: 120,
    height: 40,
  },
  drawerHeader: {
    padding: 20,
    borderBottomWidth: 2,
    borderBottomColor: colors.primaryContrastText + '33', // White border with opacity from theme
    backgroundColor: isDark ? colors.primaryLight : colors.primaryDark, // Red in dark mode, blue in light mode
    position: 'relative',
    overflow: 'hidden',
    shadowColor: isDark ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.2)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  gradientBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 0,
  },
  fluidGradientLayer: {
    position: 'absolute',
    width: 400,
    height: 400,
    borderRadius: 200, // Circular shape
    top: '50%',
    left: '50%',
    marginTop: -200,
    marginLeft: -200,
    zIndex: 0,
  },
  brandingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoPill: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 30,
    borderWidth: 2,
    shadowColor: 'rgba(0, 0, 0, 0.3)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  logoImage: {
    width: 80,
    height: 80,
  },
  brandingSection: {
    flex: 1,
    alignItems: 'flex-start',
  },
  brandSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF', // Pure white for better contrast
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  brandBadge: {
    backgroundColor: isDark ? colors.primary : colors.secondary,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.primaryContrastText + '4D', // 30% opacity white
    shadowColor: isDark ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.2)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
  },
  brandBadgeText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primaryContrastText,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  drawerHeaderText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primaryContrastText,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  menuItems: {
    flex: 1,
    paddingTop: 24,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginVertical: 4,
    borderRadius: 14,
    borderLeftWidth: 4,
    borderLeftColor: 'transparent',
    backgroundColor: 'transparent',
    position: 'relative',
    overflow: 'hidden',
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  activeIndicator: {
    position: 'absolute',
    right: 12,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primaryLight,
  },
  menuText: {
    fontSize: 15,
    color: colors.text.primary,
    flex: 1,
    letterSpacing: 0.2,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    margin: 12,
    gap: 16,
    backgroundColor: isDark ? 'rgba(255, 59, 48, 0.1)' : 'rgba(255, 59, 48, 0.05)',
    borderLeftWidth: 4,
    borderLeftColor: '#FF3B30',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255, 59, 48, 0.2)' : 'rgba(255, 59, 48, 0.1)',
    shadowColor: isDark ? 'rgba(255, 59, 48, 0.2)' : 'rgba(255, 59, 48, 0.1)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.error.main,
    flex: 1,
  },
  quickSettingsSection: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 16,
    backgroundColor: isDark 
      ? 'rgba(255, 255, 255, 0.05)' 
      : 'rgba(0, 0, 0, 0.02)',
  },
  quickSettingsTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  quickTogglesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  quickToggleButton: {
    flex: 1,
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: isDark ? 'rgba(0, 0, 0, 0.2)' : 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  languageFlag: {
    fontSize: 18,
  },
  mainContent: {
    flex: 1,
    paddingTop: 80, // Space for the header
    backgroundColor: colors.background.default,
  },
  logo: {
    width: isMobile ? 90 : 120,
    height: isMobile ? 90 : 120,
  }
}); 
