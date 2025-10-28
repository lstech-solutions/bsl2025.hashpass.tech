#!/bin/bash

# Exit on error
set -e

# Check if version argument is provided
if [ -z "$1" ]; then
  echo "Usage: ./bump-version.sh <new-version>"
  echo "Example: ./bump-version.sh 1.3.0"
  exit 1
fi

NEW_VERSION=$1
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

# Update version in app.json
echo "Updating version to $NEW_VERSION in app.json..."
jq --arg version "$NEW_VERSION" '.version = $version' app.json > app.json.tmp && mv app.json.tmp app.json

# Update build number (increment by 1)
CURRENT_BUILD_NUMBER=$(jq -r '.buildNumber' app.json)
NEW_BUILD_NUMBER=$((CURRENT_BUILD_NUMBER + 1))
echo "Updating build number to $NEW_BUILD_NUMBER..."
jq --argjson buildNumber $NEW_BUILD_NUMBER '.buildNumber = $buildNumber' app.json > app.json.tmp && mv app.json.tmp app.json

# Commit changes
git add app.json
git commit -m "chore: bump version to $NEW_VERSION (build $NEW_BUILD_NUMBER)"

# Create tag
echo "Creating tag v$NEW_VERSION..."
git tag -a "v$NEW_VERSION" -m "Version $NEW_VERSION"

# Push to current branch
echo "Pushing changes to $CURRENT_BRANCH..."
git push origin "$CURRENT_BRANCH"

# Push tags
echo "Pushing tags..."
git push --tags

echo "\nVersion $NEW_VERSION (build $NEW_BUILD_NUMBER) has been successfully released!"
echo "Changes have been pushed to the $CURRENT_BRANCH branch and tagged as v$NEW_VERSION."
