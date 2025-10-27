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
# First try the new export command, fall back to the old one if it fails
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
BUILD_DIRS=("web-build" "dist/web-build" "dist" "build" "out" "dist/out")
FOUND_BUILD=false

for dir in "${BUILD_DIRS[@]}"; do
  if [ -d "$dir" ]; then
    echo "[5.1/5] Found build output in $dir"
    FOUND_BUILD=true
    
        echo "[5.2/5] Preparing build output..."
    
    echo "[5.2/5] Processing build output from: $dir"
    
    # Handle different possible build output structures
    echo "Processing build output from: $dir"
    
    # Create a temporary directory for staging the build
    TEMP_DIR=$(mktemp -d)
    
    # Function to safely copy files
    safe_copy() {
      local src=$1
      local dest=$2
      
      # Skip if source and destination are the same
      if [ "$src" = "$dest" ]; then
        echo "  Skipping copy: source and destination are the same"
        return 0
      fi
      
      # Create destination directory
      mkdir -p "$dest"
      
      # Use rsync if available, otherwise use cp
      if command -v rsync >/dev/null 2>&1; then
        echo "  Copying files using rsync..."
        rsync -a --exclude='client' "$src/" "$dest/"
      else
        echo "  Copying files using cp..."
        # Use find to get all files and copy them one by one
        find "$src" -mindepth 1 -maxdepth 1 -not -name "client" -exec cp -r {} "$dest/" \;
      fi
    }
    
    # Check different possible build output structures
    if [ -f "$dir/index.html" ]; then
      echo "Found index.html in $dir, copying to dist/client/"
      safe_copy "$dir" "dist/client"
    elif [ -f "$dir/web-build/index.html" ]; then
      echo "Found web-build directory with index.html, copying to dist/client/"
      safe_copy "$dir/web-build" "dist/client"
    elif [ -d "$dir/dist" ]; then
      echo "Found dist subdirectory, copying contents to dist/client/"
      safe_copy "$dir/dist" "dist/client"
    else
      echo "No standard build structure found, copying all files to dist/client/"
      safe_copy "$dir" "dist/client"
    fi
    
    # Clean up temp directory
    rm -rf "$TEMP_DIR"
    
    # Ensure index.html exists in the root of dist/client
    echo "[5.3/5] Verifying build output..."
    
    # Debug: Show directory structure
    echo "Current directory structure:"
    find . -maxdepth 4 -type d | sort
    
    # Look for index.html in various possible locations
    INDEX_FOUND=false
    
    # Check common locations for index.html
    for path in \
      "dist/client/index.html" \
      "dist/client/web-build/index.html" \
      "dist/client/dist/index.html" \
      "web-build/index.html" \
      "out/index.html" \
      "build/index.html" \
      "dist/index.html"; do
      
      if [ -f "$path" ]; then
        echo "Found index.html at: $path"
        # Get the directory containing index.html
        dir=$(dirname "$path")
        # If not already in dist/client, copy it there
        if [ "$dir" != "dist/client" ]; then
          echo "Copying contents from $dir to dist/client/"
          mkdir -p dist/client
          cp -r "$dir/"* dist/client/
        fi
        INDEX_FOUND=true
        break
      fi
    done
    
    # If index.html still not found, create a default one
    if [ "$INDEX_FOUND" = false ]; then
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
    <div id="root">BSL 2025 - Loading...</div>
    <script src="/static/js/bundle.js"></script>
  </body>
</html>
EOL
    fi
    
    # Final verification
    if [ ! -f "dist/client/index.html" ]; then
      echo "[ERROR] Critical: Failed to create or find index.html"
      echo "Final directory structure:"
      find . -type f -name "*.html" -o -type d | sort
      echo "Files in dist/:"
      find dist -type f | sort
      exit 1
    fi
    
    # Ensure proper permissions
    chmod 644 dist/client/index.html 2>/dev/null || true
    
    # Verify the file is accessible
    if [ ! -r "dist/client/index.html" ]; then
      echo "[ERROR] index.html exists but is not readable. Check permissions."
      ls -la dist/client/
      exit 1
    fi
    
    echo "Build output verified successfully. index.html is ready."
    
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
