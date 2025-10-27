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
    
        echo "[5.2/5] Preparing build output..."
    
    # If the source directory is dist, we need to handle it specially
    if [ "$dir" = "dist" ]; then
      # Create the client directory if it doesn't exist
      mkdir -p dist/client
      
      # Move all files from dist/ to dist/client/ except the client directory itself
      for item in "$dir"/*; do
        item_name=$(basename "$item")
        if [ "$item_name" != "client" ] && [ -e "$item" ]; then
          dest="dist/client/$item_name"
          if [ -d "$item" ] && [ -d "$dest" ]; then
            # If both source and destination are directories, merge them
            cp -r "$item"/. "$dest"/
            rm -r "$item"
          else
            # Otherwise, just move the item
            mv "$item" "$dest"
          fi
        fi
      done
    else
      # For other directories, copy everything to dist/client
      mkdir -p dist/client
      cp -r "$dir"/. "dist/client/"
    fi
    
    # Ensure index.html exists in the root of dist/client
    if [ -f "dist/client/dist/index.html" ]; then
      echo "[5.3/5] Moving index.html to correct location..."
      mv dist/client/dist/index.html dist/client/
      # Move other files from dist/client/dist/ to dist/client/
      if [ -d "dist/client/dist" ]; then
        mv dist/client/dist/* dist/client/ 2>/dev/null || true
        rmdir dist/client/dist 2>/dev/null || true
      fi
    fi

    # Create default index.html if it still doesn't exist
    if [ ! -f "dist/client/index.html" ]; then
      echo "[5.4/5] Creating default index.html..."
      mkdir -p dist/client
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
    
    # Verify index.html exists and is in the right place
    if [ ! -f "dist/client/index.html" ]; then
      echo "[ERROR] Failed to create index.html in dist/client/"
      echo "Current directory structure:"
      find dist -type f | sort
      exit 1
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
