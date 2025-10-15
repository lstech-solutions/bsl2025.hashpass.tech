import React, { createContext, useContext, useState, useRef, ReactNode } from 'react';
import { Animated } from 'react-native';

export interface ScrollContextType {
  scrollY: Animated.Value;
  headerOpacity: Animated.AnimatedInterpolation<number>;
  headerBackground: Animated.AnimatedInterpolation<string>;
  headerTint: Animated.AnimatedInterpolation<string>;
  headerBlur: Animated.AnimatedInterpolation<number>;
  headerBorderWidth: Animated.AnimatedInterpolation<number>;
  headerShadowOpacity: Animated.AnimatedInterpolation<number>;
  headerHeight: number;
  setHeaderHeight: (height: number) => void;
  setScrollY: (value: number) => void;
}

const ScrollContext = createContext<ScrollContextType | undefined>(undefined);

const HEADER_SCROLL_DISTANCE = 100;

export const ScrollProvider = ({ children }: { children: ReactNode }) => {
  const scrollY = useRef(new Animated.Value(0)).current;
  const [headerHeight, setHeaderHeight] = useState(0);

  // Function to update the scroll position from child components
  const setScrollY = (value: number) => {
    scrollY.setValue(value);
  };

  // Interpolate header opacity based on scroll position
  // Start with full opacity when not scrolled for better visibility
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE * 0.3, HEADER_SCROLL_DISTANCE],
    outputRange: [0.95, 1, 1], // Start slightly transparent, then fully opaque
    extrapolate: 'clamp',
  });

  // Interpolate header background color with better contrast
  const headerBackground = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE * 0.2, HEADER_SCROLL_DISTANCE * 0.6, HEADER_SCROLL_DISTANCE],
    outputRange: [
      'rgba(255, 255, 255, 0.95)',  // Start with very high opacity white for maximum contrast
      'rgba(255, 255, 255, 0.98)',  // Increase opacity quickly
      'rgba(255, 255, 255, 0.99)',  // Near full opacity
      'rgba(255, 255, 255, 1)'      // Full opacity when scrolled
    ],
    extrapolate: 'clamp',
  });
  
  // Add a very subtle blue tint for branding
  const headerTint = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE * 0.3, HEADER_SCROLL_DISTANCE],
    outputRange: [
      'rgba(0, 122, 255, 0.02)',  // Minimal blue tint when not scrolled
      'rgba(0, 122, 255, 0.03)',  // Slightly more blue
      'rgba(0, 122, 255, 0.04)'   // More pronounced blue when scrolled
    ],
    extrapolate: 'clamp',
  });

  // Interpolate blur radius based on scroll position
  const headerBlur = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE * 0.3, HEADER_SCROLL_DISTANCE],
    outputRange: [8, 12, 15], // Start with some blur for better contrast
    extrapolate: 'clamp',
  });

  // Interpolate header border width and shadow
  const headerBorderWidth = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE * 0.5, HEADER_SCROLL_DISTANCE],
    outputRange: [0, 0.5, 1],
    extrapolate: 'clamp',
  });

  // Add shadow opacity for better depth
  const headerShadowOpacity = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE * 0.3, HEADER_SCROLL_DISTANCE],
    outputRange: [0.1, 0.2, 0.3],
    extrapolate: 'clamp',
  });

  return (
    <ScrollContext.Provider
      value={{
        scrollY,
        headerOpacity,
        headerBackground,
        headerTint,
        headerBlur,
        headerBorderWidth,
        headerShadowOpacity,
        headerHeight,
        setHeaderHeight,
        setScrollY,
      }}>
      {children}
    </ScrollContext.Provider>
  );
};

export interface ScrollContextType {
  scrollY: Animated.Value;
  headerOpacity: Animated.AnimatedInterpolation<number>;
  headerBackground: Animated.AnimatedInterpolation<string>;
  headerTint: Animated.AnimatedInterpolation<string>;
  headerBlur: Animated.AnimatedInterpolation<number>;
  headerBorderWidth: Animated.AnimatedInterpolation<number>;
  headerShadowOpacity: Animated.AnimatedInterpolation<number>;
  headerHeight: number;
  setHeaderHeight: (height: number) => void;
  setScrollY: (value: number) => void;
}

export const useScroll = (): ScrollContextType => {
  const context = useContext(ScrollContext);
  if (context === undefined) {
    throw new Error('useScroll must be used within a ScrollProvider');
  }
  return context;
};
