#!/bin/bash
set -e

# Create necessary directories
echo "Creating build directories..."
mkdir -p dist/client

# Install dependencies
echo "Installing dependencies..."
if [ -f yarn.lock ]; then
  yarn install --frozen-lockfile
elif [ -f package-lock.json ] || [ -f npm-shrinkwrap.json ]; then
  npm ci
else
  npm install
fi

# Build the application
echo "Building application..."
npm run build:web

# Ensure client directory exists
mkdir -p dist/client

# Add build timestamp
echo "Adding build timestamp..."
echo "<!-- Build timestamp: $(date) -->" >> dist/client/index.html

# Copy server files if they exist
if [ -d "dist/server" ]; then
  echo "Copying server files..."
  cp -r dist/server/* dist/client/
fi

# Copy service worker if it exists
if [ -f "dist/sw.js" ]; then
  echo "Copying service worker..."
  cp dist/sw.js dist/client/
fi

# Copy API routes if they exist
if [ -d "app/api/bslatam" ]; then
  echo "Copying API routes..."
  mkdir -p dist/client/api/bslatam
  cp -r app/api/bslatam/*.ts dist/client/api/bslatam/
fi

echo "Build completed successfully!"
ls -la dist/client/
