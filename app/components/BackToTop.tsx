import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, SharedValue } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';

interface BackToTopProps {
  scrollY: SharedValue<number>;
  scrollRef: React.RefObject<any>;
  colors: any;
}

const BackToTop: React.FC<BackToTopProps> = ({ scrollY, scrollRef, colors }) => {
  const { isDark } = useTheme();
  const buttonOpacity = useAnimatedStyle(() => ({
    opacity: scrollY.value > 30 ? 1 : 0,
  } as const));

  const handleScrollToTop = () => {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const buttonStyle = {
    ...baseStyles.button,
    backgroundColor: isDark ? colors.primary : colors.surface
  };

  return (
    <Animated.View style={[baseStyles.buttonContainer, buttonOpacity]}>
      <TouchableOpacity
        style={buttonStyle}
        onPress={handleScrollToTop}
        activeOpacity={0.8}
      >
        <Ionicons name="arrow-up" size={24} color={colors.text.primary} />
      </TouchableOpacity>
    </Animated.View>
  );
};

const baseStyles = StyleSheet.create({
  buttonContainer: {
    position: 'absolute',
    bottom: 50,
    right: 20,
    zIndex: 100,
  },
  button: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
});

export default BackToTop;
