import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Platform, TouchableOpacity } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import LoadingScreen from '../components/LoadingScreen';
import { apiClient } from '@/lib/api-client';

interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version?: string;
  services: {
    database: {
      status: 'healthy' | 'unhealthy';
      responseTime?: number;
      tables: {
        [key: string]: {
          accessible: boolean;
          recordCount?: number;
          error?: string;
        };
      };
    };
    email: {
      status: 'healthy' | 'unhealthy' | 'not_configured';
      configured: boolean;
      error?: string;
    };
    api: {
      status: 'healthy' | 'unhealthy';
      endpoints: {
        [key: string]: {
          accessible: boolean;
          error?: string;
        };
      };
    };
  };
  checks: {
    agenda: {
      hasData: boolean;
      lastUpdated: string | null;
      itemCount: number;
    };
    speakers: {
      count: number;
      accessible: boolean;
    };
    bookings: {
      count: number;
      accessible: boolean;
    };
    passes: {
      count: number;
      accessible: boolean;
    };
  };
}

export default function StatusPage() {
  const { isDark, colors } = useTheme();
  const router = useRouter();
  const [healthCheck, setHealthCheck] = useState<HealthCheck | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStatus = async () => {
    try {
      setError(null);
      
      // Use apiClient with skipEventSegment to access global /api/status endpoint
      const result = await apiClient.request<HealthCheck>('status', {
        skipEventSegment: true,
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch status');
      }

      setHealthCheck(result.data);
    } catch (err: any) {
      console.error('Error fetching status:', err);
      setError(err?.message || 'Failed to fetch status');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStatus();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return '#34A853';
      case 'degraded':
        return '#FF9500';
      case 'unhealthy':
        return '#FF3B30';
      case 'not_configured':
        return '#8E8E93';
      default:
        return '#8E8E93';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'check-circle';
      case 'degraded':
        return 'warning';
      case 'unhealthy':
        return 'error';
      case 'not_configured':
        return 'info';
      default:
        return 'help';
    }
  };

  const formatTimestamp = (timestamp: string | null) => {
    if (!timestamp) return 'Never';
    try {
      const date = new Date(timestamp);
      return date.toLocaleString();
    } catch {
      return timestamp;
    }
  };

  if (loading && !healthCheck) {
    return <LoadingScreen />;
  }

  const styles = getStyles(isDark, colors);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <MaterialIcons name="arrow-back" size={24} color={typeof colors.text === 'string' ? colors.text : colors.text?.primary || '#000000'} />
        </TouchableOpacity>
        <Text style={styles.title}>System Status</Text>
        <View style={styles.placeholder} />
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={24} color="#FF3B30" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {healthCheck && (
        <>
          {/* Overall Status */}
          <View style={styles.section}>
            <View style={styles.statusHeader}>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(healthCheck.status) },
                ]}
              >
                <MaterialIcons
                  name={getStatusIcon(healthCheck.status) as any}
                  size={20}
                  color="#FFFFFF"
                />
                <Text style={styles.statusBadgeText}>
                  {healthCheck.status.toUpperCase()}
                </Text>
              </View>
              <Text style={styles.timestamp}>
                Last updated: {formatTimestamp(healthCheck.timestamp)}
              </Text>
            </View>
          </View>

          {/* Database Status */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Database</Text>
            <View
              style={[
                styles.serviceCard,
                {
                  borderLeftColor: getStatusColor(
                    healthCheck.services.database.status
                  ),
                },
              ]}
            >
              <View style={styles.serviceHeader}>
                <MaterialIcons
                  name={getStatusIcon(healthCheck.services.database.status) as any}
                  size={20}
                  color={getStatusColor(healthCheck.services.database.status)}
                />
                <Text style={styles.serviceStatus}>
                  {healthCheck.services.database.status.toUpperCase()}
                </Text>
                {healthCheck.services.database.responseTime && (
                  <Text style={styles.responseTime}>
                    {healthCheck.services.database.responseTime}ms
                  </Text>
                )}
              </View>
              <View style={styles.tablesContainer}>
                {Object.entries(healthCheck.services.database.tables).map(
                  ([tableName, table]) => (
                    <View key={tableName} style={styles.tableRow}>
                      <MaterialIcons
                        name={
                          table.accessible
                            ? ('check-circle' as any)
                            : ('error' as any)
                        }
                        size={16}
                        color={
                          table.accessible
                            ? '#34A853'
                            : '#FF3B30'
                        }
                      />
                      <Text style={styles.tableName}>{tableName}</Text>
                      {table.recordCount !== undefined && (
                        <Text style={styles.tableCount}>
                          {table.recordCount} records
                        </Text>
                      )}
                      {table.error && (
                        <Text style={styles.tableError}>{table.error}</Text>
                      )}
                    </View>
                  )
                )}
              </View>
            </View>
          </View>

          {/* Email Service */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Email Service</Text>
            <View
              style={[
                styles.serviceCard,
                {
                  borderLeftColor: getStatusColor(
                    healthCheck.services.email.status
                  ),
                },
              ]}
            >
              <View style={styles.serviceHeader}>
                <MaterialIcons
                  name={getStatusIcon(healthCheck.services.email.status) as any}
                  size={20}
                  color={getStatusColor(healthCheck.services.email.status)}
                />
                <Text style={styles.serviceStatus}>
                  {healthCheck.services.email.status
                    .toUpperCase()
                    .replace('_', ' ')}
                </Text>
              </View>
              <Text style={styles.serviceDetail}>
                Configured: {healthCheck.services.email.configured ? 'Yes' : 'No'}
              </Text>
            </View>
          </View>

          {/* API Endpoints */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>API Endpoints</Text>
            <View
              style={[
                styles.serviceCard,
                {
                  borderLeftColor: getStatusColor(
                    healthCheck.services.api.status
                  ),
                },
              ]}
            >
              <View style={styles.serviceHeader}>
                <MaterialIcons
                  name={getStatusIcon(healthCheck.services.api.status) as any}
                  size={20}
                  color={getStatusColor(healthCheck.services.api.status)}
                />
                <Text style={styles.serviceStatus}>
                  {healthCheck.services.api.status.toUpperCase()}
                </Text>
              </View>
              <View style={styles.endpointsContainer}>
                {Object.entries(healthCheck.services.api.endpoints).map(
                  ([endpoint, endpointStatus]) => (
                    <View key={endpoint} style={styles.endpointRow}>
                      <MaterialIcons
                        name={
                          endpointStatus.accessible
                            ? ('check-circle' as any)
                            : ('error' as any)
                        }
                        size={16}
                        color={
                          endpointStatus.accessible
                            ? '#34A853'
                            : '#FF3B30'
                        }
                      />
                      <Text style={styles.endpointName}>{endpoint}</Text>
                    </View>
                  )
                )}
              </View>
            </View>
          </View>

          {/* System Checks */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>System Checks</Text>
            <View style={styles.checksContainer}>
              <View style={styles.checkCard}>
                <Text style={styles.checkTitle}>Agenda</Text>
                <Text style={styles.checkDetail}>
                  {healthCheck.checks.agenda.hasData ? 'Has Data' : 'No Data'}
                </Text>
                <Text style={styles.checkDetail}>
                  Items: {healthCheck.checks.agenda.itemCount}
                </Text>
                {healthCheck.checks.agenda.lastUpdated && (
                  <Text style={styles.checkDetail}>
                    Updated: {formatTimestamp(healthCheck.checks.agenda.lastUpdated)}
                  </Text>
                )}
              </View>

              <View style={styles.checkCard}>
                <Text style={styles.checkTitle}>Speakers</Text>
                <Text style={styles.checkDetail}>
                  {healthCheck.checks.speakers.accessible ? 'Accessible' : 'Not Accessible'}
                </Text>
                <Text style={styles.checkDetail}>
                  Count: {healthCheck.checks.speakers.count}
                </Text>
              </View>

              <View style={styles.checkCard}>
                <Text style={styles.checkTitle}>Bookings</Text>
                <Text style={styles.checkDetail}>
                  {healthCheck.checks.bookings.accessible ? 'Accessible' : 'Not Accessible'}
                </Text>
                <Text style={styles.checkDetail}>
                  Count: {healthCheck.checks.bookings.count}
                </Text>
              </View>

              <View style={styles.checkCard}>
                <Text style={styles.checkTitle}>Passes</Text>
                <Text style={styles.checkDetail}>
                  {healthCheck.checks.passes.accessible ? 'Accessible' : 'Not Accessible'}
                </Text>
                <Text style={styles.checkDetail}>
                  Count: {healthCheck.checks.passes.count}
                </Text>
              </View>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Status page auto-refreshes every 30 seconds
            </Text>
            <Text style={styles.footerText}>
              Pull down to refresh manually
            </Text>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const getStyles = (isDark: boolean, colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? '#000000' : '#F2F2F7',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 20,
      paddingTop: Platform.OS === 'web' ? 20 : 60,
      backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
      borderBottomWidth: 1,
      borderBottomColor: isDark ? '#38383A' : '#E5E5EA',
    },
    backButton: {
      padding: 8,
    },
    placeholder: {
      width: 40,
    },
    title: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
    },
    errorContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      margin: 16,
      backgroundColor: '#FFEBEE',
      borderRadius: 8,
      gap: 8,
    },
    errorText: {
      color: '#FF3B30',
      fontSize: 14,
    },
    section: {
      padding: 16,
    },
    statusHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      gap: 6,
    },
    statusBadgeText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '700',
    },
    timestamp: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 12,
    },
    serviceCard: {
      backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
      borderRadius: 12,
      padding: 16,
      borderLeftWidth: 4,
      marginBottom: 12,
    },
    serviceHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 12,
    },
    serviceStatus: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
    responseTime: {
      fontSize: 12,
      color: colors.textSecondary,
      marginLeft: 'auto',
    },
    serviceDetail: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 4,
    },
    tablesContainer: {
      gap: 8,
    },
    tableRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 4,
    },
    tableName: {
      fontSize: 14,
      color: colors.text,
      flex: 1,
    },
    tableCount: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    tableError: {
      fontSize: 12,
      color: '#FF3B30',
    },
    endpointsContainer: {
      gap: 8,
    },
    endpointRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 4,
    },
    endpointName: {
      fontSize: 14,
      color: colors.text,
      fontFamily: Platform.OS === 'web' ? 'monospace' : 'monospace',
    },
    checksContainer: {
      gap: 12,
    },
    checkCard: {
      backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
      borderRadius: 12,
      padding: 16,
      borderLeftWidth: 4,
      borderLeftColor: '#007AFF',
    },
    checkTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 8,
    },
    checkDetail: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 4,
    },
    footer: {
      padding: 20,
      alignItems: 'center',
    },
    footerText: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 4,
    },
  });

