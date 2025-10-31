import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, StatusBar } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';

interface EventBannerProps {
  title: string;
  subtitle: string;
  date: string;
  backgroundColor?: string;
  showCountdown?: boolean;
  showLiveIndicator?: boolean;
  eventStartDate?: string; // ISO date string for countdown
  isLive?: boolean;
  lastUpdated?: string | null;
  usingJsonFallback?: boolean;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export default function EventBanner({ 
  title, 
  subtitle, 
  date, 
  backgroundColor = '#007AFF',
  showCountdown = false,
  showLiveIndicator = false,
  eventStartDate = '2025-11-12T09:00:00-05:00', // BSL 2025 start time
  isLive = false,
  lastUpdated = null,
  usingJsonFallback = false
}: EventBannerProps) {
  const { isDark, colors } = useTheme();
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [isEventLive, setIsEventLive] = useState(false);
  const [pulseAnim] = useState(new Animated.Value(1));
  const styles = getStyles(isDark, colors, backgroundColor);

  // Calculate time left until event
  const calculateTimeLeft = (): TimeLeft => {
    const now = new Date().getTime();
    const eventTime = new Date(eventStartDate).getTime();
    const difference = eventTime - now;

    if (difference > 0) {
      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((difference % (1000 * 60)) / 1000)
      };
    } else {
      setIsEventLive(true);
      return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    }
  };

  // Update countdown every second
  useEffect(() => {
    if (showCountdown) {
      const timer = setInterval(() => {
        setTimeLeft(calculateTimeLeft());
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [showCountdown, eventStartDate]);

  // Live indicator pulse animation
  useEffect(() => {
    if (showLiveIndicator && (isLive || isEventLive)) {
      const pulse = () => {
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]).start(() => pulse());
      };
      pulse();
    }
  }, [showLiveIndicator, isLive, isEventLive, pulseAnim]);

  const formatTimeUnit = (value: number): string => {
    return value.toString().padStart(2, '0');
  };

  return (
    <View style={styles.headerSection}>
      {/* Main Event Info */}
      <View style={styles.mainInfo}>
        <Text style={styles.eventTitle}>{title}</Text>
        <Text style={styles.eventSubtitle}>{subtitle}</Text>
        <Text style={styles.eventDate}>{date}</Text>
      </View>

      {/* Live Indicator */}
      {showLiveIndicator && (
        <View style={styles.liveIndicator}>
          {isLive ? (
            <>
              <Animated.View style={[styles.liveDot, { transform: [{ scale: pulseAnim }] }]}>
                <View style={styles.liveDotInner} />
              </Animated.View>
              <Text style={styles.liveText}>LIVE AGENDA</Text>
              {lastUpdated && (
                <Text style={styles.lastUpdatedText}>
                  Last updated: {new Date(lastUpdated).toLocaleTimeString()}
                </Text>
              )}
            </>
          ) : (
            <>
              <MaterialIcons name="lightbulb" size={16} color="#FFFFFF" />
              <Text style={styles.liveText}>Live agenda available starting Nov 12</Text>
              {lastUpdated && (
                <Text style={styles.lastUpdatedText}>
                  Last updated: {new Date(lastUpdated).toLocaleTimeString()}
                </Text>
              )}
            </>
          )}
        </View>
      )}

      {/* Countdown Timer */}
      {showCountdown && !isLive && (
        <View style={styles.countdownContainer}>
          <Text style={styles.countdownLabel}>Event starts in:</Text>
          <View style={styles.countdownTimer}>
            <View style={styles.timeUnit}>
              <Text style={styles.timeValue}>{formatTimeUnit(timeLeft.days)}</Text>
              <Text style={styles.timeLabel}>DAYS</Text>
            </View>
            <Text style={styles.timeSeparator}>:</Text>
            <View style={styles.timeUnit}>
              <Text style={styles.timeValue}>{formatTimeUnit(timeLeft.hours)}</Text>
              <Text style={styles.timeLabel}>HRS</Text>
            </View>
            <Text style={styles.timeSeparator}>:</Text>
            <View style={styles.timeUnit}>
              <Text style={styles.timeValue}>{formatTimeUnit(timeLeft.minutes)}</Text>
              <Text style={styles.timeLabel}>MIN</Text>
            </View>
            <Text style={styles.timeSeparator}>:</Text>
            <View style={styles.timeUnit}>
              <Text style={styles.timeValue}>{formatTimeUnit(timeLeft.seconds)}</Text>
              <Text style={styles.timeLabel}>SEC</Text>
            </View>
          </View>
        </View>
      )}

    </View>
  );
}

const getStyles = (isDark: boolean, colors: any, backgroundColor: string) => StyleSheet.create({
  headerSection: {
    padding: 20,
    paddingTop: (StatusBar.currentHeight || 0) + 100, // Extra top padding to account for nav bar overlay
    backgroundColor: backgroundColor,
    alignItems: 'center',
    minHeight: 360,
    justifyContent: 'center',
    flex: 1,
  },
  mainInfo: {
    alignItems: 'center',
    marginBottom: 16,
  },
  eventTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
    textAlign: 'center',
  },
  eventSubtitle: {
    fontSize: 16,
    color: '#E3F2FD',
    marginBottom: 8,
    textAlign: 'center',
  },
  eventDate: {
    fontSize: 14,
    color: '#BBDEFB',
    textAlign: 'center',
  },
  // Live Indicator Styles
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
  },
  liveDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FF3B30',
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  liveDotInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  liveText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  notLiveText: {
    color: '#BBDEFB',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  lastUpdatedText: {
    color: '#BBDEFB',
    fontSize: 10,
    marginTop: 2,
  },
  // Countdown Styles
  countdownContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  countdownLabel: {
    color: '#E3F2FD',
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '500',
  },
  countdownTimer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeUnit: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    minWidth: 50,
  },
  timeValue: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    lineHeight: 20,
  },
  timeLabel: {
    color: '#BBDEFB',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  timeSeparator: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginHorizontal: 4,
  },
});
