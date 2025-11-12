/**
 * Web QR Scanner Fallback using @zxing/browser
 * Provides robust QR scanning for desktop browsers when expo-barcode-scanner fails
 * 
 * NOTE: This module uses dynamic imports to avoid bundling ZXing on native platforms
 */

import { Platform } from 'react-native';

// Type definitions for ZXing (will be dynamically imported on web only)
type BrowserMultiFormatReader = any;
type NotFoundException = any;

export interface WebQRScanOptions {
  /** Video element ID or element */
  videoElement?: HTMLVideoElement | string;
  /** Scan interval in ms (default: 500) */
  scanInterval?: number;
  /** Enable continuous scanning (default: true) */
  continuous?: boolean;
}

export interface WebQRScanResult {
  text: string;
  format: string;
  timestamp: number;
}

class WebQRScannerFallback {
  private reader: BrowserMultiFormatReader | null = null;
  private isScanning = false;
  private scanInterval: NodeJS.Timeout | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private stream: MediaStream | null = null;
  private zxingModule: any = null; // Dynamically loaded ZXing module

  /**
   * Check if web fallback is available
   */
  isAvailable(): boolean {
    return Platform.OS === 'web' && typeof window !== 'undefined' && typeof navigator !== 'undefined';
  }

  /**
   * Dynamically load ZXing library (web only)
   */
  private async loadZXing(): Promise<{ BrowserMultiFormatReader: any; NotFoundException: any }> {
    if (this.zxingModule) {
      return this.zxingModule;
    }

    if (Platform.OS !== 'web') {
      throw new Error('ZXing is only available on web platform');
    }

    try {
      // Dynamic import to avoid bundling on native platforms
      const zxingBrowser = await import('@zxing/browser');
      this.zxingModule = {
        BrowserMultiFormatReader: zxingBrowser.BrowserMultiFormatReader,
        NotFoundException: zxingBrowser.NotFoundException,
      };
      return this.zxingModule;
    } catch (error) {
      console.error('Failed to load ZXing library:', error);
      throw new Error('ZXing library not available');
    }
  }

  /**
   * Initialize the ZXing reader
   */
  private async initializeReader(): Promise<BrowserMultiFormatReader> {
    if (!this.reader) {
      const { BrowserMultiFormatReader } = await this.loadZXing();
      this.reader = new BrowserMultiFormatReader();
    }
    return this.reader;
  }

  /**
   * Get available video devices
   */
  async getVideoDevices(): Promise<MediaDeviceInfo[]> {
    if (!this.isAvailable()) {
      return [];
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter(device => device.kind === 'videoinput');
    } catch (error) {
      console.error('Error enumerating video devices:', error);
      return [];
    }
  }

  /**
   * Get the best camera device (prefer back camera)
   */
  async getBestCameraDevice(): Promise<string | null> {
    const devices = await this.getVideoDevices();
    if (devices.length === 0) {
      return null;
    }

    // Prefer back camera (usually labeled as "back" or "rear")
    const backCamera = devices.find(device => 
      device.label.toLowerCase().includes('back') || 
      device.label.toLowerCase().includes('rear')
    );

    if (backCamera) {
      return backCamera.deviceId;
    }

    // Fallback to first available camera
    return devices[0].deviceId;
  }

  /**
   * Start scanning with ZXing fallback
   */
  async startScanning(
    onScan: (result: WebQRScanResult) => void,
    onError?: (error: Error) => void,
    options: WebQRScanOptions = {}
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.isAvailable()) {
      return { success: false, error: 'Web fallback not available' };
    }

    if (this.isScanning) {
      return { success: false, error: 'Already scanning' };
    }

    try {
      const reader = await this.initializeReader();
      const deviceId = await this.getBestCameraDevice();

      if (!deviceId) {
        throw new Error('No camera device found');
      }

      // Get or create video element
      let videoElement: HTMLVideoElement;
      if (options.videoElement) {
        if (typeof options.videoElement === 'string') {
          // Try to find element by ID or data attribute
          let element = document.getElementById(options.videoElement) ||
                       document.querySelector(`[data-scanner-id="${options.videoElement}"]`) as HTMLElement;
          
          // If element doesn't exist, create a container
          if (!element) {
            const container = document.createElement('div');
            container.id = options.videoElement;
            container.style.width = '100%';
            container.style.height = '100%';
            container.style.position = 'relative';
            container.setAttribute('data-scanner-id', options.videoElement);
            
            // Try to find parent container
            const parent = document.querySelector(`[data-testid="scanner-wrapper"]`) ||
                          document.querySelector('.scanner-wrapper');
            
            if (parent) {
              parent.appendChild(container);
              element = container;
            } else {
              throw new Error(`Could not find container for scanner: ${options.videoElement}`);
            }
          }
          
          // If element is not a video, create a video inside it
          if (element instanceof HTMLVideoElement) {
            videoElement = element;
          } else {
            // Create video element inside the container
            const existingVideo = element.querySelector('video') as HTMLVideoElement;
            if (existingVideo) {
              videoElement = existingVideo;
            } else {
              videoElement = document.createElement('video');
              videoElement.style.width = '100%';
              videoElement.style.height = '100%';
              videoElement.style.objectFit = 'cover';
              videoElement.setAttribute('autoplay', 'true');
              videoElement.setAttribute('playsinline', 'true');
              videoElement.setAttribute('muted', 'true');
              element.appendChild(videoElement);
            }
          }
        } else {
          videoElement = options.videoElement;
        }
      } else {
        // Try to find existing video element or create one
        const existingVideo = document.getElementById('qr-scanner-video') as HTMLVideoElement;
        if (existingVideo) {
          videoElement = existingVideo;
        } else {
          videoElement = document.createElement('video');
          videoElement.id = 'qr-scanner-video';
          videoElement.style.width = '100%';
          videoElement.style.height = '100%';
          videoElement.style.objectFit = 'cover';
          videoElement.setAttribute('autoplay', 'true');
          videoElement.setAttribute('playsinline', 'true');
          videoElement.setAttribute('muted', 'true');
        }
      }

      this.videoElement = videoElement;

      // Start video stream
      const constraints: MediaStreamConstraints = {
        video: {
          deviceId: { exact: deviceId },
          facingMode: 'environment', // Prefer back camera
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      };

      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      videoElement.srcObject = this.stream;
      await videoElement.play();

      this.isScanning = true;

      // Start continuous scanning using ZXing
      const scanInterval = options.scanInterval || 500;
      const continuous = options.continuous !== false;
      const zxingModule = await this.loadZXing();
      const NotFoundException = zxingModule?.NotFoundException;

      // Use ZXing's decodeFromVideoDevice which handles continuous scanning
      reader.decodeFromVideoDevice(
        deviceId,
        videoElement,
        (result: any, error: any) => {
          if (result) {
            onScan({
              text: result.getText(),
              format: result.getBarcodeFormat().toString(),
              timestamp: Date.now(),
            });
            
            // If not continuous, stop after first scan
            if (!continuous) {
              this.stopScanning();
            }
          } else if (error) {
            // Check if it's a NotFoundException (normal when no QR code is detected)
            // Use error name/type check instead of instanceof for dynamic imports
            // instanceof doesn't work reliably with dynamically imported classes
            let isNotFoundException = false;
            
            if (NotFoundException) {
              try {
                // Try instanceof first (might work in some cases)
                isNotFoundException = error instanceof NotFoundException;
              } catch (e) {
                // instanceof failed, try other methods
              }
            }
            
            // Fallback checks for NotFoundException
            if (!isNotFoundException) {
              isNotFoundException = 
                error?.name === 'NotFoundException' ||
                error?.constructor?.name === 'NotFoundException' ||
                (typeof error === 'object' && error !== null && 'name' in error && (error as any).name === 'NotFoundException') ||
                (error?.message && typeof error.message === 'string' && error.message.includes('NotFoundException'));
            }
            
            if (!isNotFoundException) {
              // Only log non-NotFoundException errors
              console.warn('ZXing scan error:', error);
              onError?.(error);
            }
            // NotFoundException is normal when no QR code is detected - silently ignore
          }
        }
      );

      return { success: true };
    } catch (error: any) {
      console.error('Error starting ZXing scanner:', error);
      this.isScanning = false;
      return { 
        success: false, 
        error: error.message || 'Failed to start scanner' 
      };
    }
  }

  /**
   * Stop scanning and cleanup
   */
  stopScanning(): void {
    this.isScanning = false;

    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    if (this.videoElement) {
      this.videoElement.srcObject = null;
      this.videoElement = null;
    }

    if (this.reader) {
      try {
        this.reader.reset();
      } catch (e) {
        // Ignore reset errors
      }
      this.reader = null;
    }
    
    // Clear ZXing module cache
    this.zxingModule = null;
  }

  /**
   * Check if camera permissions are granted
   */
  async checkPermissions(): Promise<{ granted: boolean; canAskAgain: boolean }> {
    if (!this.isAvailable()) {
      return { granted: false, canAskAgain: false };
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasVideoInput = devices.some(device => device.kind === 'videoinput');
      
      // If we can enumerate devices and they have labels, permission is granted
      const hasPermission = devices.some(
        device => device.kind === 'videoinput' && device.label !== ''
      );

      return {
        granted: hasPermission,
        canAskAgain: !hasPermission && hasVideoInput,
      };
    } catch (error) {
      return { granted: false, canAskAgain: false };
    }
  }

  /**
   * Request camera permissions
   */
  async requestPermissions(): Promise<{ granted: boolean; canAskAgain: boolean }> {
    if (!this.isAvailable()) {
      return { granted: false, canAskAgain: false };
    }

    try {
      // Try to get media stream to request permission
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
      return { granted: true, canAskAgain: true };
    } catch (error: any) {
      const isPermissionDenied = error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError';
      return {
        granted: false,
        canAskAgain: !isPermissionDenied,
      };
    }
  }
}

// Export singleton instance
export const webQRScannerFallback = new WebQRScannerFallback();

