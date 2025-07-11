import React, { useEffect, useRef } from 'react';
import { View, TouchableOpacity, StyleSheet, Animated, Easing } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

export const ThemeAndLanguageSwitcher = () => {
  const { theme, toggleTheme, colors, isDark } = useTheme();
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handleThemeToggle = () => {
    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Scale down and up animation
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
        easing: Easing.bounce,
      }),
    ]).start();
    
    // Rotation animation (continuous)
    Animated.timing(rotateAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
      easing: Easing.linear,
    }).start(({ finished }) => {
      if (finished) {
        rotateAnim.setValue(0);
      }
    });
    
    toggleTheme();
  };

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  
  const animatedStyle = {
    transform: [
      { rotate: rotateInterpolate },
      { scale: scaleAnim },
    ],
  };
  
  return (
    <View style={styles.container}>
      {/* Language Switcher - Placeholder for now */}
      <TouchableOpacity 
        style={[styles.button, { backgroundColor: colors.surface }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          console.log('Language switcher pressed');
        }}
      >
        <Ionicons 
          name="language" 
          size={24} 
          color={colors.textSecondary} 
        />
      </TouchableOpacity>
      
      {/* Theme Toggler */}
      <Animated.View style={animatedStyle}>
        <TouchableOpacity 
          style={[
            styles.button, 
            { 
              backgroundColor: colors.surface,
              marginLeft: 10,
              shadowColor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.5,
              shadowRadius: 4,
              elevation: 4,
            }
          ]}
          onPress={handleThemeToggle}
          activeOpacity={0.8}
        >
          <Ionicons 
            name={isDark ? 'sunny' : 'moon'} 
            size={24} 
            color={isDark ? '#FFD700' : '#6C63FF'} 
          />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 1000,
  },
  button: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
});

export default ThemeAndLanguageSwitcher;
