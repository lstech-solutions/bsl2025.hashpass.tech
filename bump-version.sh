#!/bin/bash

# Exit on error
set -e

# Check if version argument is provided
if [ -z "$1" ]; then
  echo "Usage: ./bump-version.sh <new-version> [--type=<type>] [--notes=\"<notes>\"]"
  echo "Example: ./bump-version.sh 1.3.0 --type=beta --notes=\"Bug fixes and improvements\""
  exit 1
fi

NEW_VERSION=$1
shift  # Remove the version argument to pass remaining to update-version.mjs
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
  echo "❌ Error: Node.js is required but not installed"
  exit 1
fi

# Run update-version.mjs with all remaining arguments
echo "🚀 Updating version to $NEW_VERSION..."
node scripts/update-version.mjs "$NEW_VERSION" "$@"

# Get the new build number from app.json
NEW_BUILD_NUMBER=$(jq -r '.buildNumber' app.json)

# Commit changes
echo "📝 Creating commit for version $NEW_VERSION..."
git add .
git commit -m "chore: bump version to $NEW_VERSION (build $NEW_BUILD_NUMBER)"

# Create and push tag
echo "🏷️  Creating tag v$NEW_VERSION..."
git tag -a "v$NEW_VERSION" -m "Version $NEW_VERSION"

echo "🚀 Pushing changes to $CURRENT_BRANCH..."
git push origin "$CURRENT_BRANCH"
git push --tags

echo "\n🎉 Version $NEW_VERSION (build $NEW_BUILD_NUMBER) has been successfully released!"
echo "🔗 Changes have been pushed to the $CURRENT_BRANCH branch and tagged as v$NEW_VERSION."
