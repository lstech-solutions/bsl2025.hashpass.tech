import React, { useEffect, useRef, useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Animated, Easing, Text, Modal, TouchableWithoutFeedback } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useLanguage } from '../contexts/LanguageContext';
import { getAvailableLocales } from '../i18n/i18n';

export const ThemeAndLanguageSwitcher = () => {
  const { toggleTheme, colors, isDark } = useTheme();
  const { locale, setLocale } = useLanguage();
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const availableLocales = getAvailableLocales();
  
  const currentLanguage = availableLocales.find(lang => lang.code === locale) || availableLocales[0];

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

  const toggleLanguageMenu = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (showLanguageMenu) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => setShowLanguageMenu(false));
    } else {
      setShowLanguageMenu(true);
      slideAnim.setValue(0);
      Animated.spring(slideAnim, {
        toValue: 1,
        friction: 5,
        useNativeDriver: true,
      }).start();
    }
  };

  const handleLanguageSelect = (langCode: string) => {
    try {
      // Haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      // Update the locale through the context
      setLocale(langCode);
      // Close the language menu
      setShowLanguageMenu(false);
    } catch (error) {
      console.error('Failed to change language:', error);
    }
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
  
  const menuTranslateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-20, 0],
  });

  const menuOpacity = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <View style={styles.container}>
      {/* Language Switcher */}
      <View style={styles.languageContainer}>
        <TouchableOpacity 
          style={[styles.button, { backgroundColor: colors.surface }]}
          onPress={toggleLanguageMenu}
          activeOpacity={0.8}
        >
          <Text style={[styles.languageText, { color: colors.text.primary }]}>
            {currentLanguage.code.toUpperCase()}
          </Text>
        </TouchableOpacity>
        
        {showLanguageMenu && (
          <Animated.View 
            style={[
              styles.languageMenu,
              { 
                backgroundColor: colors.surface,
                transform: [{ translateY: menuTranslateY }],
                opacity: menuOpacity,
                shadowColor: isDark ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.2)',
              }
            ]}
          >
            {availableLocales.map((lang) => (
              <TouchableOpacity
                key={lang.code}
                style={[
                  styles.languageItem,
                  lang.code === locale && { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)' }
                ]}
                onPress={() => handleLanguageSelect(lang.code)}
              >
                <Text style={[styles.languageText, { color: colors.text.primary }]}>
                  {lang.name}
                </Text>
              </TouchableOpacity>
            ))}
          </Animated.View>
        )}
      </View>
      
      {/* Theme Toggler */}
      <Animated.View style={[animatedStyle, { marginLeft: 10 }]}>
        <TouchableOpacity 
          style={[
            styles.button, 
            { 
              backgroundColor: colors.surface,
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
      
      {/* Overlay to close menu when clicking outside */}
      {showLanguageMenu && (
        <TouchableWithoutFeedback onPress={toggleLanguageMenu}>
          <View style={styles.overlay} />
        </TouchableWithoutFeedback>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1000,
    alignItems: 'flex-start',
  },
  languageContainer: {
    position: 'relative',
  },
  button: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  languageMenu: {
    position: 'absolute',
    top: 60,
    right: 0,
    minWidth: 120,
    borderRadius: 12,
    paddingVertical: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1001,
  },
  languageItem: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  languageText: {
    fontSize: 16,
    fontWeight: '500',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
});

export default ThemeAndLanguageSwitcher;
