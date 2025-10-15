import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, Image, Animated } from 'react-native';
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

  const menuItems = [
    { label: 'Explore', icon: 'compass-outline', route: '/(shared)/dashboard/explore' as const },
    { label: 'Wallet', icon: 'wallet-outline', route: '/(shared)/dashboard/wallet' as const },
    { label: 'Profile', icon: 'person-outline', route: '/(shared)/dashboard/profile' as const },
    { label: 'Settings', icon: 'settings-outline', route: '/(shared)/dashboard/settings' as const },
  ] as const;

  const handleNavigation = (route: typeof menuItems[number]['route']) => {
    // Close the drawer
    navigation.dispatch(DrawerActions.closeDrawer());

    // Only navigate if we're not already on this screen
    if (pathname !== route) {
      // Use replace to avoid adding to navigation stack
      router.replace(route as any);
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
        <Ionicons 
          name="key" 
          size={32} 
          color={colors.primaryContrastText} 
        />
        <Text style={[styles.drawerHeaderText, { 
          color: colors.primaryContrastText,
          textShadowColor: 'rgba(0, 0, 0, 0.2)',
          textShadowOffset: { width: 0, height: 1 },
          textShadowRadius: 2
        }]}>
          HASH PASS
        </Text>
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

      {/* Quick Settings */}
      <View style={[styles.quickSettingsSection, { 
        backgroundColor: colors.background.paper,
        borderTopWidth: 1,
        borderTopColor: colors.divider,
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
      }]}>
        <Text style={[styles.quickSettingsTitle, { color: colors.text.secondary }]}>
          Quick Settings
        </Text>
        
        <View style={styles.quickTogglesRow}>
          {/* Theme Toggle */}
          <TouchableOpacity
            style={[styles.quickToggleButton, {
              backgroundColor: colors.background.default,
              shadowColor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
            }]}
            onPress={toggleTheme}
            activeOpacity={0.8}
          >
            <Ionicons 
              name={isDark ? 'sunny' : 'moon'} 
              size={20} 
              color={isDark ? '#FFD700' : '#6C63FF'} 
            />
          </TouchableOpacity>

          {/* Language Toggle */}
          <TouchableOpacity
            style={[styles.quickToggleButton, {
              backgroundColor: colors.background.default,
              shadowColor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
            }]}
            onPress={handleLanguageToggle}
            activeOpacity={0.8}
          >
            <Text style={styles.languageFlag}>{getLanguageFlag(locale)}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Logout Button */}
      <View style={{ 
        borderTopWidth: 1, 
        borderTopColor: colors.divider,
        backgroundColor: colors.background.paper,
        padding: 4
      }}>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <Ionicons 
            name="log-out-outline" 
            size={24} 
            color={colors.error.main} 
          />
          <Text style={[styles.logoutText, { color: colors.error.main }]}>
            Logout
          </Text>
        </TouchableOpacity>
      </View>
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

          <View style={styles.logoContainer}>
            <Text style={[styles.logoText, { 
              color: isDark ? '#FFFFFF' : '#000000',
              textShadowColor: isDark ? 'rgba(0, 0, 0, 0.8)' : 'rgba(255, 255, 255, 0.9)',
              textShadowOffset: { width: 0, height: 2 },
              textShadowRadius: 4,
              fontWeight: '800',
            }]}>
              H<Text style={{ 
                color: isDark ? '#60A5FA' : '#1E40AF',
                textShadowColor: isDark ? 'rgba(0, 0, 0, 0.8)' : 'rgba(255, 255, 255, 0.9)',
                textShadowOffset: { width: 0, height: 2 },
                textShadowRadius: 4,
              }}>Λ</Text>SHP<View style={{ transform: [{ rotate: '90deg' }] }}><Text style={{ 
                color: isDark ? '#60A5FA' : '#1E40AF',
                textShadowColor: isDark ? 'rgba(0, 0, 0, 0.8)' : 'rgba(255, 255, 255, 0.9)',
                textShadowOffset: { width: 0, height: 2 },
                textShadowRadius: 4,
              }}>Λ</Text></View>SS
            </Text>
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
            name="(tabs)"
            options={{
              headerShown: false,
            }}
          />
        </Drawer>
      </View>
    </ScrollProvider>
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
    backgroundColor: colors.background.default,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  headerButton: {
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 48, // Balance the header button on the left
  },
  logoText: {
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 1,
    color: colors.text.primary,
  },
  drawerHeader: {
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
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
    paddingTop: 16,
    paddingHorizontal: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginVertical: 6,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: 'transparent',
    shadowColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  menuIcon: {
    width: 32,
    textAlign: 'center',
    marginRight: 16,
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
    borderRadius: 12,
    margin: 12,
    gap: 16,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
    borderLeftWidth: 4,
    borderLeftColor: 'transparent',
    shadowColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.error.main,
    flex: 1,
  },
  quickSettingsSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginHorizontal: 12,
    marginVertical: 12,
    borderRadius: 12,
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
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  quickToggleButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
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
