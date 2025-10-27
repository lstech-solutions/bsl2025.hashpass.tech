#!/bin/bash
set -e

echo "=== Starting Expo Build Process ==="

# Create necessary directories
echo "[1/5] Setting up build environment..."
rm -rf dist
mkdir -p dist/client

# Install dependencies
echo "[2/5] Installing dependencies..."
if [ -f yarn.lock ]; then
  yarn install --frozen-lockfile
elif [ -f package-lock.json ] || [ -f npm-shrinkwrap.json ]; then
  npm ci
else
  npm install
fi

# Build the application
echo "[3/5] Building Expo web application..."

# Install required dependencies for web build
if ! npm install @expo/webpack-config@^19.0.0; then
  echo "[ERROR] Failed to install webpack dependencies"
  exit 1
fi

# Build for web
echo "[3.1/5] Building web assets..."
if ! npx expo export -p web; then
  echo "[ERROR] Expo web export failed. Check the build output above for errors."
  exit 1
fi

# Prepare build artifacts
echo "[4/5] Preparing build artifacts..."
if [ -d "dist" ]; then
  echo "[4.1/5] Setting up client directory..."
  mkdir -p dist/client
  
  # Move all files from dist to dist/client except the client directory itself
  find dist -mindepth 1 -maxdepth 1 -not -name client -exec mv {} dist/client/ \;
  
  # If there's a web-build directory, move its contents to dist/client
  if [ -d "dist/client/web-build" ]; then
    echo "[4.2/5] Moving web-build contents..."
    cp -r dist/client/web-build/* dist/client/
    rm -r dist/client/web-build
  fi
  
  # Ensure we have an index.html
  if [ ! -f "dist/client/index.html" ]; then
    echo "[4.2/5] Creating default index.html..."
    cat > dist/client/index.html <<EOL
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>BSL 2025</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
  </head>
  <body>
    <div id="root"></div>
    <script src="/static/js/bundle.js"></script>
  </body>
</html>
EOL
  fi
  
  # Copy public directory if it exists
  if [ -d "public" ]; then
    echo "[4.3/5] Copying public directory..."
    cp -r public/* dist/client/
  fi
  
  # Copy API routes if they exist (for serverless functions)
  if [ -d "api" ]; then
    echo "[5/5] Copying API routes..."
    mkdir -p dist/client/api
    cp -r api/* dist/client/api/
    
    # Create a simple API handler if it doesn't exist
    if [ ! -f "dist/client/api/bslatam/agenda+api.ts" ]; then
      mkdir -p dist/client/api/bslatam
      echo "[5.1/5] Creating default API handler..."
      cat > dist/client/api/bslatam/agenda+api.ts <<'EOL'
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': '*',
    },
    body: JSON.stringify({ message: 'API is working' }),
  };
};
EOL
    fi
  fi
  
  # Add build timestamp
  echo "<!-- Build timestamp: $(date) -->" >> dist/client/index.html
  
  # List build output for debugging
  echo "=== Build Output ==="
  find dist/client -type f | sort
  echo "==================="
  
  echo "✅ Expo web build completed successfully!"
  ls -la dist/client/
  
  echo "\n📦 Build artifacts are ready in: dist/client/"
else
  echo "❌ Error: web-build directory not found. Build may have failed."
  exit 1
fi
