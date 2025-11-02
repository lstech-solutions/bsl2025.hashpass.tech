import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Image, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../hooks/useAuth';
import { qrSystemService, QRCode } from '../lib/qr-system';
import { passSystemService } from '../lib/pass-system';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming, withSpring } from 'react-native-reanimated';

interface DynamicQRDisplayProps {
  passId: string;
  passNumber?: string;
  passType?: string;
  size?: number;
  showRefreshButton?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number; // in seconds
  onRefresh?: () => void;
  onError?: (error: string) => void;
}

export default function DynamicQRDisplay({
  passId,
  passNumber,
  passType,
  size = 200,
  showRefreshButton = true,
  autoRefresh = true,
  refreshInterval = 30, // Refresh every 30 seconds
  onRefresh,
  onError,
}: DynamicQRDisplayProps) {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const [qrCode, setQrCode] = useState<QRCode | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [timeUntilExpiry, setTimeUntilExpiry] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const expiryTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const pulseAnimation = useSharedValue(1);
  const rotateAnimation = useSharedValue(0);

  const styles = getStyles(isDark, colors, size);

  useEffect(() => {
    generateQR();
    
    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
      if (expiryTimerRef.current) {
        clearInterval(expiryTimerRef.current);
      }
    };
  }, [passId]);

  useEffect(() => {
    if (autoRefresh && qrCode && qrCode.status === 'active') {
      // Set up auto-refresh timer
      refreshTimerRef.current = setInterval(() => {
        refreshQR();
      }, refreshInterval * 1000);
    }

    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, [qrCode, autoRefresh, refreshInterval]);

  useEffect(() => {
    if (qrCode && qrCode.expires_at) {
      // Set up expiry countdown
      const updateCountdown = () => {
        const expiryTime = new Date(qrCode.expires_at!).getTime();
        const now = Date.now();
        const remaining = Math.max(0, Math.floor((expiryTime - now) / 1000));
        setTimeUntilExpiry(remaining);

        if (remaining <= 0) {
          // QR expired, refresh it
          refreshQR();
        }
      };

      updateCountdown();
      expiryTimerRef.current = setInterval(updateCountdown, 1000);

      return () => {
        if (expiryTimerRef.current) {
          clearInterval(expiryTimerRef.current);
        }
      };
    }
  }, [qrCode]);

  const generateQR = async () => {
    if (!user) {
      setError('User not authenticated');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await qrSystemService.generatePassQR(passId, {
        expiresInMinutes: 30,
        maxUses: 1,
      });

      if (!result) {
        throw new Error('Failed to generate QR code');
      }

      // Fetch the full QR code details
      const qrDetails = await qrSystemService.getQRById(result.qrId);
      if (qrDetails) {
        setQrCode(qrDetails);
      } else {
        throw new Error('Failed to fetch QR code details');
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Error generating QR code';
      setError(errorMessage);
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const refreshQR = async () => {
    if (isRefreshing) return;

    setIsRefreshing(true);
    setError(null);

    // Animate refresh
    rotateAnimation.value = withRepeat(
      withTiming(360, { duration: 1000 }),
      1,
      false
    );

    try {
      await generateQR();
      if (onRefresh) {
        onRefresh();
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Error refreshing QR code';
      setError(errorMessage);
    } finally {
      setIsRefreshing(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getQRImageUrl = (token: string): string => {
    // Using a public QR code API - in production, you might want to use a library
    // or generate QR codes server-side
    const qrPayload = qrSystemService.generateQRPayload(token);
    const encoded = encodeURIComponent(qrPayload);
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encoded}`;
  };

  const animatedRefreshStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${rotateAnimation.value}deg` }],
    };
  });

  const animatedPulseStyle = useAnimatedStyle(() => {
    return {
      opacity: pulseAnimation.value,
    };
  });

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Generating QR code...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color={colors.error} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={generateQR}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!qrCode) {
    return null;
  }

  const qrImageUrl = getQRImageUrl(qrCode.token);

  return (
    <View style={styles.container}>
      {/* QR Code Display */}
      <View style={styles.qrContainer}>
        <Animated.View style={[styles.qrWrapper, animatedPulseStyle]}>
          <Image
            source={{ uri: qrImageUrl }}
            style={styles.qrImage}
            resizeMode="contain"
          />
          
          {/* Status Badge */}
          {qrCode.status !== 'active' && (
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>
                {qrCode.status === 'used' ? 'Used' : 
                 qrCode.status === 'expired' ? 'Expired' : 
                 qrCode.status === 'revoked' ? 'Revoked' : 'Suspended'}
              </Text>
            </View>
          )}
        </Animated.View>

        {/* Expiry Timer */}
        {timeUntilExpiry !== null && timeUntilExpiry > 0 && (
          <View style={styles.expiryContainer}>
            <Ionicons name="time-outline" size={16} color={colors.text.secondary} />
            <Text style={styles.expiryText}>
              Expires in {formatTime(timeUntilExpiry)}
            </Text>
          </View>
        )}

        {/* Pass Info */}
        {passNumber && (
          <View style={styles.passInfo}>
            <Text style={styles.passNumber}>{passNumber}</Text>
            {passType && (
              <Text style={styles.passType}>
                {passSystemService.getPassTypeDisplayName(passType as any)}
              </Text>
            )}
          </View>
        )}
      </View>

      {/* Refresh Button */}
      {showRefreshButton && (
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={refreshQR}
          disabled={isRefreshing}
        >
          <Animated.View style={animatedRefreshStyle}>
            <Ionicons
              name="refresh"
              size={20}
              color={isRefreshing ? colors.text.secondary : colors.primary}
            />
          </Animated.View>
          <Text style={[
            styles.refreshButtonText,
            isRefreshing && styles.refreshButtonTextDisabled
          ]}>
            {isRefreshing ? 'Refreshing...' : 'Refresh QR'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Security Notice */}
      <View style={styles.securityNotice}>
        <Ionicons name="shield-checkmark" size={16} color={colors.text.secondary} />
        <Text style={styles.securityText}>
          This QR code updates automatically to prevent unauthorized use
        </Text>
      </View>
    </View>
  );
}

const getStyles = (isDark: boolean, colors: any, size: number) =>
  StyleSheet.create({
    container: {
      alignItems: 'center',
      padding: 16,
    },
    loadingContainer: {
      alignItems: 'center',
      padding: 32,
    },
    loadingText: {
      marginTop: 12,
      fontSize: 14,
      color: colors.text.secondary,
    },
    errorContainer: {
      alignItems: 'center',
      padding: 32,
    },
    errorText: {
      marginTop: 12,
      fontSize: 14,
      color: colors.error,
      textAlign: 'center',
    },
    retryButton: {
      marginTop: 16,
      paddingHorizontal: 24,
      paddingVertical: 12,
      backgroundColor: colors.primary,
      borderRadius: 8,
    },
    retryButtonText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '600',
    },
    qrContainer: {
      alignItems: 'center',
      marginBottom: 16,
    },
    qrWrapper: {
      position: 'relative',
      backgroundColor: '#FFFFFF',
      padding: 16,
      borderRadius: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    qrImage: {
      width: size,
      height: size,
    },
    statusBadge: {
      position: 'absolute',
      top: 8,
      right: 8,
      backgroundColor: colors.error,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
    },
    statusText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '600',
    },
    expiryContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 12,
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: colors.background.secondary,
      borderRadius: 8,
    },
    expiryText: {
      marginLeft: 6,
      fontSize: 12,
      color: colors.text.secondary,
      fontWeight: '500',
    },
    passInfo: {
      marginTop: 16,
      alignItems: 'center',
    },
    passNumber: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text.primary,
      marginBottom: 4,
    },
    passType: {
      fontSize: 14,
      color: colors.text.secondary,
    },
    refreshButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 10,
      backgroundColor: colors.background.secondary,
      borderRadius: 8,
      marginTop: 8,
    },
    refreshButtonText: {
      marginLeft: 8,
      fontSize: 14,
      color: colors.primary,
      fontWeight: '500',
    },
    refreshButtonTextDisabled: {
      color: colors.text.secondary,
    },
    securityNotice: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 16,
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: colors.background.secondary,
      borderRadius: 8,
      maxWidth: size + 64,
    },
    securityText: {
      marginLeft: 8,
      fontSize: 11,
      color: colors.text.secondary,
      flex: 1,
      textAlign: 'center',
    },
  });

