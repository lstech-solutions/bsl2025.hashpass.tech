import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';

export interface LoadingScreenProps {
  /**
   * Custom icon name from MaterialIcons (optional)
   * If not provided, will use ActivityIndicator
   */
  icon?: string;
  
  /**
   * Main loading message
   */
  message?: string;
  
  /**
   * Optional subtitle or additional info
   */
  subtitle?: string;
  
  /**
   * Show spinner (default: true if no icon provided)
   */
  showSpinner?: boolean;
  
  /**
   * Size of the spinner (default: 'large')
   */
  spinnerSize?: 'small' | 'large';
  
  /**
   * Custom icon size (default: 48)
   */
  iconSize?: number;
  
  /**
   * Custom icon color (optional, will use theme primary if not provided)
   */
  iconColor?: string;
  
  /**
   * Retry count or attempt number (optional)
   * Will show "Retrying... (X/3)" format if provided
   */
  retryCount?: number;
  
  /**
   * Full screen mode (default: false)
   * If true, takes full screen. If false, takes container space
   */
  fullScreen?: boolean;
}

/**
 * Unified Loading Screen Component
 * Provides consistent loading states across the app with customization options
 */
const LoadingScreen: React.FC<LoadingScreenProps> = ({
  icon,
  message = 'Loading...',
  subtitle,
  showSpinner,
  spinnerSize = 'large',
  iconSize = 48,
  iconColor,
  retryCount,
  fullScreen = false,
}) => {
  const { isDark, colors } = useTheme();
  const styles = getStyles(isDark, colors, fullScreen);
  
  // Determine if we should show spinner (default: true if no icon)
  const shouldShowSpinner = showSpinner !== undefined ? showSpinner : !icon;
  
  // Determine icon color
  const finalIconColor = iconColor || colors.primary;
  
  // Build display message
  const displayMessage = retryCount !== undefined && retryCount > 0
    ? `Retrying... (${retryCount}/3)`
    : message;

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Icon or Spinner */}
        {icon ? (
          <MaterialIcons 
            name={icon as any} 
            size={iconSize} 
            color={finalIconColor} 
            style={styles.icon}
          />
        ) : shouldShowSpinner ? (
          <ActivityIndicator 
            size={spinnerSize} 
            color={finalIconColor} 
            style={styles.spinner}
          />
        ) : null}
        
        {/* Main Message */}
        <Text style={[styles.message, { color: colors.text.primary }]}>
          {displayMessage}
        </Text>
        
        {/* Subtitle */}
        {subtitle && (
          <Text style={[styles.subtitle, { color: colors.text.secondary }]}>
            {subtitle}
          </Text>
        )}
        
        {/* Retry hint */}
        {retryCount !== undefined && retryCount > 0 && (
          <Text style={[styles.retryHint, { color: colors.text.secondary }]}>
            Taking longer than expected, please wait...
          </Text>
        )}
      </View>
    </View>
  );
};

const getStyles = (isDark: boolean, colors: any, fullScreen: boolean) => StyleSheet.create({
  container: {
    flex: fullScreen ? 1 : undefined,
    justifyContent: 'center',
    alignItems: 'center',
    padding: fullScreen ? 0 : 40,
    minHeight: fullScreen ? '100%' : 200,
    backgroundColor: fullScreen ? colors.background.default : 'transparent',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: 300,
  },
  icon: {
    marginBottom: 24,
  },
  spinner: {
    marginBottom: 24,
  },
  message: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 0,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  retryHint: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 12,
    fontStyle: 'italic',
  },
});

export default LoadingScreen;

