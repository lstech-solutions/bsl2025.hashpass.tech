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
  // Don't override resolveRequest - let Metro use default resolution
  // Metro's platform-specific file handling will ensure .web.ts files
  // are only bundled on web platform
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
