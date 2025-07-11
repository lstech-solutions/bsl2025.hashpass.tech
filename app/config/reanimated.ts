// This file ensures Reanimated is loaded before the app starts
import 'react-native-reanimated';

// Configure Reanimated to use the native driver when possible
// This helps with performance
if (typeof window !== 'undefined') {
  // @ts-ignore
  window._frameTimestamp = null;
}

// Enable Layout Animations
import { enableLayoutAnimations } from 'react-native-reanimated';

// Enable layout animations
enableLayoutAnimations(true);
