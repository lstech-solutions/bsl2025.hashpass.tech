import React, { createContext, useContext, useState, useRef, ReactNode } from 'react';
import { Animated } from 'react-native';

export interface ScrollContextType {
  scrollY: Animated.Value;
  headerOpacity: Animated.AnimatedInterpolation<number>;
  headerBackground: Animated.AnimatedInterpolation<string>;
  headerTint: Animated.AnimatedInterpolation<string>;
  headerBlur: Animated.AnimatedInterpolation<number>;
  headerBorderWidth: Animated.AnimatedInterpolation<number>;
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
    inputRange: [0, HEADER_SCROLL_DISTANCE * 0.5, HEADER_SCROLL_DISTANCE],
    outputRange: [1, 1, 1], // Keep opacity at 1 (fully visible) at all times
    extrapolate: 'clamp',
  });

  // Interpolate header background color with opacity based on scroll position
  // Start with a semi-transparent background when not scrolled
  const headerBackground = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE * 0.5, HEADER_SCROLL_DISTANCE],
    outputRange: [
      'transparent',              // Start with transparent when not scrolled
      'rgba(0, 0, 0, 0.7)',      // Semi-transparent when partially scrolled
      'rgba(0, 0, 0, 0.95)'      // Maximum opacity when fully scrolled
    ],
    extrapolate: 'clamp',
  });
  
  // Add a blue tint to the header background
  const headerTint = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE * 0.5, HEADER_SCROLL_DISTANCE],
    outputRange: [
      'rgba(30, 64, 175, 0)',    // Start with transparent blue when not scrolled
      'rgba(30, 64, 175, 0.5)',  // Semi-transparent blue when partially scrolled
      'rgba(30, 64, 175, 0.9)'   // More solid blue when fully scrolled
    ],
    extrapolate: 'clamp',
  });

  // Interpolate blur radius based on scroll position
  const headerBlur = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE],
    outputRange: [0, 10],
    extrapolate: 'clamp',
  });

  // Interpolate header border width
  const headerBorderWidth = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE],
    outputRange: [0, 1],
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
