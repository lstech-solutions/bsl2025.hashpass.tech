import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Modal, ScrollView, Linking } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { versionService } from '../lib/services/version-service';
import { t } from '@lingui/macro';

interface VersionStatusIndicatorProps {
  compact?: boolean;
  showVersion?: boolean;
  size?: 'small' | 'medium' | 'large';
}

type StatusState = 'healthy' | 'degraded' | 'unhealthy' | 'checking' | 'unknown';

export default function VersionStatusIndicator({ 
  compact = false, 
  showVersion = true,
  size = 'medium'
}: VersionStatusIndicatorProps) {
  const { isDark, colors } = useTheme();
  const [status, setStatus] = useState<StatusState>('checking');
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const [showModal, setShowModal] = useState(false);
  const styles = getStyles(isDark, colors, size);

  const versionInfo = versionService.getCurrentVersion();
  const buildInfo = versionService.getBuildInfo();
  const versionHistory = versionService.getVersionHistory();
  const badgeInfo = versionService.getVersionBadgeInfo(versionInfo.releaseType);

  useEffect(() => {
    checkStatus();
    // Check status every 30 seconds
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const checkStatus = async () => {
    try {
      setStatus('checking');
      const response = await fetch('https://api.hashpass.tech/api/status', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStatus(data.status || 'unknown');
      } else {
        setStatus('unhealthy');
      }
      setLastCheck(new Date());
    } catch (error) {
      console.error('Status check failed:', error);
      setStatus('unhealthy');
      setLastCheck(new Date());
    }
  };

  const getStatusColor = (): string => {
    switch (status) {
      case 'healthy':
        return '#4CAF50'; // Green
      case 'degraded':
        return '#FF9800'; // Orange
      case 'unhealthy':
        return '#F44336'; // Red
      case 'checking':
        return '#9E9E9E'; // Gray
      default:
        return '#9E9E9E'; // Gray
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'healthy':
        return 'check-circle';
      case 'degraded':
        return 'warning';
      case 'unhealthy':
        return 'error';
      case 'checking':
        return 'sync';
      default:
        return 'help-outline';
    }
  };

  const handlePress = () => {
    setShowModal(true);
  };

  const VersionDetailsModal = () => (
    <Modal
      visible={showModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowModal(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <View style={styles.modalTitleContainer}>
            <Text style={styles.modalTitle}>{t({ id: 'version.title', message: 'Version Information' })}</Text>
            <View style={styles.headerStatusContainer}>
              {status === 'checking' ? (
                <ActivityIndicator size="small" color={getStatusColor()} />
              ) : (
                <View style={[styles.headerStatusLight, { backgroundColor: getStatusColor() }]} />
              )}
            </View>
          </View>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setShowModal(false)}
          >
            <MaterialIcons name="close" size={24} color={colors.text.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
          {/* Current Version */}
          <View style={styles.section}>
            <View style={styles.sectionTitleContainer}>
              <Text style={styles.sectionTitle}>{t({ id: 'version.current', message: 'Current Version' })}</Text>
              <View style={styles.titleStatusContainer}>
                {status === 'checking' ? (
                  <ActivityIndicator size="small" color={getStatusColor()} />
                ) : (
                  <View style={[styles.titleStatusLight, { backgroundColor: getStatusColor() }]} />
                )}
              </View>
            </View>
            <View style={styles.versionCard}>
              <View style={styles.versionHeader}>
                <Text style={styles.versionNumber}>v{versionInfo.version}</Text>
                <View style={[styles.versionBadge, { backgroundColor: badgeInfo.color }]}>
                  <Text style={styles.versionBadgeText}>{badgeInfo.text}</Text>
                </View>
              </View>
              <Text style={styles.versionDate}>{t({ id: 'version.released', message: 'Released:' })} {versionInfo.releaseDate}</Text>
              <Text style={styles.versionNotes}>{versionInfo.notes}</Text>
              
              {buildInfo && (
                <View style={styles.buildInfo}>
                  <Text style={styles.buildLabel}>{t({ id: 'version.buildInfo', message: 'Build Information:' })}</Text>
                  <Text style={styles.buildText}>{t({ id: 'version.buildId', message: 'Build ID:' })} {buildInfo.buildId}</Text>
                  <Text style={styles.buildText}>{t({ id: 'version.buildTime', message: 'Build Time:' })} {new Date(buildInfo.buildTime).toLocaleString()}</Text>
                  <View style={styles.buildRow}>
                    <Text style={styles.buildText}>{t({ id: 'version.gitCommit', message: 'Git Commit:' })} </Text>
                    {buildInfo.gitCommitUrl && buildInfo.gitCommit !== 'unknown' ? (
                      <TouchableOpacity
                        onPress={() => Linking.openURL(buildInfo.gitCommitUrl)}
                        style={styles.linkContainer}
                      >
                        <Text style={styles.linkText}>{buildInfo.gitCommit}</Text>
                        <MaterialIcons name="open-in-new" size={14} color={colors.primary} style={styles.linkIcon} />
                      </TouchableOpacity>
                    ) : (
                      <Text style={styles.buildText}>{buildInfo.gitCommit}</Text>
                    )}
                  </View>
                  <Text style={styles.buildText}>{t({ id: 'version.branch', message: 'Branch:' })} {buildInfo.gitBranch}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Features */}
          {versionInfo.features.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t({ id: 'version.features', message: 'New Features' })}</Text>
              {versionInfo.features.map((feature, index) => (
                <View key={index} style={styles.featureItem}>
                  <MaterialIcons name="check-circle" size={16} color="#34A853" />
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Bug Fixes */}
          {versionInfo.bugfixes.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t({ id: 'version.bugfixes', message: 'Bug Fixes' })}</Text>
              {versionInfo.bugfixes.map((fix, index) => (
                <View key={index} style={styles.featureItem}>
                  <MaterialIcons name="bug-report" size={16} color="#FF9500" />
                  <Text style={styles.featureText}>{fix}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Breaking Changes */}
          {versionInfo.breakingChanges.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t({ id: 'version.breakingChanges', message: 'Breaking Changes' })}</Text>
              {versionInfo.breakingChanges.map((change, index) => (
                <View key={index} style={styles.featureItem}>
                  <MaterialIcons name="warning" size={16} color="#FF3B30" />
                  <Text style={styles.featureText}>{change}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Version History */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t({ id: 'version.history', message: 'Version History' })}</Text>
            {versionHistory.slice(0, 5).map((version) => {
              const tagUrl = buildInfo?.gitRepoUrl 
                ? `${buildInfo.gitRepoUrl}/releases/tag/v${version.version}`
                : null;
              
              return (
                <View key={version.version} style={styles.historyItem}>
                  <View style={styles.historyHeader}>
                    <View style={styles.historyVersionContainer}>
                      {tagUrl ? (
                        <TouchableOpacity
                          onPress={() => Linking.openURL(tagUrl)}
                          style={styles.historyLinkContainer}
                        >
                          <Text style={styles.historyVersion}>v{version.version}</Text>
                          <MaterialIcons name="open-in-new" size={14} color={colors.primary} style={styles.historyLinkIcon} />
                        </TouchableOpacity>
                      ) : (
                        <Text style={styles.historyVersion}>v{version.version}</Text>
                      )}
                    </View>
                    <Text style={styles.historyDate}>{version.releaseDate}</Text>
                  </View>
                  <Text style={styles.historyNotes}>{version.notes}</Text>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );

  if (compact) {
    return (
      <>
        <TouchableOpacity
          style={styles.compactContainer}
          onPress={handlePress}
          activeOpacity={0.7}
        >
          <View style={[styles.statusLight, { backgroundColor: getStatusColor() }]} />
          {showVersion && (
            <Text style={styles.compactVersionText}>v{versionInfo.version}</Text>
          )}
        </TouchableOpacity>
        <VersionDetailsModal />
      </>
    );
  }

  return (
    <>
      <TouchableOpacity
        style={styles.container}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <View style={styles.content}>
          {showVersion && (
            <Text style={styles.versionText}>v{versionInfo.version}</Text>
          )}
          <View style={styles.statusContainer}>
            {status === 'checking' ? (
              <ActivityIndicator size="small" color={getStatusColor()} />
            ) : (
              <View style={[styles.statusLight, { backgroundColor: getStatusColor() }]} />
            )}
          </View>
        </View>
      </TouchableOpacity>
      <VersionDetailsModal />
    </>
  );
}

const getStyles = (isDark: boolean, colors: any, size: 'small' | 'medium' | 'large') => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  versionText: {
    fontSize: size === 'small' ? 10 : size === 'large' ? 14 : 12,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  compactVersionText: {
    fontSize: 10,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusLight: {
    width: size === 'small' ? 8 : size === 'large' ? 12 : 10,
    height: size === 'small' ? 8 : size === 'large' ? 12 : 10,
    borderRadius: size === 'small' ? 4 : size === 'large' ? 6 : 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 3,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background.default,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  modalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
  },
  headerStatusContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerStatusLight: {
    width: 10,
    height: 10,
    borderRadius: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 3,
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginVertical: 16,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
  },
  titleStatusContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleStatusLight: {
    width: 12,
    height: 12,
    borderRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 3,
  },
  versionCard: {
    backgroundColor: colors.background.paper,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  versionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  versionNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary,
  },
  versionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  versionBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  versionDate: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 8,
  },
  versionNotes: {
    fontSize: 14,
    color: colors.text.primary,
    lineHeight: 20,
    marginBottom: 12,
  },
  buildInfo: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  buildLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.secondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  buildText: {
    fontSize: 12,
    color: colors.text.secondary,
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  buildRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  linkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  linkText: {
    fontSize: 12,
    color: colors.primary,
    fontFamily: 'monospace',
    textDecorationLine: 'underline',
  },
  linkIcon: {
    marginLeft: 2,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 8,
  },
  featureText: {
    flex: 1,
    fontSize: 14,
    color: colors.text.primary,
    lineHeight: 20,
  },
  historyItem: {
    backgroundColor: colors.background.paper,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  historyVersionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyVersion: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  historyLinkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  historyLinkIcon: {
    marginLeft: 2,
  },
  historyDate: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  historyNotes: {
    fontSize: 12,
    color: colors.text.secondary,
    lineHeight: 18,
  },
});

