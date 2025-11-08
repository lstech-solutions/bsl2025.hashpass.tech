import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Dimensions, StyleSheet } from 'react-native';
import { Coins, ArrowRightLeft, ExternalLink, TrendingUp, Shield, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../i18n/i18n';

interface Token {
  symbol: string;
  name: string;
  balance: string;
  usdValue: string;
  network: string;
  description: string;
  color: string;
  icon: string;
}

const BlockchainTokensView = () => {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation('wallet');
  const screenWidth = Dimensions.get('window').width;
  const paddingHorizontal = screenWidth < 400 ? 16 : 24;
  // Calculate card width: screen width - padding (2x) - margins (32) = responsive width
  // Minimum 280px, maximum 320px
  const cardWidth = Math.max(280, Math.min(320, screenWidth - (paddingHorizontal * 2) - 32));
  const cardSpacing = 16;
  
  // Scroll state and refs
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);
  const [scrollX, setScrollX] = useState(0);
  const [maxScrollX, setMaxScrollX] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [contentWidth, setContentWidth] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const tokens: Token[] = [
    {
      symbol: 'LUKAS',
      name: 'LUKAS Token',
      balance: '0.00',
      usdValue: '0.00',
      network: 'Native',
      description: 'Native token of HashPass ecosystem',
      color: '#8b5cf6',
      icon: '💎',
    },
    {
      symbol: 'COP',
      name: 'Colombian Peso Token',
      balance: '0.00',
      usdValue: '0.00',
      network: 'Pegged',
      description: 'Pegged to Colombian Peso, backed by HashPass merchants',
      color: '#10b981',
      icon: '🇨🇴',
    },
    {
      symbol: 'VOI',
      name: 'Voi Network Token',
      balance: '0.00',
      usdValue: '0.00',
      network: 'Voi Network',
      description: 'Token from Voi Network (Algorand fork)',
      color: '#3b82f6',
      icon: '🔷',
    },
  ];

  const handleScroll = (event: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const x = contentOffset.x;
    const maxX = Math.max(0, contentSize.width - layoutMeasurement.width);
    setScrollX(x);
    setMaxScrollX(maxX);
    setViewportWidth(layoutMeasurement.width);
    setShowLeftArrow(x > 10);
    setShowRightArrow(x < maxX - 10);
  };

  const scrollTo = (direction: 'left' | 'right') => {
    const delta = Math.max(cardWidth, viewportWidth - cardSpacing);
    const target = direction === 'left' ? scrollX - delta : scrollX + delta;
    const nextX = Math.max(0, Math.min(target, maxScrollX));
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ x: nextX, animated: true });
    }
  };

  const handleLayout = (e: any) => {
    const w = e?.nativeEvent?.layout?.width || 0;
    setViewportWidth(w);
    setMaxScrollX(Math.max(0, contentWidth - w));
    // Check if we need to show right arrow initially
    if (contentWidth > w) {
      setShowRightArrow(true);
    }
  };

  const handleContentSizeChange = (w: number, _h: number) => {
    setContentWidth(w);
    setMaxScrollX(Math.max(0, w - viewportWidth));
    // Check if we need to show right arrow
    if (w > viewportWidth) {
      setShowRightArrow(true);
    }
  };

  const handleWheel = (e: any) => {
    // RN Web: map wheel vertical/horizontal delta to horizontal scroll
    const dx = e?.nativeEvent?.deltaX ?? e?.deltaX ?? 0;
    const dy = e?.nativeEvent?.deltaY ?? e?.deltaY ?? 0;
    const delta = Math.abs(dx) > Math.abs(dy) ? dx : dy;
    const nextX = Math.max(0, Math.min(scrollX + delta, maxScrollX));
    if (typeof e?.preventDefault === 'function') e.preventDefault();
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ x: nextX, animated: false });
    }
  };

  const styles = getStyles(isDark, colors);

  return (
    <View style={{ paddingHorizontal }}>
      {/* Total Portfolio Value */}
      <View
        style={{
          marginBottom: 24,
          backgroundColor: colors.background.paper,
          borderRadius: 16,
          padding: 20,
          borderWidth: 1,
          borderColor: colors.divider,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
          <TrendingUp size={20} color={colors.text.primary} />
          <Text
            style={{
              fontSize: 16,
              fontWeight: '600',
              color: colors.text.primary,
              marginLeft: 8,
            }}
          >
            {t('tokens.totalPortfolio')}
          </Text>
        </View>
        <Text
          style={{
            fontSize: 28,
            fontWeight: '800',
            color: colors.text.primary,
            marginBottom: 4,
          }}
        >
          $0.00 USD
        </Text>
        <Text
          style={{
            fontSize: 12,
            color: colors.text.secondary,
          }}
        >
          {t('tokens.portfolioDesc')}
        </Text>
      </View>

      <View style={styles.scrollContainer}>
        {showLeftArrow && (
          <TouchableOpacity
            style={[styles.scrollArrow, styles.leftArrow]}
            onPress={() => scrollTo('left')}
          >
            <ChevronLeft size={24} color={colors.primary} />
          </TouchableOpacity>
        )}
        <ScrollView 
          ref={scrollRef}
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingRight: paddingHorizontal }}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          decelerationRate="fast"
          snapToInterval={cardWidth + cardSpacing}
          snapToAlignment="start"
          disableIntervalMomentum
          onLayout={handleLayout}
          onContentSizeChange={handleContentSizeChange}
          // @ts-ignore - onWheel supported in RN Web
          onWheel={handleWheel}
        >
        {tokens.map((token, index) => (
          <View
            key={token.symbol}
            style={{
              width: cardWidth,
              backgroundColor: colors.background.paper,
              borderRadius: 16,
              padding: screenWidth < 400 ? 16 : 20,
              marginRight: index === tokens.length - 1 ? 0 : cardSpacing,
              marginLeft: index === 0 ? 0 : 0,
              borderWidth: 1,
              borderColor: colors.divider,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
              elevation: 3,
            }}
          >
            {/* Token Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: `${token.color}20`,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 12,
                }}
              >
                <Text style={{ fontSize: 24 }}>{token.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 20,
                    fontWeight: '700',
                    color: colors.text.primary,
                    marginBottom: 4,
                  }}
                >
                  {token.symbol}
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: colors.text.secondary,
                  }}
                >
                  {token.name}
                </Text>
              </View>
            </View>

            {/* Balance */}
            <View style={{ marginBottom: 16 }}>
              <Text
                style={{
                  fontSize: 32,
                  fontWeight: '800',
                  color: token.color,
                  marginBottom: 4,
                }}
              >
                {token.balance}
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: colors.text.secondary,
                }}
              >
                ≈ ${token.usdValue} USD
              </Text>
            </View>

            {/* Network Badge */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 16,
              }}
            >
              <Shield size={14} color={colors.text.secondary} />
              <Text
                style={{
                  fontSize: 12,
                  color: colors.text.secondary,
                  marginLeft: 6,
                }}
              >
                {token.network}
              </Text>
            </View>

            {/* Description */}
            <Text
              style={{
                fontSize: 13,
                color: colors.text.secondary,
                marginBottom: 16,
                lineHeight: 18,
              }}
            >
              {token.description}
            </Text>

            {/* Actions */}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: token.color,
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderRadius: 8,
                  alignItems: 'center',
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <ArrowRightLeft size={16} color="#fff" />
                  <Text
                    style={{
                      color: '#fff',
                      fontWeight: '600',
                      marginLeft: 6,
                      fontSize: 14,
                    }}
                  >
                    {t('tokens.swap')}
                  </Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: colors.divider,
                  alignItems: 'center',
                }}
              >
                <ExternalLink size={16} color={colors.text.primary} />
              </TouchableOpacity>
            </View>
          </View>
        ))}
        </ScrollView>
        {showRightArrow && (
          <TouchableOpacity
            style={[styles.scrollArrow, styles.rightArrow]}
            onPress={() => scrollTo('right')}
          >
            <ChevronRight size={24} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const getStyles = (isDark: boolean, colors: any) => StyleSheet.create({
  scrollContainer: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  scrollArrow: {
    position: 'absolute',
    zIndex: 1,
    backgroundColor: colors.background.paper,
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: isDark ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.3 : 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  leftArrow: {
    left: -10,
  },
  rightArrow: {
    right: -10,
  },
});

export default BlockchainTokensView;

