/**
 * Pure Web QR Scanner Component
 * Uses html5-qrcode library with native HTML5 video element
 * This is the most reliable approach for web QR scanning
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ActivityIndicator, Platform } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { Ionicons } from '@expo/vector-icons';

// Only load on web
if (Platform.OS !== 'web') {
  throw new Error('WebQRScanner is web-only');
}

interface WebQRScannerProps {
  visible: boolean;
  onClose: () => void;
  onScanSuccess: (text: string) => void;
  onError?: (error: Error) => void;
  title?: string;
}

export default function WebQRScanner({
  visible,
  onClose,
  onScanSuccess,
  onError,
  title = 'Scan QR Code',
}: WebQRScannerProps) {
  const { colors, isDark } = useTheme();
  const scannerRef = useRef<HTMLDivElement | null>(null);
  const scannerInstanceRef = useRef<any>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [scanLinePosition, setScanLinePosition] = useState(20); // Percentage from top

  const styles = getStyles(isDark, colors);

  const checkCameraPermission = useCallback(async (): Promise<boolean> => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('Camera API not available. Please use HTTPS or localhost.');
        return false;
      }

      // Try to access camera
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      // Stop immediately - we just wanted to check permission
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Camera permission denied. Please allow camera access.');
        return false;
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setError('No camera found. Please connect a camera device.');
        return false;
      } else {
        setError(`Camera error: ${err.message || 'Unknown error'}`);
        return false;
      }
    }
  }, []);

  const stopScanner = useCallback(async () => {
    if (scannerInstanceRef.current) {
      try {
        console.log('🛑 Stopping scanner...');
        // Stop scanning first
        await scannerInstanceRef.current.stop().catch((e: any) => {
          // Ignore stop errors - scanner might already be stopped
          console.debug('Stop error (ignored):', e.message);
        });
        // Clear with delay to avoid DOM errors
        setTimeout(async () => {
          try {
            await scannerInstanceRef.current?.clear();
          } catch (e: any) {
            // Ignore clear errors - DOM might already be cleaned up
            console.debug('Clear error (ignored):', e.message);
          }
        }, 100);
        console.log('✅ Scanner stopped');
      } catch (err: any) {
        // Ignore errors during cleanup
        console.debug('Scanner cleanup:', err.message || err);
      } finally {
        scannerInstanceRef.current = null;
        setIsScanning(false);
      }
    } else {
      setIsScanning(false);
    }
  }, []);

  const initializeScanner = useCallback(async () => {
    if (!visible || Platform.OS !== 'web') return;
    
    // Check if scanner is already running - if so, don't reinitialize
    if (scannerInstanceRef.current && isScanning) {
      console.log('✅ Scanner already running');
      return;
    }
    
    // Wait longer if we just stopped to avoid media resource abort errors
    // This prevents rapid stop/start cycles that cause media abort errors
    if (scannerInstanceRef.current === null && !isScanning) {
      console.log('⏳ Waiting before reinitializing to avoid media abort...');
      await new Promise(resolve => setTimeout(resolve, 800));
    }

    setIsLoading(true);
    setError(null);

    try {
      // Check permissions first
      const hasPerm = await checkCameraPermission();
      setHasPermission(hasPerm);

      if (!hasPerm) {
        setIsLoading(false);
        return;
      }

      // Load html5-qrcode library
      const { Html5Qrcode } = await import('html5-qrcode');
      
      // Store Html5Qrcode in a variable accessible in catch block
      const Html5QrcodeClass = Html5Qrcode;

      // Wait for DOM element to be ready and verify it's actually in the DOM
      // Use a retry mechanism with exponential backoff
      let retries = 0;
      const maxRetries = 10;
      
      const waitForElement = async (): Promise<boolean> => {
        if (!scannerRef.current) {
          if (retries < maxRetries) {
            retries++;
            await new Promise(resolve => setTimeout(resolve, 100 * retries));
            return waitForElement();
          }
          return false;
        }
        
        // Verify element is actually in the DOM and has dimensions
        if (typeof window !== 'undefined' && scannerRef.current) {
          // Check if element is actually in the document
          if (!document.body.contains(scannerRef.current)) {
            if (retries < maxRetries) {
              retries++;
              await new Promise(resolve => setTimeout(resolve, 100 * retries));
              return waitForElement();
            }
            return false;
          }
          
          const rect = scannerRef.current.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) {
            if (retries < maxRetries) {
              retries++;
              await new Promise(resolve => setTimeout(resolve, 100 * retries));
              return waitForElement();
            }
            return false;
          }
        }
        
        return true;
      };
      
      const elementReady = await waitForElement();
      if (!elementReady) {
        throw new Error('Scanner element not ready after multiple retries');
      }

      // Clear any existing content
      if (scannerRef.current) {
        scannerRef.current.innerHTML = '';
      } else {
        throw new Error('Scanner ref is null');
      }

      // Create scanner instance with a unique ID
      const scannerId = `qr-scanner-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      scannerRef.current.id = scannerId;
      
      // Double-check element is still valid before creating scanner instance
      if (!scannerRef.current || !document.body.contains(scannerRef.current)) {
        throw new Error('Scanner element became invalid');
      }
      
      const html5Qrcode = new Html5Qrcode(scannerId);
      scannerInstanceRef.current = html5Qrcode;

      // Get available cameras
      const cameras = await Html5Qrcode.getCameras();
      if (cameras.length === 0) {
        throw new Error('No cameras found');
      }

      console.log(`📹 Found ${cameras.length} camera(s):`, cameras.map(c => c.label));

      // Prefer back camera (environment facing), but fallback gracefully
      let cameraId: string;
      const backCamera = cameras.find(cam => 
        cam.label.toLowerCase().includes('back') ||
        cam.label.toLowerCase().includes('rear') ||
        cam.label.toLowerCase().includes('environment') ||
        cam.label.toLowerCase().includes('facing back')
      );
      
      if (backCamera) {
        cameraId = backCamera.id;
        console.log('✅ Using back camera:', backCamera.label);
      } else {
        // Try to find any camera that's not explicitly front-facing
        const nonFrontCamera = cameras.find(cam => 
          !cam.label.toLowerCase().includes('front') &&
          !cam.label.toLowerCase().includes('user')
        );
        cameraId = nonFrontCamera?.id || cameras[0].id;
        console.log('⚠️ Back camera not found, using:', cameras.find(c => c.id === cameraId)?.label || 'first available');
      }

      // Final check before starting - element must exist and be in DOM
      // Use a more robust check with retries
      let finalRetries = 0;
      const maxFinalRetries = 5;
      while (finalRetries < maxFinalRetries) {
        if (!scannerRef.current) {
          console.log(`⚠️ Element null, retry ${finalRetries + 1}/${maxFinalRetries}`);
          await new Promise(resolve => setTimeout(resolve, 200));
          finalRetries++;
          continue;
        }
        
        if (!document.body.contains(scannerRef.current)) {
          console.log(`⚠️ Element not in DOM, retry ${finalRetries + 1}/${maxFinalRetries}`);
          await new Promise(resolve => setTimeout(resolve, 200));
          finalRetries++;
          continue;
        }
        
        const rect = scannerRef.current.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) {
          console.log(`⚠️ Element has no dimensions, retry ${finalRetries + 1}/${maxFinalRetries}`);
          await new Promise(resolve => setTimeout(resolve, 200));
          finalRetries++;
          continue;
        }
        
        // Element is valid, break out of loop
        break;
      }
      
      // Final validation before starting
      if (!scannerRef.current || !document.body.contains(scannerRef.current)) {
        throw new Error('Scanner element invalid after final checks');
      }
      
      // Verify element has dimensions
      const finalRect = scannerRef.current.getBoundingClientRect();
      if (finalRect.width === 0 || finalRect.height === 0) {
        throw new Error(`Scanner element has invalid dimensions: ${finalRect.width}x${finalRect.height}`);
      }
      
      console.log(`✅ Element validated: ${finalRect.width}x${finalRect.height}, ready to start scanner`);

      // Start scanning with optimized settings for maximum reliability
      // Higher FPS and more flexible constraints for better detection
      await html5Qrcode.start(
        cameraId,
        {
          fps: 30, // Increased FPS for faster detection - matches QR refresh rate better
          qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
            // Larger scanning area - 80% of the smaller dimension for better coverage
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            const calculatedSize = Math.floor(minEdge * 0.8);
            const size = Math.max(250, calculatedSize); // Minimum 250px
            console.log(`📐 QR box size: ${size}x${size} (viewport: ${viewfinderWidth}x${viewfinderHeight})`);
            return { width: size, height: size };
          },
          aspectRatio: 1.0,
          videoConstraints: {
            facingMode: { ideal: 'environment' }, // More flexible constraint
            // Use min/max instead of ideal for better compatibility
            width: { min: 640, ideal: 1280, max: 1920 },
            height: { min: 480, ideal: 720, max: 1080 },
            // Add advanced constraints for better mobile support
            advanced: [
              { facingMode: 'environment' },
              { facingMode: 'user' }, // Fallback to front camera if back not available
            ],
          },
        },
        (decodedText: string, decodedResult: any) => {
          // Success - QR code detected
          console.log('✅✅✅ QR Code detected! ✅✅✅');
          console.log('📝 Raw QR text:', decodedText);
          console.log('📦 Decoded result:', decodedResult);
          console.log('📏 QR text length:', decodedText.length);
          
          // Validate the decoded text is not empty
          if (!decodedText || decodedText.trim().length === 0) {
            console.warn('⚠️ Empty QR code detected, ignoring...');
            return;
          }
          
          // Log the first 100 characters to help debug
          console.log('📄 QR preview:', decodedText.substring(0, 100));
          
          // Call success callback - scanner keeps running for continuous scanning
          onScanSuccess(decodedText);
        },
        (errorMessage: string) => {
          // This is called frequently when no QR code is detected - this is normal
          // Only log actual errors, not the normal "no QR found" messages
          const isNormalError = 
            errorMessage.includes('No QR code') || 
            errorMessage.includes('NotFoundException') ||
            errorMessage.includes('No MultiFormat') ||
            errorMessage.includes('QR code parse error') ||
            errorMessage.includes('QR code parse error, error =') ||
            errorMessage.includes('QR code not found');
          
          if (!isNormalError) {
            console.warn('⚠️ QR scan error:', errorMessage);
          }
        }
      );

      setIsScanning(true);
      setIsLoading(false);
      console.log('✅ QR Scanner started successfully');
      console.log('📹 Camera:', cameraId);
      console.log('🔍 Scanning continuously at 30fps with 80% viewport coverage...');
      console.log('💡 Optimized for fast QR detection with flexible camera constraints');
    } catch (err: any) {
      console.error('Error initializing scanner:', err);
      
      // Handle constraint errors specifically
      let errorMessage = err.message || 'Failed to start camera';
      if (err.name === 'OverconstrainedError' || err.message?.includes('constraint')) {
        errorMessage = 'Camera constraints not supported. Trying with simpler settings...';
        console.log('⚠️ Constraint error, will retry with simpler settings');
        
        // Retry with minimal constraints
        try {
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Ensure scanner element still exists
          if (!scannerRef.current || !document.body.contains(scannerRef.current)) {
            throw new Error('Scanner element no longer available');
          }
          
          // Re-import Html5Qrcode for retry
          const { Html5Qrcode: Html5QrcodeRetry } = await import('html5-qrcode');
          const simpleCameras = await Html5QrcodeRetry.getCameras();
          if (simpleCameras.length > 0) {
            const simpleCameraId = simpleCameras[0].id;
            const scannerIdSimple = scannerRef.current?.id || `qr-scanner-simple-${Date.now()}`;
            if (scannerRef.current && !scannerRef.current.id) {
              scannerRef.current.id = scannerIdSimple;
            }
            
            const html5QrcodeSimple = new Html5QrcodeRetry(scannerIdSimple);
            scannerInstanceRef.current = html5QrcodeSimple;
            
            await html5QrcodeSimple.start(
              simpleCameraId,
              {
                fps: 10, // Lower FPS for compatibility
                qrbox: { width: 250, height: 250 }, // Fixed size
                videoConstraints: {
                  facingMode: 'environment',
                },
              },
              (decodedText: string) => {
                console.log('✅✅✅ QR Code detected! ✅✅✅');
                if (decodedText && decodedText.trim().length > 0) {
                  onScanSuccess(decodedText);
                }
              },
              () => {} // Ignore scan errors
            );
            
            setIsScanning(true);
            setIsLoading(false);
            console.log('✅ Scanner started with simplified constraints');
            return; // Success!
          }
        } catch (retryErr: any) {
          console.error('Retry with simple constraints also failed:', retryErr);
          errorMessage = 'Camera not available. Please check permissions and try again.';
        }
      }
      
      setError(errorMessage);
      setIsLoading(false);
      setIsScanning(false);
      if (onError) {
        onError(err);
      }
    }
  }, [visible, checkCameraPermission, onScanSuccess, onError]);

  const handleRequestPermission = useCallback(async () => {
    setError(null);
    setIsLoading(true);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
      setHasPermission(true);
      setIsLoading(false);
      // Initialize scanner after permission granted
      setTimeout(() => initializeScanner(), 100);
    } catch (err: any) {
      setError('Permission denied. Please allow camera access in your browser settings.');
      setIsLoading(false);
    }
  }, [initializeScanner]);

  // Initialize scanner when modal opens
  useEffect(() => {
    if (!visible || Platform.OS !== 'web') {
      if (scannerInstanceRef.current) {
        console.log('🛑 Closing scanner...');
        stopScanner();
      }
      return;
    }

    // Add a small delay to ensure DOM is ready
    const initTimer = setTimeout(() => {
      console.log('🚀 Initializing QR scanner...');
      initializeScanner();
    }, 200);
    
    // Add periodic health check to restart scanner if it stops unexpectedly
    // But only if scanner was intentionally started (not during cleanup)
    let isInitializing = false;
    let isCleaningUp = false;
    
    const healthCheckInterval = setInterval(async () => {
      if (!visible || isInitializing || isCleaningUp) return;
      
      // Only check if we're supposed to be scanning
      if (!isScanning && !isLoading) return;
      
      // Check if scanner instance exists and is scanning
      if (!scannerInstanceRef.current && isScanning) {
        console.warn('⚠️ Scanner instance lost, restarting...');
        isInitializing = true;
        setIsScanning(false);
        setTimeout(async () => {
          await initializeScanner();
          isInitializing = false;
        }, 1000);
        return;
      }
      
      if (scannerInstanceRef.current && !isScanning && !isLoading) {
        console.warn('⚠️ Scanner stopped but instance exists, restarting...');
        isInitializing = true;
        try {
          await stopScanner();
        } catch (e) {
          // Ignore errors
        }
        setTimeout(async () => {
          await initializeScanner();
          isInitializing = false;
        }, 1000);
      }
    }, 10000); // Check every 10 seconds (much less frequent to avoid conflicts)
    
    return () => {
      isCleaningUp = true;
      clearTimeout(initTimer);
      clearInterval(healthCheckInterval);
      console.log('🧹 Cleaning up scanner...');
      // Stop immediately without delay to prevent conflicts
      stopScanner();
    };
  }, [visible]); // Only depend on visible to prevent re-renders

  // Animate scanning line when scanning
  useEffect(() => {
    if (!isScanning) {
      setScanLinePosition(20);
      return;
    }

    let direction = 1; // 1 for down, -1 for up
    let position = 20;

    const interval = setInterval(() => {
      position += direction * 2; // Move 2% per frame
      
      if (position >= 80) {
        position = 80;
        direction = -1;
      } else if (position <= 20) {
        position = 20;
        direction = 1;
      }
      
      setScanLinePosition(position);
    }, 50); // Update every 50ms for smooth animation

    return () => {
      clearInterval(interval);
    };
  }, [isScanning]);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={28} color={colors.text.primary} />
            </TouchableOpacity>
          </View>

          {/* Scanner Container */}
          <View style={styles.scannerContainer}>
            {isLoading && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Starting camera...</Text>
              </View>
            )}

            {error && (
              <View style={styles.errorOverlay}>
                <Ionicons name="alert-circle" size={48} color={colors.error.main} />
                <Text style={styles.errorText}>{error}</Text>
                {!hasPermission && (
                  <TouchableOpacity 
                    style={styles.permissionButton}
                    onPress={handleRequestPermission}
                  >
                    <Text style={styles.permissionButtonText}>Grant Camera Permission</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {hasPermission === false && !error && (
              <View style={styles.permissionOverlay}>
                <Ionicons name="camera-outline" size={64} color={colors.text.secondary} />
                <Text style={styles.permissionText}>Camera permission required</Text>
                <TouchableOpacity 
                  style={styles.permissionButton}
                  onPress={handleRequestPermission}
                >
                  <Text style={styles.permissionButtonText}>Grant Permission</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Scanner Element - Pure HTML5 div */}
            {Platform.OS === 'web' && (
              <div
                ref={scannerRef}
                style={{
                  width: '100%',
                  height: '100%',
                  minHeight: '400px',
                  backgroundColor: '#000',
                  position: 'relative',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
                data-testid="qr-scanner"
              />
            )}

            {/* Scanning Line Animation - Visual feedback */}
            {isScanning && !error && hasPermission && (
              <View style={styles.scanningOverlay} pointerEvents="none">
                <View 
                  style={[
                    styles.scanLine,
                    {
                      top: `${scanLinePosition}%`,
                    },
                  ]}
                />
              </View>
            )}
          </View>

          {/* Instructions */}
          <View style={styles.instructions}>
            <Text style={styles.instructionText}>
              {isScanning ? 'Position QR code within the frame' : 'Point your camera at a QR code to scan'}
            </Text>
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
      width: '90%',
      maxWidth: 600,
      maxHeight: '90%',
      overflow: 'hidden',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.divider,
    },
    title: {
      fontSize: 20,
      fontWeight: '600',
      color: colors.text.primary,
    },
    closeButton: {
      padding: 4,
    },
    scannerContainer: {
      width: '100%',
      aspectRatio: 1,
      backgroundColor: '#000',
      position: 'relative',
      overflow: 'hidden',
    },
    loadingOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 10,
    },
    loadingText: {
      color: '#fff',
      marginTop: 12,
      fontSize: 16,
    },
    errorOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
      zIndex: 10,
    },
    errorText: {
      color: '#fff',
      fontSize: 16,
      textAlign: 'center',
      marginTop: 16,
      marginBottom: 20,
    },
    permissionOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
      zIndex: 10,
    },
    permissionText: {
      color: colors.text.secondary,
      fontSize: 16,
      marginTop: 16,
      marginBottom: 20,
    },
    permissionButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 8,
    },
    permissionButtonText: {
      color: colors.primaryContrastText || '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
    scanningOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 5,
      pointerEvents: 'none',
    },
    scanLine: {
      position: 'absolute',
      left: '20%',
      right: '20%',
      height: 2,
      backgroundColor: colors.primary,
      shadowColor: colors.primary,
      shadowOffset: {
        width: 0,
        height: 0,
      },
      shadowOpacity: 0.8,
      shadowRadius: 4,
      elevation: 5,
      // @ts-ignore - Web-specific
      boxShadow: `0 0 10px ${colors.primary}`,
    },
    instructions: {
      padding: 20,
      borderTopWidth: 1,
      borderTopColor: colors.divider,
    },
    instructionText: {
      color: colors.text.secondary,
      fontSize: 14,
      textAlign: 'center',
    },
  });
