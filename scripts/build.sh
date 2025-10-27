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

# Build for web
echo "[3.1/5] Building web assets..."
if ! npx expo export:web; then
  echo "[WARNING] expo export:web failed, trying alternative build method..."
  if ! npx expo export -p web; then
    echo "[ERROR] All build attempts failed"
    exit 1
  fi
fi

# Debug: Show directory structure
echo "[4/5] Build output structure:"
find . -maxdepth 3 -type d | sort

# Prepare build artifacts
echo "[5/5] Preparing build artifacts..."

# Check possible build output directories
BUILD_DIRS=("web-build" "dist" "build" "out")
FOUND_BUILD=false

for dir in "${BUILD_DIRS[@]}"; do
  if [ -d "$dir" ]; then
    echo "[5.1/5] Found build output in $dir"
    FOUND_BUILD=true
    
    # Copy all files to dist/client, but skip if source is the same as destination
    echo "[5.2/5] Copying files from $dir to dist/client..."
    mkdir -p dist/client
    
    # If the source directory is dist, we need to exclude the client directory to prevent recursion
    if [ "$dir" = "dist" ]; then
      # Create a temporary directory outside of the dist directory
      TEMP_DIR=$(mktemp -d)
      # Copy all files except the client directory
      find "$dir" -mindepth 1 -maxdepth 1 ! -name "client" -exec cp -r {} "$TEMP_DIR/" \;
      # Move the contents to dist/client, creating it if it doesn't exist
      mkdir -p dist/client
      # Use rsync to handle the move with proper directory merging
      if command -v rsync &> /dev/null; then
        rsync -a "$TEMP_DIR/" dist/client/
      else
        # Fallback to cp if rsync is not available
        cp -r "$TEMP_DIR/"* dist/client/ 2>/dev/null || true
      fi
      # Clean up the temporary directory
      rm -rf "$TEMP_DIR"
    else
      # For other directories, copy everything normally
      cp -r $dir/* dist/client/
    fi
    
    # Ensure index.html exists
    if [ ! -f "dist/client/index.html" ]; then
      echo "[5.3/5] Creating default index.html..."
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
    
    break
  fi
done

if [ "$FOUND_BUILD" = false ]; then
  echo "[ERROR] No build output directory found. Tried: ${BUILD_DIRS[*]}"
  exit 1
fi

# Copy public directory if it exists
if [ -d "public" ]; then
  echo "[5.4/5] Copying public directory..."
  cp -r public/* dist/client/
fi

# Copy API routes if they exist (for serverless functions)
if [ -d "api" ]; then
  echo "[5.5/5] Copying API routes..."
  mkdir -p dist/client/api
  cp -r api/* dist/client/api/
  
  # Create a simple API handler if it doesn't exist
  if [ ! -f "dist/client/api/bslatam/agenda+api.ts" ]; then
    mkdir -p dist/client/api/bslatam
    echo "[5.6/5] Creating default API handler..."
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
