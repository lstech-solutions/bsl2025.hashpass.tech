import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, Image, Animated } from 'react-native';
import AnimatedGradient, { useAnimatedStyle, useSharedValue, withRepeat, withTiming, interpolate } from 'react-native-reanimated';
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
import VersionDisplay from '../../../components/VersionDisplay';

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
  const router = useRouter();
  const pathname = usePathname();
  const navigation = useNavigation<DrawerNavigation>();
  const isMobile = useIsMobile();
  const styles = getStyles(isDark, colors, isMobile);

  // Animated gradient effect
  const gradientAnimation = useSharedValue(0);
  
  useEffect(() => {
    gradientAnimation.value = withRepeat(
      withTiming(1, { duration: 3000 }),
      -1,
      true
    );
  }, []);

  const animatedGradientStyle = useAnimatedStyle(() => {
    const opacity = interpolate(gradientAnimation.value, [0, 0.5, 1], [0.1, 0.2, 0.1]);
    return {
      opacity,
    };
  });

  const menuItems = [
    { label: 'Explore', icon: 'compass-outline', route: './explore' as const },
    { label: 'Notifications', icon: 'notifications-outline', route: './notifications' as const },
    { label: 'Wallet', icon: 'wallet-outline', route: './wallet' as const },
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

  return (
    <View style={[styles.container, { backgroundColor: colors.background.default, flex: 1 }]}>
      {/* Drawer Header */}
      <View style={[styles.drawerHeader, { 
        backgroundColor: colors.primary,
        borderBottomWidth: 1,
        borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
      }]}>
        {/* Animated Gradient Background */}
        <AnimatedGradient.View 
          style={[
            styles.gradientBackground,
            {
              backgroundColor: isDark ? 'rgba(96, 165, 250, 0.1)' : 'rgba(30, 64, 175, 0.1)',
            },
            animatedGradientStyle
          ]}
        />
        <View style={styles.brandingContainer}>
          <View style={styles.logoContainer}>
            <View style={[styles.logoPill, {
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.05)',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.1)',
            }]}>
              <Image 
                source={isDark 
                  ? require('../../../assets/logos/logo-full-hashpass-white.svg')
                  : require('../../../assets/logos/logo-full-hashpass-black-cyan.svg')
                } 
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
          </View>
          <View style={styles.brandingSection}>
            <Text style={styles.brandSubtitle}>Digital Event Platform</Text>
            <View style={styles.brandBadge}>
              <Text style={styles.brandBadgeText}>BSL2025</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Menu Items */}
      <View style={[styles.menuItems, { 
        backgroundColor: colors.background.paper,
        borderRightWidth: 1,
        borderRightColor: colors.divider,
        flex: 1
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
                    ? `${colors.primary}20` // 20% opacity
                    : 'transparent',
                  borderLeftWidth: isActive ? 4 : 0,
                  borderLeftColor: colors.primary,
                }
              ]}
              onPress={() => handleNavigation(item.route)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={item.icon as any}
                size={28}
                color={isActive ? colors.primary : colors.text.primary}
                style={styles.menuIcon}
              />
              <Text
                style={[
                  styles.menuText,
                  {
                    color: isActive ? colors.primary : colors.text.primary,
                    fontWeight: isActive ? '700' : '500',
                    fontSize: 16,
                  }
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Quick Settings & Actions */}
      <View style={[styles.quickSettingsSection, { 
        backgroundColor: colors.background.paper,
      }]}>
        <View style={styles.quickTogglesRow}>
          {/* Theme Toggle */}
          <TouchableOpacity
            style={styles.quickToggleButton}
            onPress={toggleTheme}
            activeOpacity={0.7}
          >
            <Ionicons 
              name={isDark ? 'sunny' : 'moon'} 
              size={20} 
              color={isDark ? '#FFD700' : '#6C63FF'} 
            />
          </TouchableOpacity>

          {/* Language Toggle */}
          <TouchableOpacity
            style={styles.quickToggleButton}
            onPress={handleLanguageToggle}
            activeOpacity={0.7}
          >
            <Text style={styles.languageFlag}>{getLanguageFlag(locale)}</Text>
          </TouchableOpacity>

          {/* Logout Button */}
          <TouchableOpacity
            style={styles.quickToggleButton}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <Ionicons 
              name="log-out-outline" 
              size={20} 
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
    const { headerOpacity, headerBackground, headerTint, headerBorderWidth, headerShadowOpacity, headerHeight, setHeaderHeight } = useScroll();

    return (
      <Animated.View
        style={[
          styles.header,
          {
            backgroundColor: 'transparent',
            borderBottomWidth: headerBorderWidth,
            borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)',
            shadowColor: isDark ? 'rgba(0, 0, 0, 0.4)' : 'rgba(0, 0, 0, 0.2)',
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: headerShadowOpacity,
            shadowRadius: 6,
            elevation: 8,
            overflow: 'hidden',
          }
        ]}
        onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}
      >
        {/* Background with blur and tint effect */}
        <Animated.View 
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: headerBackground,
              backdropFilter: 'blur(25px)',
              WebkitBackdropFilter: 'blur(25px)',
            }
          ]} 
        />
        {/* Gradient overlay for depth */}
        <Animated.View 
          style={[
            StyleSheet.absoluteFill,
            { 
              backgroundColor: isDark 
                ? 'rgba(0, 0, 0, 0.1)' 
                : 'rgba(255, 255, 255, 0.1)',
            }
          ]} 
        />
        {/* Blue tint overlay */}
        <Animated.View 
          style={[
            StyleSheet.absoluteFill,
            { 
              backgroundColor: headerTint,
              opacity: 1,
            }
          ]} 
        />
        <Animated.View
          style={[
            styles.headerContent,
            {
              opacity: headerOpacity.interpolate({
                inputRange: [0, 1],
                outputRange: [0.8, 1] // Slight fade in effect
              })
            }
          ]}
        >
          <TouchableOpacity
            onPress={() => drawerNavigation.dispatch(DrawerActions.toggleDrawer())}
            style={styles.headerButton}
            activeOpacity={0.8}
          >
            <Ionicons 
              name="menu" 
              size={26} 
              color={isDark ? '#FFFFFF' : '#000000'}
              style={{
                textShadowColor: isDark ? 'rgba(0, 0, 0, 0.6)' : 'rgba(255, 255, 255, 0.6)',
                textShadowOffset: { width: 0, height: 2 },
                textShadowRadius: 3,
              }}
            />
          </TouchableOpacity>

          <View style={styles.headerLogoContainer}>
            <Image 
              source={isDark 
                ? require('../../../assets/logos/logo-full-hashpass-white.svg')
                : require('../../../assets/logos/logo-full-hashpass-black-cyan.svg')
              } 
              style={styles.headerLogoImage}
              resizeMode="contain"
            />
          </View>

          <TouchableOpacity
            onPress={() => console.log('Scan QR')}
            style={[styles.headerButton, {
              backgroundColor: isDark 
                ? 'rgba(255, 255, 255, 0.12)' 
                : 'rgba(0, 0, 0, 0.08)',
              borderRadius: 16,
              padding: 12,
              shadowColor: isDark ? 'rgba(0, 0, 0, 0.4)' : 'rgba(0, 0, 0, 0.15)',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.4,
              shadowRadius: 8,
              elevation: 10,
              borderWidth: 1,
              borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.08)',
            }]}
            activeOpacity={0.8}
          >
            <Ionicons 
              name="qr-code-outline" 
              size={26} 
              color={isDark ? '#FFFFFF' : '#000000'}
              style={{
                textShadowColor: isDark ? 'rgba(0, 0, 0, 0.6)' : 'rgba(255, 255, 255, 0.6)',
                textShadowOffset: { width: 0, height: 2 },
                textShadowRadius: 3,
              }}
            />
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    );
  };

  // Screen component with header
  const ScreenWithHeader = () => {
    const { headerHeight } = useScroll();
    
    return (
      <View style={[styles.headerContainer, { height: headerHeight }]}>
        <StatusBar barStyle={colors.background.default === '#FFFFFF' ? 'dark-content' : 'light-content'} />
        <Header />
      </View>
    );
  };


  return (
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
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    paddingTop: StatusBar.currentHeight,
    backgroundColor: 'transparent',
    borderBottomWidth: 1,
    borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
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
  headerLogoContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 48, // Balance the header button on the left
  },
  headerLogoImage: {
    width: 120,
    height: 40,
  },
  drawerHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
    position: 'relative',
    overflow: 'hidden',
  },
  gradientBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 0,
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
    borderWidth: 1,
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    color: 'rgba(255, 255, 255, 0.95)',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  brandBadge: {
    backgroundColor: '#60A5FA',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: 'rgba(0, 0, 0, 0.3)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
  },
  brandBadgeText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
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
    paddingTop: 8,
    paddingHorizontal: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginVertical: 4,
    marginHorizontal: 8,
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: 'transparent',
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
    shadowColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
    textAlign: 'center',
    marginRight: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
  },
  menuText: {
    fontSize: 16,
    color: colors.text.primary,
    flex: 1,
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
    paddingVertical: 24,
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 24,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.03)',
    shadowColor: isDark ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
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
    justifyContent: 'space-evenly',
    alignItems: 'center',
    gap: 12,
  },
  quickToggleButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
    shadowColor: isDark ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.15)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
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
