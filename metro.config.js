const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const {
    wrapWithReanimatedMetroConfig,
  } = require('react-native-reanimated/metro-config');

const config = getDefaultConfig(__dirname);

// Web-only packages that should not be bundled on native
const webOnlyPackages = [
  'ethers',
  'siwe',
  '@solana/web3.js',
  'bs58',
  '@noble/ed25519',
  '@adraffy/ens-normalize',
];

// Add resolver configuration for ethers and related packages
config.resolver = {
  ...config.resolver,
  extraNodeModules: {
    ...config.resolver.extraNodeModules,
    // Ensure these modules can be resolved on web
    '@adraffy/ens-normalize': require.resolve('@adraffy/ens-normalize'),
  },
  // Add source extensions
  sourceExts: [...(config.resolver.sourceExts || []), 'mjs', 'cjs'],
  // Custom resolveRequest to handle problematic imports
  resolveRequest: (context, moduleName, platform) => {
    // Handle qrcode trying to import server module - return empty module
    if (moduleName === './server' && context.originModulePath?.includes('qrcode')) {
      return { type: 'empty' };
    }
    
    // On native platforms, block web-only packages
    // On web, allow them to be resolved normally
    if (platform !== 'web') {
      // Check if this is a web-only package
      for (const pkg of webOnlyPackages) {
        if (moduleName === pkg || moduleName.startsWith(`${pkg}/`)) {
          return { type: 'empty' };
        }
      }
    }
    
    // Use default resolution for everything else
    return context.resolveRequest(context, moduleName, platform);
  },
};

// Reduce memory usage
config.maxWorkers = 1; // Use single worker to reduce memory
config.cacheStores = config.cacheStores || [];

// Optimize transformer for memory
config.transformer = {
  ...config.transformer,
  minifierConfig: {
    ...config.transformer?.minifierConfig,
    keep_classnames: false,
    keep_fnames: false,
  },
};

module.exports = wrapWithReanimatedMetroConfig(config);
