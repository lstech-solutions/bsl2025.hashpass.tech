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

// Serve static files from public folder in development
// This middleware intercepts requests BEFORE Metro's asset resolver
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => {
    const path = require('path');
    const fs = require('fs');
    
    // Return a new middleware that wraps the original
    return (req, res, next) => {
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

// Optimize transformer for memory
config.transformer = {
  ...config.transformer,
  minifierConfig: {
    ...config.transformer?.minifierConfig,
    keep_classnames: false,
    keep_fnames: false,
  },
};

module.exports = withNativeWind(wrapWithReanimatedMetroConfig(config), {
  input: './app/global.css',
});
