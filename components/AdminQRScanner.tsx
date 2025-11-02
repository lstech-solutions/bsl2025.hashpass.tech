import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Alert, ActivityIndicator, ScrollView, Platform } from 'react-native';
import { BarCodeScanner, BarCodeScannerResult } from 'expo-barcode-scanner';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../hooks/useAuth';
import { qrSystemService, QRScanResult, QRCode } from '../lib/qr-system';
import { isAdmin } from '../lib/admin-utils';
import { cameraPermissionManager } from '../lib/camera-permissions';

interface AdminQRScannerProps {
  visible: boolean;
  onClose: () => void;
  onScanSuccess?: (result: QRScanResult) => void;
}

export default function AdminQRScanner({
  visible,
  onClose,
  onScanSuccess,
}: AdminQRScannerProps) {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanResult, setScanResult] = useState<QRScanResult | null>(null);
  const [qrDetails, setQrDetails] = useState<QRCode | null>(null);
  const [isUserAdmin, setIsUserAdmin] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const styles = getStyles(isDark, colors);

  useEffect(() => {
    if (visible && user) {
      checkAdminStatus();
      checkPermissionStatus();
      setScanned(false);
      setScanResult(null);
      setQrDetails(null);
      setShowDetails(false);
    }
  }, [visible, user]);

  const checkPermissionStatus = async () => {
    try {
      const result = await cameraPermissionManager.getPermissionStatus();
      setHasPermission(result.status === 'granted');
      
      // If not granted and can ask, request it
      if (result.status !== 'granted' && result.canAskAgain) {
        requestCameraPermission();
      }
    } catch (error) {
      console.error('Error checking permission status:', error);
      // Fallback to requesting
      requestCameraPermission();
    }
  };

  const checkAdminStatus = async () => {
    if (!user) return;
    const admin = await isAdmin(user.id);
    setIsUserAdmin(admin);
  };

  const requestCameraPermission = async () => {
    try {
      // Use permission manager for better handling
      const result = await cameraPermissionManager.requestWithFallback();
      
      if (result.status === 'granted') {
        setHasPermission(true);
      } else if (result.status === 'blocked' || (result.status === 'denied' && !result.canAskAgain)) {
        // Permission is blocked - show settings option
        setHasPermission(false);
      } else {
        setHasPermission(false);
      }
    } catch (error) {
      console.error('Error requesting camera permission:', error);
      setHasPermission(false);
    }
  };

  const handleBarCodeScanned = async ({ type, data }: BarCodeScannerResult) => {
    if (scanned || isProcessing) return;

    setScanned(true);
    setIsProcessing(true);

    try {
      let token: string;
      
      try {
        const parsed = JSON.parse(data);
        token = parsed.token || parsed.type === 'hashpass_qr' ? parsed.token : data;
      } catch {
        if (data.includes('token=')) {
          const urlParams = new URLSearchParams(data.split('?')[1]);
          token = urlParams.get('token') || data;
        } else {
          token = data;
        }
      }

      // Validate QR code
      const result = await qrSystemService.validateAndUseQR(
        token,
        user?.id,
        'admin-scanner'
      );

      setScanResult(result);

      // Fetch full QR details for admin view
      if (result.valid) {
        const qr = await qrSystemService.getQRByToken(token);
        setQrDetails(qr);
        setShowDetails(true);
      }

      if (result.valid) {
        if (onScanSuccess) {
          onScanSuccess(result);
        }
      }
    } catch (error: any) {
      console.error('Error scanning QR:', error);
      Alert.alert('Error', error.message || 'Error processing QR code', [
        { text: 'Try Again', onPress: resetScanner },
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  const resetScanner = () => {
    setScanned(false);
    setIsProcessing(false);
    setScanResult(null);
    setQrDetails(null);
    setShowDetails(false);
  };

  const handleRevoke = async () => {
    if (!scanResult || !qrDetails || !user) return;

    Alert.alert(
      'Revoke QR Code',
      'Are you sure you want to revoke this QR code?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke',
          style: 'destructive',
          onPress: async () => {
            const success = await qrSystemService.revokeQR(
              qrDetails.token,
              user.id,
              'Revoked by admin via scanner'
            );
            if (success) {
              Alert.alert('Success', 'QR code has been revoked');
              resetScanner();
            } else {
              Alert.alert('Error', 'Failed to revoke QR code');
            }
          },
        },
      ]
    );
  };

  const handleSuspend = async () => {
    if (!scanResult || !qrDetails || !user) return;

    const success = await qrSystemService.suspendQR(qrDetails.token, user.id);
    if (success) {
      Alert.alert('Success', 'QR code has been suspended');
      resetScanner();
    } else {
      Alert.alert('Error', 'Failed to suspend QR code');
    }
  };

  if (!visible) return null;

  if (!isUserAdmin) {
    return (
      <Modal visible={visible} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Ionicons name="shield-outline" size={64} color={colors.error} />
            <Text style={styles.errorTitle}>Admin Access Required</Text>
            <Text style={styles.errorText}>
              You need admin privileges to use the admin QR scanner.
            </Text>
            <TouchableOpacity style={styles.button} onPress={onClose}>
              <Text style={styles.buttonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  if (hasPermission === null) {
    return (
      <Modal visible={visible} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.permissionText}>Requesting camera permission...</Text>
          </View>
        </View>
      </Modal>
    );
  }

  if (hasPermission === false) {
    return (
      <Modal visible={visible} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Ionicons name="camera-outline" size={64} color={colors.error} />
            <Text style={styles.errorTitle}>Camera Permission Required</Text>
            <Text style={styles.errorText}>
              {Platform.OS === 'web' 
                ? 'Please enable camera permissions in your browser settings to scan QR codes.'
                : 'Please enable camera permissions in your device settings to scan QR codes.'}
            </Text>
            <TouchableOpacity 
              style={styles.button} 
              onPress={async () => {
                const result = await cameraPermissionManager.requestWithFallback();
                if (result.status === 'blocked' || (result.status === 'denied' && !result.canAskAgain)) {
                  cameraPermissionManager.showSettingsAlert(() => cameraPermissionManager.openSettings());
                } else {
                  requestCameraPermission();
                }
              }}
            >
              <Text style={styles.buttonText}>Grant Permission</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.button, styles.buttonSecondary]} 
              onPress={async () => {
                const opened = await cameraPermissionManager.openSettings();
                // If on web and settings couldn't be opened, instructions are already shown
                if (!opened && Platform.OS !== 'web') {
                  cameraPermissionManager.showSettingsAlert();
                }
              }}
            >
              <Text style={[styles.buttonText, styles.buttonTextSecondary]}>
                {Platform.OS === 'web' ? 'Show Instructions' : 'Open Settings'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.buttonSecondary]} onPress={onClose}>
              <Text style={[styles.buttonText, styles.buttonTextSecondary]}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalContainer}>
        <View style={styles.scannerContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <Text style={styles.title}>Admin QR Scanner</Text>
              <Text style={styles.description}>Scan QR codes with admin controls</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={28} color={colors.text.primary} />
            </TouchableOpacity>
          </View>

          {!showDetails ? (
            <>
              {/* Scanner View */}
              <View style={styles.scannerWrapper}>
                <BarCodeScanner
                  onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
                  style={StyleSheet.absoluteFillObject}
                  barCodeTypes={[BarCodeScanner.Constants.BarCodeType.qr]}
                />

                {/* Overlay */}
                <View style={styles.overlay}>
                  <View style={styles.overlayTop} />
                  <View style={styles.overlayMiddle}>
                    <View style={styles.overlaySide} />
                    <View style={styles.scanFrame}>
                      <View style={[styles.corner, styles.topLeft]} />
                      <View style={[styles.corner, styles.topRight]} />
                      <View style={[styles.corner, styles.bottomLeft]} />
                      <View style={[styles.corner, styles.bottomRight]} />
                    </View>
                    <View style={styles.overlaySide} />
                  </View>
                  <View style={styles.overlayBottom}>
                    {isProcessing && (
                      <View style={styles.processingContainer}>
                        <ActivityIndicator size="large" color={colors.primary} />
                        <Text style={styles.processingText}>Processing...</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>

              {/* Instructions */}
              <View style={styles.instructions}>
                <Text style={styles.instructionText}>
                  Position the QR code within the frame to scan
                </Text>
                {scanned && !isProcessing && (
                  <TouchableOpacity style={styles.resetButton} onPress={resetScanner}>
                    <Text style={styles.resetButtonText}>Scan Again</Text>
                  </TouchableOpacity>
                )}
              </View>
            </>
          ) : (
            /* QR Details View */
            <ScrollView style={styles.detailsContainer} contentContainerStyle={styles.detailsContent}>
              <View style={styles.detailsHeader}>
                <Ionicons 
                  name={scanResult?.valid ? "checkmark-circle" : "close-circle"} 
                  size={48} 
                  color={scanResult?.valid ? colors.success : colors.error} 
                />
                <Text style={styles.detailsTitle}>
                  {scanResult?.valid ? 'Valid QR Code' : 'Invalid QR Code'}
                </Text>
                <Text style={styles.detailsStatus}>{scanResult?.message}</Text>
              </View>

              {qrDetails && (
                <View style={styles.detailsSection}>
                  <Text style={styles.sectionTitle}>QR Code Details</Text>
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Token:</Text>
                    <Text style={styles.detailValue} selectable>{qrDetails.token}</Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Type:</Text>
                    <Text style={styles.detailValue}>{qrDetails.qr_type}</Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Status:</Text>
                    <Text style={[styles.detailValue, { color: getStatusColor(qrDetails.status) }]}>
                      {qrDetails.status.toUpperCase()}
                    </Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Usage:</Text>
                    <Text style={styles.detailValue}>
                      {qrDetails.usage_count} / {qrDetails.max_uses}
                    </Text>
                  </View>
                  
                  {qrDetails.expires_at && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Expires:</Text>
                      <Text style={styles.detailValue}>
                        {new Date(qrDetails.expires_at).toLocaleString()}
                      </Text>
                    </View>
                  )}
                  
                  {qrDetails.pass_id && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Pass ID:</Text>
                      <Text style={styles.detailValue} selectable>{qrDetails.pass_id}</Text>
                    </View>
                  )}
                  
                  {qrDetails.display_data && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Pass Number:</Text>
                      <Text style={styles.detailValue}>
                        {qrDetails.display_data.pass_number || 'N/A'}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* Admin Actions */}
              {scanResult?.valid && qrDetails && qrDetails.status === 'active' && (
                <View style={styles.actionsSection}>
                  <Text style={styles.sectionTitle}>Admin Actions</Text>
                  
                  <TouchableOpacity style={[styles.actionButton, styles.suspendButton]} onPress={handleSuspend}>
                    <MaterialIcons name="pause-circle-outline" size={20} color="#FF9500" />
                    <Text style={styles.actionButtonText}>Suspend QR</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity style={[styles.actionButton, styles.revokeButton]} onPress={handleRevoke}>
                    <MaterialIcons name="block" size={20} color={colors.error} />
                    <Text style={[styles.actionButtonText, { color: colors.error }]}>Revoke QR</Text>
                  </TouchableOpacity>
                </View>
              )}

              <View style={styles.buttonGroup}>
                <TouchableOpacity style={styles.resetButton} onPress={resetScanner}>
                  <Text style={styles.resetButtonText}>Scan Another</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.resetButton, styles.closeButtonFull]} onPress={onClose}>
                  <Text style={styles.resetButtonText}>Close</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'active': return '#34A853';
    case 'used': return '#8E8E93';
    case 'expired': return '#FF9500';
    case 'revoked': return '#FF3B30';
    case 'suspended': return '#FF9500';
    default: return '#8E8E93';
  }
};

const getStyles = (isDark: boolean, colors: any) =>
  StyleSheet.create({
    modalContainer: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      backgroundColor: colors.background.paper,
      borderRadius: 16,
      padding: 24,
      alignItems: 'center',
      minWidth: 300,
    },
    scannerContainer: {
      flex: 1,
      width: '100%',
      backgroundColor: 'transparent',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 20,
      paddingTop: 60,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
    },
    headerContent: {
      flex: 1,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: '#FFFFFF',
      marginBottom: 4,
    },
    description: {
      fontSize: 14,
      color: 'rgba(255, 255, 255, 0.8)',
    },
    closeButton: {
      padding: 8,
      borderRadius: 20,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
    },
    scannerWrapper: {
      flex: 1,
      position: 'relative',
    },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'center',
      alignItems: 'center',
    },
    overlayTop: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      width: '100%',
    },
    overlayMiddle: {
      flexDirection: 'row',
      width: '100%',
    },
    overlaySide: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
    },
    scanFrame: {
      width: 250,
      height: 250,
      position: 'relative',
    },
    corner: {
      position: 'absolute',
      width: 30,
      height: 30,
      borderColor: colors.primary,
      borderWidth: 4,
    },
    topLeft: {
      top: 0,
      left: 0,
      borderRightWidth: 0,
      borderBottomWidth: 0,
    },
    topRight: {
      top: 0,
      right: 0,
      borderLeftWidth: 0,
      borderBottomWidth: 0,
    },
    bottomLeft: {
      bottom: 0,
      left: 0,
      borderRightWidth: 0,
      borderTopWidth: 0,
    },
    bottomRight: {
      bottom: 0,
      right: 0,
      borderLeftWidth: 0,
      borderTopWidth: 0,
    },
    overlayBottom: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      width: '100%',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    processingContainer: {
      alignItems: 'center',
    },
    processingText: {
      color: '#FFFFFF',
      marginTop: 12,
      fontSize: 16,
    },
    instructions: {
      padding: 20,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      alignItems: 'center',
    },
    instructionText: {
      color: '#FFFFFF',
      fontSize: 14,
      textAlign: 'center',
      marginBottom: 12,
    },
    resetButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 8,
    },
    resetButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
    permissionText: {
      marginTop: 16,
      fontSize: 16,
      color: colors.text.primary,
      textAlign: 'center',
    },
    errorTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.text.primary,
      marginTop: 16,
      marginBottom: 8,
    },
    errorText: {
      fontSize: 14,
      color: colors.text.secondary,
      textAlign: 'center',
      marginBottom: 16,
    },
    button: {
      backgroundColor: colors.primary,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 8,
      marginTop: 8,
      width: '100%',
      alignItems: 'center',
    },
    buttonSecondary: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: colors.divider,
    },
    buttonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
    buttonTextSecondary: {
      color: colors.text.primary,
    },
    detailsContainer: {
      flex: 1,
      backgroundColor: colors.background.paper,
    },
    detailsContent: {
      padding: 20,
    },
    detailsHeader: {
      alignItems: 'center',
      marginBottom: 24,
      paddingBottom: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.divider,
    },
    detailsTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.text.primary,
      marginTop: 12,
      marginBottom: 8,
    },
    detailsStatus: {
      fontSize: 14,
      color: colors.text.secondary,
      textAlign: 'center',
    },
    detailsSection: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text.primary,
      marginBottom: 12,
    },
    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.divider,
    },
    detailLabel: {
      fontSize: 14,
      color: colors.text.secondary,
      fontWeight: '500',
    },
    detailValue: {
      fontSize: 14,
      color: colors.text.primary,
      fontWeight: '600',
      flex: 1,
      textAlign: 'right',
    },
    actionsSection: {
      marginBottom: 24,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
      borderRadius: 8,
      marginBottom: 12,
      backgroundColor: colors.background.secondary,
    },
    suspendButton: {
      borderWidth: 1,
      borderColor: '#FF9500',
    },
    revokeButton: {
      borderWidth: 1,
      borderColor: colors.error,
    },
    actionButtonText: {
      marginLeft: 8,
      fontSize: 16,
      fontWeight: '600',
      color: colors.text.primary,
    },
    buttonGroup: {
      flexDirection: 'row',
      gap: 12,
    },
    closeButtonFull: {
      backgroundColor: colors.background.secondary,
      flex: 1,
    },
  });

