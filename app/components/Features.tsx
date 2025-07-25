import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../i18n/i18n';
import { GlowingEffect } from './GlowingEffect';
import { FlippingCard } from './FlipCard';

const getFeatureStyles = (isDark: boolean, colors: any) => StyleSheet.create({
  feature: {
    marginBottom: 30,
    padding: 25,
    borderRadius: 2 * 16,
    shadowColor: isDark ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.05)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    transform: [{ scale: 1 }],
    alignItems: 'center',
    textAlign: 'center',
    backgroundColor: isDark ? colors.background.paper : colors.background.default,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 16,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
  },
  featureTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
    letterSpacing: -0.3,
    textAlign: 'center',
    width: '100%',
    color: colors.text,
  },
  featureDescription: {
    fontSize: 16,
    lineHeight: 24,
    opacity: isDark ? 0.85 : 0.9,
    letterSpacing: 0.1,
    textAlign: 'center',
    width: '100%',
    color: isDark ? colors.text : colors.textSecondary,
  },
});

interface FeaturesProps {
  styles: Record<string, any>;
  featuresAnimatedStyle: Record<string, any>;
  feature1Style: Record<string, any>;
  feature2Style: Record<string, any>;
  feature3Style: Record<string, any>;
  isDark: boolean;
}

const Features: React.FC<FeaturesProps> = ({
  styles: containerStyles,
  featuresAnimatedStyle,
  feature1Style,
  feature2Style,
  feature3Style,
  isDark,
}) => {
  const featureStyles = getFeatureStyles(isDark, useTheme().colors);
  const { colors } = useTheme();
  const { t } = useTranslation('index');

  const features = [
    {
      id: 'secure',
      icon: 'shield-checkmark',
      titleKey: 'features.secure.title',
      backDescription: 'features.secure.description'
    },
    {
      id: 'management',
      icon: 'key',
      titleKey: 'features.management.title',
      backDescription: 'features.management.description'
    },
    {
      id: 'sync',
      icon: 'sync',
      titleKey: 'features.sync.title',
      backDescription: 'features.sync.description'
    }
  ];

  return (
    <Animated.View style={[containerStyles?.featuresContainer, featuresAnimatedStyle]}>
      <View style={containerStyles?.featuresGrid}>
        {features.map((feature, index) => (
          <View key={feature.id} style={[featureStyles.feature, [feature1Style, feature2Style, feature3Style][index], { backgroundColor: isDark ? 'black' : colors.background.default }]}>
            <GlowingEffect
              spread={40}
              glow={true}
              disabled={false}
              proximity={64}
              inactiveZone={0.01}
              borderWidth={3}
              isDarkMode={isDark}
            />
            <FlippingCard
              frontContent={
                <View style={{ 
                  flex: 1, 
                  justifyContent: 'center', 
                  alignItems: 'center',
                  padding: 55,
                }}>
                  <View style={[featureStyles.iconContainer, { marginBottom: 24 }]}>
                    <Ionicons name={feature.icon as any} size={45} color={colors.primary} />
                  </View>
                  <Text style={[featureStyles.featureTitle, { textAlign: 'center' }]}>
                    {t(feature.titleKey)}
                  </Text>
                </View>
              }
              backContent={
                <View style={{ 
                  flex: 1, 
                  justifyContent: 'center', 
                  alignItems: 'center',
                  padding: 55 
                }}>
                  <Text style={[featureStyles.featureDescription, { 
                    textAlign: 'center',
                    lineHeight: 24
                  }]}>
                    {t(feature.backDescription)}
                  </Text>
                </View>
              }
              height={280}
              width={280}
            />
          </View>
        ))}
      </View>
    </Animated.View>
  );
};

export default Features;
