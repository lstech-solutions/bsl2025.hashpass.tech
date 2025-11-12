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

// Store original resolveRequest if it exists
const originalResolveRequest = config.resolver?.resolveRequest;

// Add resolver configuration for ethers and related packages
config.resolver = {
  ...config.resolver,
  extraNodeModules: {
    ...config.resolver?.extraNodeModules,
    // Ensure these modules can be resolved on web
    '@adraffy/ens-normalize': require.resolve('@adraffy/ens-normalize'),
  },
  // Add source extensions
  sourceExts: [...(config.resolver?.sourceExts || []), 'mjs', 'cjs'],
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
    
    // Use original resolveRequest if it exists, otherwise use default
    if (originalResolveRequest) {
      return originalResolveRequest(context, moduleName, platform);
    }
    return context.resolveRequest(context, moduleName, platform);
  },
};

// Serve static files from public folder in development
// This middleware intercepts requests BEFORE Metro's asset resolver
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => {
    const path = require('path');
    const fs = require('fs');
    
    // Return a new middleware that wraps the original
    return (req, res, next) => {
      // Intercept /config/versions.json requests
      if (req.url && req.url === '/config/versions.json') {
        const configPath = path.join(__dirname, 'config', 'versions.json');
        if (fs.existsSync(configPath)) {
          const stat = fs.statSync(configPath);
          res.writeHead(200, {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'Content-Length': stat.size,
          });
          return fs.createReadStream(configPath).pipe(res);
        }
      }
      
      // Intercept /api/config/versions requests (for API route compatibility)
      if (req.url && req.url === '/api/config/versions') {
        const configPath = path.join(__dirname, 'config', 'versions.json');
        if (fs.existsSync(configPath)) {
          const stat = fs.statSync(configPath);
          res.writeHead(200, {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'Content-Length': stat.size,
          });
          return fs.createReadStream(configPath).pipe(res);
        }
      }
      
      // Intercept /assets/ requests BEFORE Metro tries to resolve them
      if (req.url && req.url.startsWith('/assets/')) {
        const contentTypes = {
          '.png': 'image/png',
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.gif': 'image/gif',
          '.svg': 'image/svg+xml',
          '.webp': 'image/webp',
        };
        
        // Try public folder first
        const publicPath = path.join(__dirname, 'public', req.url);
        if (fs.existsSync(publicPath)) {
          const stat = fs.statSync(publicPath);
          if (stat.isFile()) {
            const ext = path.extname(publicPath).toLowerCase();
            res.writeHead(200, {
              'Content-Type': contentTypes[ext] || 'application/octet-stream',
              'Content-Length': stat.size,
              'Cache-Control': 'public, max-age=31536000',
            });
            return fs.createReadStream(publicPath).pipe(res);
          }
        }
        
        // Fallback: try assets folder (without /assets/ prefix)
        const fileName = req.url.replace('/assets/', '');
        const assetsPath = path.join(__dirname, 'assets', fileName);
        if (fs.existsSync(assetsPath)) {
          const stat = fs.statSync(assetsPath);
          if (stat.isFile()) {
            const ext = path.extname(assetsPath).toLowerCase();
            res.writeHead(200, {
              'Content-Type': contentTypes[ext] || 'application/octet-stream',
              'Content-Length': stat.size,
              'Cache-Control': 'public, max-age=31536000',
            });
            return fs.createReadStream(assetsPath).pipe(res);
          }
        }
      }
      // If not handled, pass to original middleware
      return middleware(req, res, next);
    };
  },
};

// Reduce memory usage
config.maxWorkers = 1; // Use single worker to reduce memory
config.cacheStores = config.cacheStores || [];

// Optimize transformer for memory and production builds
config.transformer = {
  ...config.transformer,
  minifierConfig: {
    ...config.transformer?.minifierConfig,
    keep_classnames: false,
    keep_fnames: false,
  },
  // Increase worker timeout for production builds
  workerTimeout: 60000,
  // Enable unstable_allowRequireContext for better module resolution
  unstable_allowRequireContext: true,
};

// Add additional resolver options for better module resolution
// Merge with existing resolver config to avoid conflicts
const existingAssetExts = config.resolver?.assetExts || [];
const newAssetExts = ['bin', 'txt', 'jpg', 'png', 'json', 'svg', 'gif', 'webp'];
const allAssetExts = [...new Set([...existingAssetExts, ...newAssetExts])];

config.resolver = {
  ...config.resolver,
  // Ensure resolverMainFields doesn't conflict with existing config
  resolverMainFields: config.resolver?.resolverMainFields || ['react-native', 'browser', 'main'],
  // Merge asset extensions
  assetExts: allAssetExts,
};

// Conditionally apply NativeWind and Reanimated based on environment
// During production export, these can cause issues with Metro bundler
const isProductionExport = process.env.NODE_ENV === 'production' || process.env.EXPO_PUBLIC_ENABLE_STATIC_EXPORT === 'true';

let finalConfig = config;

// Only wrap with Reanimated and NativeWind if not doing static export
if (!isProductionExport) {
  finalConfig = wrapWithReanimatedMetroConfig(finalConfig);
  finalConfig = withNativeWind(finalConfig, {
    input: './app/global.css',
  });
} else {
  // For production export, apply NativeWind but skip Reanimated to avoid issues
  finalConfig = withNativeWind(finalConfig, {
    input: './app/global.css',
  });
}

module.exports = finalConfig;
