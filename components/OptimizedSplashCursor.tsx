import React, { useEffect, useRef } from 'react';
import { SplashCursor } from './SplashBackground';

/**
 * Optimized wrapper for SplashCursor that limits frame rate
 * to reduce resource consumption
 */
export function OptimizedSplashCursor(props: any) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameSkipRef = useRef(0);
  const targetFPS = 30; // Limit to 30 FPS instead of 60
  const skipFrames = Math.floor(60 / targetFPS); // Skip every other frame

  useEffect(() => {
    // Override requestAnimationFrame to limit FPS
    const originalRAF = window.requestAnimationFrame;
    let lastFrameTime = 0;
    const frameInterval = 1000 / targetFPS;

    window.requestAnimationFrame = function(callback: FrameRequestCallback) {
      const currentTime = performance.now();
      const elapsed = currentTime - lastFrameTime;

      if (elapsed >= frameInterval) {
        lastFrameTime = currentTime - (elapsed % frameInterval);
        return originalRAF(callback);
      } else {
        frameSkipRef.current++;
        // Skip this frame
        return originalRAF(function() {
          // Do nothing, effectively skipping the frame
        });
      }
    };

    return () => {
      // Restore original requestAnimationFrame on unmount
      window.requestAnimationFrame = originalRAF;
    };
  }, []);

  return <SplashCursor {...props} />;
}

