import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Alert, ActivityIndicator, ScrollView, Platform } from 'react-native';
import { BarCodeScanner, BarCodeScannerResult } from 'expo-barcode-scanner';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../hooks/useAuth';
import { qrSystemService, QRScanResult, QRCode } from '../lib/qr-system';
import { isAdmin } from '../lib/admin-utils';
import { cameraPermissionManager } from '../lib/camera-permissions';
import { supabase } from '../lib/supabase';
import { PassType } from '../lib/pass-system';
import { qrScannerService } from '../lib/qr-scanner-service';

// Dynamic import for web fallback
// Using .web.ts extension ensures Metro only resolves this on web
let webQRScannerFallback: any = null;
if (Platform.OS === 'web') {
  try {
    webQRScannerFallback = require('../lib/qr-scanner-web-fallback.web').webQRScannerFallback;
  } catch (e) {
    // Ignore if not available
  }
}

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
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [useWebFallback, setUseWebFallback] = useState(false);
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const scannerWrapperRef = React.useRef<any>(null);

  const styles = getStyles(isDark, colors);

  useEffect(() => {
    if (visible && user) {
      checkAdminStatus();
      checkPermissionStatus();
      // Reset scanner state when modal opens
      setScanned(false);
      setIsProcessing(false);
      setScanResult(null);
      setQrDetails(null);
      setShowDetails(false);
      setCameraReady(false);
      setCameraError(null);
      setUseWebFallback(false);
      
      // On web, enable fallback
      if (Platform.OS === 'web') {
        qrScannerService.enableWebFallback();
      }
    } else if (!visible) {
      // Reset camera state when modal closes
      setCameraReady(false);
      setCameraError(null);
      
      // Cleanup web fallback when closing
      if (useWebFallback) {
        qrScannerService.stopWebFallback();
        setUseWebFallback(false);
      }
    }
  }, [visible, user]);

  const checkPermissionStatus = async () => {
    try {
      console.log('Checking camera permission status...');
      const result = await cameraPermissionManager.getPermissionStatus(true); // Force refresh
      console.log('Permission status:', result);
      const granted = result.status === 'granted';
      setHasPermission(granted);
      
      // If permission is granted, set camera ready after a very short delay
      if (granted) {
        console.log('Camera permission already granted');
        // Give camera minimal time to initialize, then show it
        setTimeout(() => {
          console.log('Setting camera as ready after permission check');
          setCameraReady(true);
        }, 500); // Reduced to 500ms
      } else if (result.canAskAgain) {
        console.log('Permission not granted, requesting...');
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
      console.log('Requesting camera permission...');
      // Use permission manager for better handling
      const result = await cameraPermissionManager.requestWithFallback(true); // Force fresh
      console.log('Permission request result:', result);
      
      if (result.status === 'granted') {
        console.log('Camera permission granted!');
        setHasPermission(true);
        // Set camera ready after permission is granted
        setTimeout(() => {
          console.log('Setting camera as ready after permission grant');
          setCameraReady(true);
        }, 500); // Reduced to 500ms
      } else if (result.status === 'blocked' || (result.status === 'denied' && !result.canAskAgain)) {
        // Permission is blocked - show settings option
        console.log('Camera permission blocked');
        setHasPermission(false);
      } else {
        console.log('Camera permission denied');
        setHasPermission(false);
      }
    } catch (error) {
      console.error('Error requesting camera permission:', error);
      setHasPermission(false);
    }
  };

  const handleBarCodeScanned = qrScannerService.createScanHandler(
    {
      onScan: async ({ type, data }: BarCodeScannerResult) => {
        if (scanned || isProcessing) return;

        console.log('QR Code scanned:', { type, data });
        setScanned(true);
        setIsProcessing(true);

        try {
          // Use professional QR parser
          const parsed = qrScannerService.parseQRData(data);
          
          if (!parsed.isValid || !parsed.token) {
            throw new Error('Invalid QR code format');
          }

          const token = parsed.token;

          console.log('Extracted token:', token);

          // For admin scanning, first check validity without marking as used
          // Then validate and use to log the scan
          let result = await qrSystemService.checkQRValidity(token);
          
          // If valid, also validate and use to log the admin scan
          if (result.valid) {
            const useResult = await qrSystemService.validateAndUseQR(
              token,
              user?.id,
              'admin-scanner'
            );
            // Use the useResult which has more details
            result = useResult;
          }

          console.log('QR validation result:', result);
          setScanResult(result);

          // Fetch full QR details for admin view (always fetch, even if invalid)
          try {
            const qr = await qrSystemService.getQRByToken(token);
            setQrDetails(qr);
            setShowDetails(true);
          } catch (error) {
            console.error('Error fetching QR details:', error);
            // Still show result even if we can't fetch details
            setShowDetails(true);
          }

          // Call success callback with result
          if (onScanSuccess) {
            onScanSuccess(result);
          }
        } catch (error: any) {
          console.error('Error scanning QR:', error);
          Alert.alert('Error', error.message || 'Error processing QR code', [
            { text: 'Try Again', onPress: resetScanner },
          ]);
        } finally {
          setIsProcessing(false);
        }
      },
      onError: (error) => {
        console.error('QR scan error:', error);
        Alert.alert('Error', error.message || 'Error processing QR code', [
          { text: 'Try Again', onPress: resetScanner },
        ]);
      },
    },
    {
      qrOnly: true,
      scanThrottle: 1000,
      hapticFeedback: true,
    }
  );

  const resetScanner = () => {
    console.log('Resetting scanner...');
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
            try {
              const success = await qrSystemService.revokeQR(
                qrDetails.token,
                user.id,
                'Revoked by admin via scanner'
              );
              if (success) {
                Alert.alert('Success', 'QR code has been revoked');
                // Refresh QR details
                const updatedQr = await qrSystemService.getQRByToken(qrDetails.token);
                if (updatedQr) {
                  setQrDetails(updatedQr);
                  setScanResult({
                    ...scanResult,
                    valid: false,
                    status: 'revoked',
                    message: 'QR code has been revoked'
                  });
                }
              } else {
                Alert.alert('Error', 'Failed to revoke QR code');
              }
            } catch (error: any) {
              console.error('Error revoking QR:', error);
              Alert.alert('Error', error.message || 'Failed to revoke QR code');
            }
          },
        },
      ]
    );
  };

  const handleSuspend = async () => {
    if (!scanResult || !qrDetails || !user) return;

    try {
      const success = await qrSystemService.suspendQR(qrDetails.token, user.id);
      if (success) {
        Alert.alert('Success', 'QR code has been suspended');
        // Refresh QR details
        const updatedQr = await qrSystemService.getQRByToken(qrDetails.token);
        if (updatedQr) {
          setQrDetails(updatedQr);
          setScanResult({
            ...scanResult,
            valid: false,
            status: 'suspended',
            message: 'QR code is suspended'
          });
        }
      } else {
        Alert.alert('Error', 'Failed to suspend QR code');
      }
    } catch (error: any) {
      console.error('Error suspending QR:', error);
      Alert.alert('Error', error.message || 'Failed to suspend QR code');
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
                {hasPermission === true && (
                  <>
                    <BarCodeScanner
                      onBarCodeScanned={scanned || isProcessing ? undefined : handleBarCodeScanned}
                      style={StyleSheet.absoluteFillObject}
                      barCodeTypes={[BarCodeScanner.Constants.BarCodeType.qr]}
                      type="back"
                      onMountError={(error) => {
                        console.error('Camera mount error:', error);
                        const errorMessage = error?.message || String(error);
                        setCameraError(errorMessage);
                        setCameraReady(false);
                        Alert.alert(
                          'Camera Error',
                          `Failed to start camera: ${errorMessage}\n\nPlease try:\n1. Close other apps using the camera\n2. Restart the app\n3. Check camera permissions`,
                          [
                            {
                              text: 'Retry',
                              onPress: () => {
                                setCameraError(null);
                                setCameraReady(false);
                                // Force re-render by resetting permission
                                setHasPermission(null);
                                setTimeout(() => {
                                  checkPermissionStatus();
                                }, 500);
                              },
                            },
                            {
                              text: 'Close',
                              style: 'cancel',
                              onPress: onClose,
                            },
                          ]
                        );
                      }}
                      onCameraReady={() => {
                        console.log('Camera is ready!');
                        setCameraReady(true);
                        setCameraError(null);
                      }}
                      // Note: onCameraReady may not fire on all platforms
                      // We use timeout fallback in checkPermissionStatus
                    />
                    {/* Only show loading overlay briefly, then hide it to show camera */}
                    {!cameraReady && !cameraError && hasPermission === true && (
                      <View style={styles.cameraLoadingOverlay} pointerEvents="none">
                        <ActivityIndicator size="large" color={colors.primary} />
                        <Text style={styles.cameraLoadingText}>Starting camera...</Text>
                      </View>
                    )}
                    {cameraError && (
                      <View style={styles.cameraErrorOverlay}>
                        <Ionicons name="camera-outline" size={64} color={colors.error} />
                        <Text style={styles.cameraErrorText}>Camera Error</Text>
                        <Text style={styles.cameraErrorDetails}>{cameraError}</Text>
                        <TouchableOpacity
                          style={styles.retryButton}
                          onPress={() => {
                            setCameraError(null);
                            setCameraReady(false);
                            setHasPermission(null);
                            setTimeout(() => {
                              checkPermissionStatus();
                            }, 500);
                          }}
                        >
                          <Text style={styles.retryButtonText}>Retry</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </>
                )}
                {hasPermission === false && (
                  <View style={styles.scannerPlaceholder}>
                    <Ionicons name="camera-outline" size={64} color={colors.text.secondary} />
                    <Text style={styles.placeholderText}>Camera permission required</Text>
                  </View>
                )}

                {/* Overlay - only show when camera is ready to avoid blocking */}
                {cameraReady && hasPermission === true && (
                  <View style={styles.overlay} pointerEvents="none">
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
                )}
              </View>

              {/* Instructions */}
              <View style={styles.instructions}>
                <Text style={styles.instructionText}>
                  Position the QR code within the frame to scan
                </Text>
                {scanned && !isProcessing && !showDetails && (
                  <TouchableOpacity style={styles.resetButton} onPress={resetScanner}>
                    <Text style={styles.resetButtonText}>Scan Again</Text>
                  </TouchableOpacity>
                )}
                {isProcessing && (
                  <View style={styles.processingContainer}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={styles.processingText}>Processing QR code...</Text>
                  </View>
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
                    <>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Pass Number:</Text>
                        <Text style={styles.detailValue}>
                          {qrDetails.display_data.pass_number || 'N/A'}
                        </Text>
                      </View>
                      {qrDetails.display_data.pass_type && (
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Pass Type:</Text>
                          <Text style={styles.detailValue}>
                            {qrDetails.display_data.pass_type}
                          </Text>
                        </View>
                      )}
                    </>
                  )}
                </View>
              )}

              {scanResult && !scanResult.valid && (
                <View style={styles.detailsSection}>
                  <Text style={styles.sectionTitle}>Validation Error</Text>
                  <Text style={[styles.detailValue, { color: colors.error }]}>
                    {scanResult.message}
                  </Text>
                </View>
              )}

              {/* Admin Actions */}
              {qrDetails && (
                <View style={styles.actionsSection}>
                  <Text style={styles.sectionTitle}>Admin Actions</Text>
                  
                  {/* Pass Upgrade Action */}
                  {qrDetails.pass_id && qrDetails.display_data?.pass_type && (
                    <View style={styles.passUpgradeSection}>
                      <Text style={styles.sectionSubtitle}>Upgrade Pass</Text>
                      <Text style={styles.detailValue}>
                        Current: {qrDetails.display_data.pass_type.toUpperCase()}
                      </Text>
                      <View style={styles.upgradeButtons}>
                        {(['general', 'business', 'vip'] as PassType[]).map((type) => {
                          if (type === qrDetails.display_data?.pass_type) return null;
                          return (
                            <TouchableOpacity
                              key={type}
                              style={[styles.upgradeButton, { borderColor: colors.primary }]}
                              onPress={async () => {
                                if (!qrDetails.pass_id || !user) return;
                                Alert.alert(
                                  'Upgrade Pass',
                                  `Upgrade pass to ${type.toUpperCase()}?`,
                                  [
                                    { text: 'Cancel', style: 'cancel' },
                                    {
                                      text: 'Upgrade',
                                      onPress: async () => {
                                        try {
                                          // Get pass type limits
                                          const { data: limits, error: limitsError } = await supabase
                                            .rpc('get_pass_type_limits', { p_pass_type: type });
                                          
                                          if (limitsError) throw limitsError;
                                          
                                          // Update pass
                                          const { error: updateError } = await supabase
                                            .from('passes')
                                            .update({
                                              pass_type: type,
                                              max_meeting_requests: limits?.max_requests || 10,
                                              max_boost_amount: limits?.max_boost || 200.00,
                                              updated_at: new Date().toISOString()
                                            })
                                            .eq('id', qrDetails.pass_id);
                                          
                                          if (updateError) throw updateError;
                                          
                                          Alert.alert('Success', `Pass upgraded to ${type.toUpperCase()}`);
                                          
                                          // Refresh QR details
                                          const updatedQr = await qrSystemService.getQRByToken(qrDetails.token);
                                          if (updatedQr) {
                                            setQrDetails(updatedQr);
                                            // Update display data
                                            if (updatedQr.display_data) {
                                              updatedQr.display_data.pass_type = type;
                                            }
                                          }
                                        } catch (error: any) {
                                          console.error('Error upgrading pass:', error);
                                          Alert.alert('Error', error.message || 'Failed to upgrade pass');
                                        }
                                      }
                                    }
                                  ]
                                );
                              }}
                            >
                              <Text style={[styles.upgradeButtonText, { color: colors.primary }]}>
                                Upgrade to {type.toUpperCase()}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  )}
                  
                  {/* QR Status Actions */}
                  <Text style={styles.sectionSubtitle}>QR Status Actions</Text>
                  
                  {qrDetails.status === 'active' && (
                    <TouchableOpacity style={[styles.actionButton, styles.suspendButton]} onPress={handleSuspend}>
                      <MaterialIcons name="pause-circle-outline" size={20} color="#FF9500" />
                      <Text style={styles.actionButtonText}>Suspend QR</Text>
                    </TouchableOpacity>
                  )}
                  
                  {qrDetails.status === 'suspended' && (
                    <TouchableOpacity 
                      style={[styles.actionButton, { borderColor: colors.success, borderWidth: 1 }]} 
                      onPress={async () => {
                        if (!qrDetails || !user) return;
                        try {
                          const success = await qrSystemService.reactivateQR(qrDetails.token, user.id);
                          if (success) {
                            Alert.alert('Success', 'QR code has been reactivated');
                            // Refresh QR details
                            const updatedQr = await qrSystemService.getQRByToken(qrDetails.token);
                            if (updatedQr) {
                              setQrDetails(updatedQr);
                              setScanResult({
                                ...scanResult!,
                                valid: updatedQr.status === 'active',
                                status: updatedQr.status === 'active' ? 'valid' : 'suspended',
                                message: updatedQr.status === 'active' ? 'QR code is valid' : 'QR code is suspended'
                              });
                            }
                          } else {
                            Alert.alert('Error', 'Failed to reactivate QR code');
                          }
                        } catch (error: any) {
                          console.error('Error reactivating QR:', error);
                          Alert.alert('Error', error.message || 'Failed to reactivate QR code');
                        }
                      }}
                    >
                      <MaterialIcons name="play-circle-outline" size={20} color={colors.success} />
                      <Text style={[styles.actionButtonText, { color: colors.success }]}>Reactivate QR</Text>
                    </TouchableOpacity>
                  )}
                  
                  {qrDetails.status !== 'revoked' && (
                    <TouchableOpacity style={[styles.actionButton, styles.revokeButton]} onPress={handleRevoke}>
                      <MaterialIcons name="block" size={20} color={colors.error} />
                      <Text style={[styles.actionButtonText, { color: colors.error }]}>Revoke QR</Text>
                    </TouchableOpacity>
                  )}
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
      width: '100%',
      height: '100%',
      overflow: 'hidden',
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
    scannerPlaceholder: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    placeholderText: {
      marginTop: 16,
      fontSize: 16,
      color: colors.text.secondary,
      textAlign: 'center',
    },
    sectionSubtitle: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.text.secondary,
      marginTop: 8,
      marginBottom: 8,
    },
    passUpgradeSection: {
      marginBottom: 16,
      padding: 12,
      backgroundColor: colors.background.secondary,
      borderRadius: 8,
    },
    upgradeButtons: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 8,
    },
    upgradeButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 6,
      borderWidth: 1,
      backgroundColor: colors.background.paper,
    },
    upgradeButtonText: {
      fontSize: 14,
      fontWeight: '600',
    },
    cameraLoadingOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 10,
    },
    cameraLoadingText: {
      marginTop: 16,
      fontSize: 16,
      color: '#FFFFFF',
      textAlign: 'center',
    },
    cameraErrorOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
      zIndex: 10,
    },
    cameraErrorText: {
      marginTop: 16,
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.error,
      textAlign: 'center',
    },
    cameraErrorDetails: {
      marginTop: 8,
      fontSize: 14,
      color: colors.text.secondary,
      textAlign: 'center',
      marginBottom: 24,
    },
    retryButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 8,
    },
    retryButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
  });

