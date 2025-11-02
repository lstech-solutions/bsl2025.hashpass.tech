import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Alert, ActivityIndicator, Platform } from 'react-native';
import { BarCodeScanner, BarCodeScannerResult } from 'expo-barcode-scanner';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../hooks/useAuth';
import { qrSystemService, QRScanResult } from '../lib/qr-system';
import { cameraPermissionManager } from '../lib/camera-permissions';

interface QRScannerProps {
  visible: boolean;
  onClose: () => void;
  onScanSuccess?: (result: QRScanResult) => void;
  onScanError?: (error: string) => void;
  title?: string;
  description?: string;
}

export default function QRScanner({
  visible,
  onClose,
  onScanSuccess,
  onScanError,
  title = 'Scan QR Code',
  description = 'Position the QR code within the frame',
}: QRScannerProps) {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanResult, setScanResult] = useState<QRScanResult | null>(null);

  const styles = getStyles(isDark, colors);

  useEffect(() => {
    if (visible) {
      // Reset state when modal opens
      setScanned(false);
      setScanResult(null);
      setIsProcessing(false);
      // Check permission status first
      checkPermissionStatus();
    } else {
      // Reset permission state when modal closes
      setHasPermission(null);
    }
  }, [visible]);

  const checkPermissionStatus = async (forceRefresh: boolean = false) => {
    try {
      const result = await cameraPermissionManager.getPermissionStatus(forceRefresh);
      console.log('Permission status:', result);
      
      const isGranted = result.status === 'granted';
      setHasPermission(isGranted);
      
      // If not granted and can ask, don't auto-request - let user click button
      if (!isGranted && result.canAskAgain && result.status !== 'blocked') {
        setHasPermission(false);
      } else if (result.status === 'blocked' || (result.status === 'denied' && !result.canAskAgain)) {
        setHasPermission(false);
      }
      
      return result;
    } catch (error) {
      console.error('Error checking permission status:', error);
      setHasPermission(false);
      return null;
    }
  };

  const requestCameraPermission = async (forceFresh: boolean = true) => {
    try {
      console.log('Requesting camera permission (forceFresh:', forceFresh, ')...');
      setHasPermission(null); // Show loading state
      
      // Check if camera is in use first
      const cameraCheck = await cameraPermissionManager.isCameraInUse();
      if (cameraCheck.inUse) {
        console.warn('Camera is in use:', cameraCheck.message);
        Alert.alert(
          'Camera In Use',
          cameraCheck.message || 'Camera is being used by another application. Please close other apps using the camera and try again.',
          [
            {
              text: 'Retry',
              onPress: () => {
                setTimeout(() => requestCameraPermission(forceFresh), 1000);
              },
            },
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => setHasPermission(false),
            },
          ]
        );
        setHasPermission(false);
        return;
      }
      
      // Use permission manager with force fresh to avoid cache issues
      const result = await cameraPermissionManager.requestWithFallback(forceFresh);
      console.log('Permission request result:', result);
      
      // Check if result indicates camera in use
      if (result.message?.toLowerCase().includes('being used') || result.message?.toLowerCase().includes('in use')) {
        Alert.alert(
          'Camera In Use',
          result.message || 'Camera is being used by another application.',
          [
            {
              text: 'Retry',
              onPress: () => {
                setTimeout(() => requestCameraPermission(forceFresh), 1000);
              },
            },
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => setHasPermission(false),
            },
          ]
        );
        setHasPermission(false);
        return;
      }
      
      if (result.status === 'granted') {
        // Double-check that it's actually working
        const verified = await cameraPermissionManager.getPermissionStatus(true);
        console.log('Verified permission status:', verified);
        setHasPermission(verified.status === 'granted');
      } else if (result.status === 'blocked' || (result.status === 'denied' && !result.canAskAgain)) {
        // Permission is blocked - show settings option
        setHasPermission(false);
        if (Platform.OS === 'web') {
          cameraPermissionManager.showSettingsAlert(() => cameraPermissionManager.openSettings());
        }
      } else {
        setHasPermission(false);
        // Re-check status after request with fresh check
        setTimeout(async () => {
          await checkPermissionStatus(true);
        }, 500);
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
      // Parse QR data - could be JSON or URL
      let token: string;
      
      try {
        // Try parsing as JSON first
        const parsed = JSON.parse(data);
        if (parsed.token) {
          token = parsed.token;
        } else if (parsed.type === 'hashpass_qr' && parsed.token) {
          token = parsed.token;
        } else {
          throw new Error('Invalid QR format');
        }
      } catch {
        // If not JSON, check if it's a URL with token parameter
        if (data.includes('token=')) {
          const urlParams = new URLSearchParams(data.split('?')[1]);
          token = urlParams.get('token') || data;
        } else {
          // Assume the entire data is the token
          token = data;
        }
      }

      // Validate and use QR code
      const result = await qrSystemService.validateAndUseQR(
        token,
        user?.id,
        'mobile-scanner' // Device ID - could be made dynamic
      );

      setScanResult(result);

      if (result.valid) {
        // Fetch QR details to show pass information
        let qrDetails = null;
        try {
          qrDetails = await qrSystemService.getQRByToken(token);
        } catch (e) {
          console.error('Error fetching QR details:', e);
        }

        if (onScanSuccess) {
          onScanSuccess(result);
        } else {
          // Enhanced success handling with pass details
          const passInfo = qrDetails?.display_data;
          const passNumber = passInfo?.pass_number || 'N/A';
          const passType = passInfo?.pass_type || 'N/A';
          
          Alert.alert(
            'QR Code Valid ✓',
            `Pass Number: ${passNumber}\nPass Type: ${passType}\n\n${result.message || 'QR code scanned successfully'}`,
            [
              {
                text: 'OK',
                onPress: () => {
                  resetScanner();
                },
              },
            ]
          );
        }
      } else {
        const errorMessage = result.message || 'Invalid QR code';
        if (onScanError) {
          onScanError(errorMessage);
        } else {
          Alert.alert('QR Code Invalid', errorMessage, [
            {
              text: 'Try Again',
              onPress: () => {
                resetScanner();
              },
            },
            {
              text: 'Close',
              style: 'cancel',
              onPress: onClose,
            },
          ]);
        }
      }
    } catch (error: any) {
      console.error('Error scanning QR:', error);
      const errorMessage = error.message || 'Error processing QR code';
      if (onScanError) {
        onScanError(errorMessage);
      } else {
        Alert.alert('Error', errorMessage, [
          {
            text: 'Try Again',
            onPress: () => {
              resetScanner();
            },
          },
        ]);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const resetScanner = () => {
    setScanned(false);
    setIsProcessing(false);
    setScanResult(null);
  };

  if (!visible) return null;

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
                console.log('Grant Permission button pressed - forcing fresh check');
                await requestCameraPermission(true); // Force fresh to avoid cache
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.buttonText}>Grant Permission</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.button, styles.buttonSecondary]} 
              onPress={async () => {
                console.log('Show Instructions button pressed');
                if (Platform.OS === 'web') {
                  // Show comprehensive instructions directly
                  cameraPermissionManager.showSettingsAlert();
                } else {
                  const opened = await cameraPermissionManager.openSettings();
                  if (!opened) {
                    cameraPermissionManager.showSettingsAlert();
                  }
                }
              }}
              activeOpacity={0.7}
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

  // Don't render scanner if permission is not granted
  if (hasPermission !== true) {
    return null;
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalContainer}>
        <View style={styles.scannerContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.description}>{description}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={28} color={colors.text.primary} />
            </TouchableOpacity>
          </View>

          {/* Scanner View */}
          <View style={styles.scannerWrapper}>
            <BarCodeScanner
              onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
              style={StyleSheet.absoluteFillObject}
              barCodeTypes={[BarCodeScanner.Constants.BarCodeType.qr]}
              onMountError={(error) => {
                console.error('Camera mount error:', error);
                // Check if error indicates camera in use
                const errorMessage = error?.message || '';
                if (errorMessage.toLowerCase().includes('in use') || 
                    errorMessage.toLowerCase().includes('busy') ||
                    errorMessage.toLowerCase().includes('device') ||
                    errorMessage.toLowerCase().includes('already')) {
                  Alert.alert(
                    'Camera In Use',
                    'Camera is being used by another application. Please close other apps using the camera and try again.',
                    [
                      {
                        text: 'Retry',
                        onPress: async () => {
                          setHasPermission(false);
                          await requestCameraPermission(true);
                        },
                      },
                      {
                        text: 'Close',
                        style: 'cancel',
                        onPress: onClose,
                      },
                    ]
                  );
                  setHasPermission(false);
                }
              }}
            />

            {/* Overlay with scanning frame */}
            <View style={styles.overlay}>
              {/* Top overlay */}
              <View style={styles.overlayTop} />
              
              {/* Middle section with frame */}
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

              {/* Bottom overlay */}
              <View style={styles.overlayBottom}>
                {isProcessing && (
                  <View style={styles.processingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.processingText}>Processing...</Text>
                  </View>
                )}
                {scanResult && !scanResult.valid && (
                  <View style={styles.errorContainer}>
                    <Ionicons name="close-circle" size={24} color={colors.error} />
                    <Text style={styles.errorText}>{scanResult.message}</Text>
                  </View>
                )}
                {scanResult && scanResult.valid && (
                  <View style={styles.successContainer}>
                    <Ionicons name="checkmark-circle" size={24} color={colors.success} />
                    <Text style={styles.successText}>{scanResult.message}</Text>
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
        </View>
      </View>
    </Modal>
  );
}

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
    errorContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(255, 59, 48, 0.2)',
      padding: 12,
      borderRadius: 8,
    },
    errorText: {
      color: '#FFFFFF',
      marginLeft: 8,
      fontSize: 14,
    },
    successContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(52, 199, 89, 0.2)',
      padding: 12,
      borderRadius: 8,
    },
    successText: {
      color: '#FFFFFF',
      marginLeft: 8,
      fontSize: 14,
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
    button: {
      backgroundColor: colors.primary,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 8,
      marginTop: 16,
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
  });

