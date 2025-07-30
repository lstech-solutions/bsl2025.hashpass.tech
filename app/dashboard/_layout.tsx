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
import { useTheme } from '../../hooks/useTheme';
import { useIsMobile } from '../../hooks/useIsMobile';
import { color } from 'motion/react';
import { ScrollProvider, useScroll } from '../../contexts/ScrollContext';

// Define the type for our drawer navigation
type DrawerNavigation = CompositeNavigationProp<
  DrawerNavigationProp<RootStackParamList>,
  NativeStackNavigationProp<RootStackParamList>
>;


// Custom drawer content component
function CustomDrawerContent() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const navigation = useNavigation<DrawerNavigation>();
  const isMobile = useIsMobile();
  const styles = getStyles(isDark, colors, isMobile);

  const menuItems = [
    { label: 'Explore', icon: 'compass-outline', route: '/dashboard/explore' as const },
    { label: 'Wallet', icon: 'wallet-outline', route: '/dashboard/wallet' as const },
    { label: 'Profile', icon: 'person-outline', route: '/dashboard/profile' as const },
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

  const handleLogout = () => {
    // Handle logout logic here
    console.log('Logout');
    router.replace('/');
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
                size={24}
                color={isActive ? colors.primary : colors.text.primary}
                style={styles.menuIcon}
              />
              <Text
                style={[
                  styles.menuText,
                  {
                    color: isActive ? colors.primary : colors.text.primary,
                    fontWeight: isActive ? '600' : '400',
                  }
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
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
    const { headerOpacity, headerBackground, headerTint, headerBorderWidth, headerHeight, setHeaderHeight } = useScroll();

    return (
      <Animated.View
        style={[
          styles.header,
          {
            backgroundColor: 'transparent',
            borderBottomWidth: headerBorderWidth,
            borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
            shadowColor: isDark ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.1)',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 1,
            shadowRadius: 4,
            elevation: 4,
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
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
            }
          ]} 
        />
        {/* Blue tint overlay */}
        <Animated.View 
          style={[
            StyleSheet.absoluteFill,
            { 
              backgroundColor: headerTint,
              opacity: 0.7,
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
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
              borderRadius: 8,
              padding: 6
            }]}
            activeOpacity={0.7}
          >
            <Ionicons 
              name="menu" 
              size={24} 
              color={colors.text.primary}
            />
          </TouchableOpacity>

          <View style={styles.logoContainer}>
            <Text style={[styles.logoText, { 
              color: colors.text.primary,
              textShadowColor: isDark ? 'rgba(0, 0, 0, 0.3)' : 'rgba(255, 255, 255, 0.5)',
              textShadowRadius: 2,
            }]}>
              H<Text style={{ color: isDark ? colors.primaryLight : colors.primaryDark }}>Λ</Text>SHP<View style={{ transform: [{ rotate: '90deg' }] }}><Text style={{ color: isDark ? colors.primaryLight : colors.primaryDark }}>Λ</Text></View>SS
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => console.log('Scan QR')}
            style={styles.headerButton}
          >
            <Ionicons 
              name="qr-code-outline" 
              size={24} 
              color={isDark ? 'rgba(255, 255, 255, 0.95)' : 'rgba(0, 0, 0, 0.95)'} 
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
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
    paddingTop: 10,
    paddingHorizontal: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginVertical: 4,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: 'transparent',
  },
  menuIcon: {
    width: 24,
    textAlign: 'center',
    marginRight: 12,
  },
  menuText: {
    fontSize: 16,
    color: colors.text.primary,
    flex: 1,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    margin: 8,
    gap: 12,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
    borderLeftWidth: 4,
    borderLeftColor: 'transparent',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.error.main,
    flex: 1,
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
