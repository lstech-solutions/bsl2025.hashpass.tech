import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Linking } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { versionService } from '../lib/services/version-service';

type VersionInfo = ReturnType<typeof versionService.getCurrentVersion>;

interface VersionDisplayProps {
  showInSidebar?: boolean;
  compact?: boolean;
}

export default function VersionDisplay({ showInSidebar = false, compact = false }: VersionDisplayProps) {
  const { isDark, colors } = useTheme();
  const [showDetails, setShowDetails] = useState(false);
  const styles = getStyles(isDark, colors);

  const versionInfo = versionService.getCurrentVersion();
  const buildInfo = versionService.getBuildInfo();
  const versionHistory = versionService.getVersionHistory();
  const badgeInfo = versionService.getVersionBadgeInfo(versionInfo.releaseType);

  const VersionBadge = () => (
    <View style={[styles.versionBadge, { backgroundColor: badgeInfo.color }]}>
      <Text style={styles.versionBadgeText}>{badgeInfo.text}</Text>
    </View>
  );

  const VersionDetailsModal = () => (
    <Modal
      visible={showDetails}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowDetails(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Version Information</Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setShowDetails(false)}
          >
            <MaterialIcons name="close" size={24} color={colors.text.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
          {/* Current Version */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Current Version</Text>
            <View style={styles.versionCard}>
              <View style={styles.versionHeader}>
                <Text style={styles.versionNumber}>v{versionInfo.version}</Text>
                <VersionBadge />
              </View>
              <Text style={styles.versionDate}>Released: {versionInfo.releaseDate}</Text>
              <Text style={styles.versionNotes}>{versionInfo.notes}</Text>
              
              {buildInfo && (
                <View style={styles.buildInfo}>
                  <Text style={styles.buildLabel}>Build Information:</Text>
                  <Text style={styles.buildText}>Build ID: {buildInfo.buildId}</Text>
                  <Text style={styles.buildText}>Build Time: {new Date(buildInfo.buildTime).toLocaleString()}</Text>
                  <View style={styles.buildRow}>
                    <Text style={styles.buildText}>Git Commit: </Text>
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
                  <Text style={styles.buildText}>Branch: {buildInfo.gitBranch}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Features */}
          {versionInfo.features.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>New Features</Text>
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
              <Text style={styles.sectionTitle}>Bug Fixes</Text>
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
              <Text style={styles.sectionTitle}>Breaking Changes</Text>
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
            <Text style={styles.sectionTitle}>Version History</Text>
            {versionHistory.slice(0, 5).map((version, index) => (
              <View key={version.version} style={styles.historyItem}>
                <View style={styles.historyHeader}>
                  <Text style={styles.historyVersion}>v{version.version}</Text>
                  <Text style={styles.historyDate}>{version.releaseDate}</Text>
                </View>
                <Text style={styles.historyNotes}>{version.notes}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );

  if (compact) {
    return (
      <TouchableOpacity
        style={styles.compactContainer}
        onPress={() => setShowDetails(true)}
      >
        <Text style={styles.compactText}>v{versionInfo.version}</Text>
        <VersionBadge />
        <VersionDetailsModal />
      </TouchableOpacity>
    );
  }

  if (showInSidebar) {
    return (
      <View style={styles.sidebarContainer}>
        <TouchableOpacity
          style={styles.sidebarVersionContainer}
          onPress={() => setShowDetails(true)}
        >
          <View style={styles.sidebarVersionInfo}>
            <Text style={styles.sidebarVersionText}>v{versionInfo.version}</Text>
            <VersionBadge />
          </View>
          <MaterialIcons name="info-outline" size={16} color={colors.text.secondary} />
        </TouchableOpacity>
        <VersionDetailsModal />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.versionContainer}
        onPress={() => setShowDetails(true)}
      >
        <View style={styles.versionInfo}>
          <Text style={styles.versionText}>v{versionInfo.version}</Text>
          <VersionBadge />
        </View>
        <MaterialIcons name="info-outline" size={20} color={colors.text.secondary} />
      </TouchableOpacity>
      <VersionDetailsModal />
    </View>
  );
}

const getStyles = (isDark: boolean, colors: any) => StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  sidebarContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  versionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  sidebarVersionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  versionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sidebarVersionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  versionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginRight: 8,
  },
  sidebarVersionText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.text.secondary,
    marginRight: 6,
  },
  compactText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.text.secondary,
    marginRight: 6,
  },
  versionBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  versionBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
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
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 12,
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
  },
  versionNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary,
    marginRight: 12,
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
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
    borderRadius: 8,
    padding: 12,
  },
  buildLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.secondary,
    marginBottom: 6,
  },
  buildText: {
    fontSize: 12,
    color: colors.text.secondary,
    marginBottom: 2,
  },
  buildRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  linkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  linkText: {
    fontSize: 12,
    color: colors.primary,
    textDecorationLine: 'underline',
  },
  linkIcon: {
    marginLeft: 4,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingLeft: 4,
  },
  featureText: {
    fontSize: 14,
    color: colors.text.primary,
    marginLeft: 8,
    flex: 1,
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
  historyVersion: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  historyDate: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  historyNotes: {
    fontSize: 12,
    color: colors.text.secondary,
    lineHeight: 16,
  },
});
