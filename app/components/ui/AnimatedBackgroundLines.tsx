import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';

const AnimatedPath = Animated.createAnimatedComponent(Path);

interface AnimatedBackgroundLinesProps {
  position: number; // 1 for normal animation, -1 for mirrored animation
}

export function AnimatedBackgroundLines({ position }: AnimatedBackgroundLinesProps) {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    // Animate translateY for a subtle floating effect
    translateY.value = withRepeat(
      withTiming(50 * position, { duration: 18000, easing: Easing.linear }), // Slower, smoother movement
      -1, // Repeat indefinitely
      true // Reverse animation direction on each repeat
    );

    // Animate opacity for a gentle fade in/out effect
    opacity.value = withRepeat(
      withTiming(1, { duration: 9000, easing: Easing.ease }), // Slower fade
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
      opacity: opacity.value,
    };
  });

  // Define a few abstract, wavy paths
  const paths = [
    {
      d: "M0,50 C50,0 100,100 150,50 S250,0 300,50",
      strokeWidth: 0.8,
      color: 'rgba(158, 127, 255, 0.1)', // Primary color with low opacity
    },
    {
      d: "M0,100 Q75,20 150,100 T300,100",
      strokeWidth: 0.6,
      color: 'rgba(56, 189, 248, 0.1)', // Secondary color with low opacity
    },
    {
      d: "M0,20 C70,80 130,-40 200,20",
      strokeWidth: 0.7,
      color: 'rgba(244, 114, 182, 0.1)', // Accent color with low opacity
    },
    {
      d: "M0,75 C60,15 120,135 180,75 S240,15 300,75",
      strokeWidth: 0.9,
      color: 'rgba(158, 127, 255, 0.08)', // Primary color, even lower opacity
    },
  ];

  return (
    <View style={styles.container}>
      <Svg height="100%" width="100%" viewBox="0 0 300 150">
        {paths.map((path, index) => (
          <AnimatedPath
            key={index}
            d={path.d}
            stroke={path.color}
            strokeWidth={path.strokeWidth}
            fill="none"
          />
        ))}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
});
