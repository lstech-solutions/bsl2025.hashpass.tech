/**
 * Professional QR Scanner Service
 * Cross-platform QR scanning with fallbacks and optimizations
 * 
 * Supports:
 * - iOS (native)
 * - Android (native)
 * - Web (with @zxing/browser fallback)
 */

import { Platform } from 'react-native';
import { BarCodeScanner, BarCodeScannerResult } from 'expo-barcode-scanner';
import { cameraPermissionManager } from './camera-permissions';

// Dynamic import for web fallback to avoid bundling ZXing on native
let webQRScannerFallback: any = null;
let WebQRScanResult: any = null;

// Only import web fallback on web platform
// Using .web.ts extension ensures Metro only resolves this on web
if (Platform.OS === 'web') {
  try {
    // Use require to avoid static analysis
    // Metro will automatically resolve .web.ts extension on web platform
    const webFallbackModule = require('./qr-scanner-web-fallback.web');
    webQRScannerFallback = webFallbackModule.webQRScannerFallback;
    WebQRScanResult = webFallbackModule.WebQRScanResult;
  } catch (e) {
    // Ignore if module can't be loaded
    console.warn('Web QR scanner fallback not available:', e);
  }
}

export interface QRScanOptions {
  /** Only scan QR codes (default: true) */
  qrOnly?: boolean;
  /** Scan interval throttle in ms (default: 1000) */
  scanThrottle?: number;
  /** Enable haptic feedback on scan (default: true) */
  hapticFeedback?: boolean;
  /** Enable sound feedback on scan (default: false) */
  soundFeedback?: boolean;
  /** Auto-process scanned QR (default: false) */
  autoProcess?: boolean;
}

export interface QRScanCallback {
  onScan: (result: BarCodeScannerResult) => void | Promise<void>;
  onError?: (error: Error) => void;
  onPermissionDenied?: () => void;
}

class QRScannerService {
  private lastScanTime = 0;
  private scanThrottle = 1000; // Default 1 second throttle
  private isScanning = false;
  private useWebFallback = false;
  private webFallbackActive = false;

  /**
   * Check if QR scanning is supported on this platform
   */
  isSupported(): boolean {
    if (Platform.OS === 'web') {
      // On web, check both expo-barcode-scanner and ZXing fallback
      return (
        (BarCodeScanner.isAvailableAsync !== undefined) ||
        (webQRScannerFallback && webQRScannerFallback.isAvailable())
      );
    }
    return BarCodeScanner.isAvailableAsync !== undefined;
  }

  /**
   * Enable web fallback (for when expo-barcode-scanner fails on web)
   */
  enableWebFallback(): void {
    if (Platform.OS === 'web') {
      this.useWebFallback = true;
    }
  }

  /**
   * Check if web fallback should be used
   */
  shouldUseWebFallback(): boolean {
    return Platform.OS === 'web' && this.useWebFallback && webQRScannerFallback && webQRScannerFallback.isAvailable();
  }

  /**
   * Request camera permissions with proper error handling
   */
  async requestPermissions(): Promise<{ granted: boolean; canAskAgain: boolean }> {
    try {
      const result = await cameraPermissionManager.requestWithFallback(true);
      return {
        granted: result.status === 'granted',
        canAskAgain: result.canAskAgain ?? true,
      };
    } catch (error) {
      console.error('Error requesting camera permissions:', error);
      return { granted: false, canAskAgain: false };
    }
  }

  /**
   * Check current camera permission status
   */
  async checkPermissions(): Promise<{ granted: boolean; canAskAgain: boolean }> {
    try {
      const result = await cameraPermissionManager.getPermissionStatus(true);
      return {
        granted: result.status === 'granted',
        canAskAgain: result.canAskAgain ?? true,
      };
    } catch (error) {
      console.error('Error checking camera permissions:', error);
      return { granted: false, canAskAgain: false };
    }
  }

  /**
   * Create a throttled scan handler
   */
  createScanHandler(
    callback: QRScanCallback,
    options: QRScanOptions = {}
  ): ((result: BarCodeScannerResult) => void) | undefined {
    const throttle = options.scanThrottle ?? this.scanThrottle;
    const hapticEnabled = options.hapticFeedback !== false;

    return (result: BarCodeScannerResult) => {
      // Throttle scans to prevent excessive processing
      const now = Date.now();
      if (now - this.lastScanTime < throttle) {
        return;
      }

      // Only process QR codes if qrOnly is true (default)
      if (options.qrOnly !== false && result.type !== BarCodeScanner.Constants.BarCodeType.qr) {
        return;
      }

      this.lastScanTime = now;

      // Prevent duplicate scans
      if (this.isScanning) {
        return;
      }

      this.isScanning = true;

      // Haptic feedback (if available)
      if (hapticEnabled && Platform.OS !== 'web') {
        try {
          // Note: expo-haptics would need to be imported if available
          // import * as Haptics from 'expo-haptics';
          // Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch (e) {
          // Haptics not available, continue silently
        }
      }

      // Process scan
      Promise.resolve(callback.onScan(result))
        .catch((error) => {
          console.error('Error in scan callback:', error);
          callback.onError?.(error);
        })
        .finally(() => {
          // Reset scanning flag after a delay
          setTimeout(() => {
            this.isScanning = false;
          }, throttle);
        });
    };
  }

  /**
   * Get recommended camera type for platform
   */
  getRecommendedCameraType(): 'front' | 'back' {
    // On web, back camera is more reliable
    // On mobile, back camera is standard for QR scanning
    return 'back';
  }

  /**
   * Get recommended bar code types
   */
  getBarCodeTypes(): string[] {
    return [BarCodeScanner.Constants.BarCodeType.qr];
  }

  /**
   * Validate QR code data format
   */
  parseQRData(data: string): {
    token?: string;
    type?: string;
    isValid: boolean;
    raw: string;
  } {
    try {
      // Try parsing as JSON first
      const parsed = JSON.parse(data);
      if (parsed.token) {
        return {
          token: parsed.token,
          type: parsed.type || 'hashpass_qr',
          isValid: true,
          raw: data,
        };
      }
      if (parsed.type === 'hashpass_qr' && parsed.token) {
        return {
          token: parsed.token,
          type: parsed.type,
          isValid: true,
          raw: data,
        };
      }
    } catch {
      // Not JSON, try URL parsing
      if (data.includes('token=')) {
        try {
          const url = new URL(data);
          const token = url.searchParams.get('token');
          if (token) {
            return {
              token,
              type: 'hashpass_qr',
              isValid: true,
              raw: data,
            };
          }
        } catch {
          // Invalid URL
        }
      }

      // Assume raw token
      if (data.length > 10) {
        return {
          token: data,
          type: 'hashpass_qr',
          isValid: true,
          raw: data,
        };
      }
    }

    return {
      isValid: false,
      raw: data,
    };
  }

  /**
   * Reset scan state (useful after processing a scan)
   */
  reset(): void {
    this.lastScanTime = 0;
    this.isScanning = false;
    
    // Stop web fallback if active
    if (this.webFallbackActive) {
      webQRScannerFallback.stopScanning();
      this.webFallbackActive = false;
    }
  }

  /**
   * Start web fallback scanning
   */
  async startWebFallback(
    videoElement: HTMLVideoElement | string,
    onScan: (result: WebQRScanResult) => void,
    onError?: (error: Error) => void
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.shouldUseWebFallback()) {
      return { success: false, error: 'Web fallback not available' };
    }

    this.webFallbackActive = true;
    return webQRScannerFallback.startScanning(
      onScan,
      onError,
      {
        videoElement,
        scanInterval: this.scanThrottle,
        continuous: true,
      }
    );
  }

  /**
   * Stop web fallback scanning
   */
  stopWebFallback(): void {
    if (this.webFallbackActive && webQRScannerFallback) {
      webQRScannerFallback.stopScanning();
      this.webFallbackActive = false;
    }
  }

  /**
   * Check web fallback permissions
   */
  async checkWebFallbackPermissions(): Promise<{ granted: boolean; canAskAgain: boolean }> {
    if (!this.shouldUseWebFallback() || !webQRScannerFallback) {
      return { granted: false, canAskAgain: false };
    }
    return webQRScannerFallback.checkPermissions();
  }

  /**
   * Request web fallback permissions
   */
  async requestWebFallbackPermissions(): Promise<{ granted: boolean; canAskAgain: boolean }> {
    if (!this.shouldUseWebFallback() || !webQRScannerFallback) {
      return { granted: false, canAskAgain: false };
    }
    return webQRScannerFallback.requestPermissions();
  }
}

// Export singleton instance
export const qrScannerService = new QRScannerService();

// Export types
export type { BarCodeScannerResult };

