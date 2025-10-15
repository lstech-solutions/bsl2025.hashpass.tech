#!/usr/bin/env node

/**
 * Version Update Automation Script
 * Updates version information across the application
 * 
 * Usage:
 *   node scripts/update-version.mjs [version] [type] [--auto]
 * 
 * Examples:
 *   node scripts/update-version.mjs 1.3.0 patch
 *   node scripts/update-version.mjs 2.0.0 major --auto
 *   node scripts/update-version.mjs --auto (auto-increment patch)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

// Version configuration file path
const VERSION_CONFIG_PATH = path.join(projectRoot, 'config', 'version.ts');

// Package.json path
const PACKAGE_JSON_PATH = path.join(projectRoot, 'package.json');

// App.json path (for Expo)
const APP_JSON_PATH = path.join(projectRoot, 'app.json');

// Parse command line arguments
const args = process.argv.slice(2);
const newVersion = args[0];
const versionType = args[1] || 'patch';
const isAuto = args.includes('--auto');

// Version types
const VERSION_TYPES = {
  major: 0,
  minor: 1,
  patch: 2
};

/**
 * Parse version string into components
 */
function parseVersion(version) {
  const parts = version.split('.').map(Number);
  return {
    major: parts[0] || 0,
    minor: parts[1] || 0,
    patch: parts[2] || 0
  };
}

/**
 * Increment version based on type
 */
function incrementVersion(currentVersion, type) {
  const parsed = parseVersion(currentVersion);
  
  switch (type) {
    case 'major':
      parsed.major += 1;
      parsed.minor = 0;
      parsed.patch = 0;
      break;
    case 'minor':
      parsed.minor += 1;
      parsed.patch = 0;
      break;
    case 'patch':
      parsed.patch += 1;
      break;
    default:
      throw new Error(`Invalid version type: ${type}`);
  }
  
  return `${parsed.major}.${parsed.minor}.${parsed.patch}`;
}

/**
 * Generate build number based on date and time
 */
function generateBuildNumber() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');
  
  return parseInt(`${year}${month}${day}${hour}${minute}`);
}

/**
 * Get current version from config file
 */
function getCurrentVersion() {
  try {
    const content = fs.readFileSync(VERSION_CONFIG_PATH, 'utf8');
    const match = content.match(/version:\s*['"`]([^'"`]+)['"`]/);
    return match ? match[1] : '1.0.0';
  } catch (error) {
    console.error('Error reading version config:', error.message);
    return '1.0.0';
  }
}

/**
 * Update version in config file
 */
function updateVersionConfig(newVersion, versionType) {
  try {
    let content = fs.readFileSync(VERSION_CONFIG_PATH, 'utf8');
    
    // Generate new build number
    const buildNumber = generateBuildNumber();
    const releaseDate = new Date().toISOString().split('T')[0];
    
    // Determine release type based on version
    let releaseType = 'stable';
    if (newVersion.includes('alpha') || newVersion.includes('a')) {
      releaseType = 'alpha';
    } else if (newVersion.includes('beta') || newVersion.includes('b')) {
      releaseType = 'beta';
    } else if (newVersion.includes('rc')) {
      releaseType = 'rc';
    }
    
    // Update version
    content = content.replace(
      /version:\s*['"`][^'"`]+['"`]/,
      `version: '${newVersion}'`
    );
    
    // Update build number
    content = content.replace(
      /buildNumber:\s*\d+/,
      `buildNumber: ${buildNumber}`
    );
    
    // Update release date
    content = content.replace(
      /releaseDate:\s*['"`][^'"`]+['"`]/,
      `releaseDate: '${releaseDate}'`
    );
    
    // Update release type
    content = content.replace(
      /releaseType:\s*['"`][^'"`]+['"`]/,
      `releaseType: '${releaseType}'`
    );
    
    fs.writeFileSync(VERSION_CONFIG_PATH, content);
    console.log(`✅ Updated version config: ${newVersion}`);
    
    return { buildNumber, releaseDate, releaseType };
  } catch (error) {
    console.error('Error updating version config:', error.message);
    throw error;
  }
}

/**
 * Update package.json version
 */
function updatePackageJson(newVersion) {
  try {
    const packageJson = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf8'));
    packageJson.version = newVersion;
    fs.writeFileSync(PACKAGE_JSON_PATH, JSON.stringify(packageJson, null, 2) + '\n');
    console.log(`✅ Updated package.json: ${newVersion}`);
  } catch (error) {
    console.error('Error updating package.json:', error.message);
    throw error;
  }
}

/**
 * Update app.json version (for Expo)
 */
function updateAppJson(newVersion) {
  try {
    const appJson = JSON.parse(fs.readFileSync(APP_JSON_PATH, 'utf8'));
    appJson.expo.version = newVersion;
    appJson.expo.versionCode = generateBuildNumber();
    fs.writeFileSync(APP_JSON_PATH, JSON.stringify(appJson, null, 2) + '\n');
    console.log(`✅ Updated app.json: ${newVersion}`);
  } catch (error) {
    console.error('Error updating app.json:', error.message);
    throw error;
  }
}

/**
 * Create version changelog entry
 */
function createChangelogEntry(newVersion, versionType, buildInfo) {
  const changelogPath = path.join(projectRoot, 'CHANGELOG.md');
  const entry = `
## [${newVersion}] - ${buildInfo.releaseDate}

### ${versionType === 'major' ? 'Major Changes' : versionType === 'minor' ? 'New Features' : 'Bug Fixes'}
- Version bump to ${newVersion}
- Build: ${buildInfo.buildNumber}
- Release Type: ${buildInfo.releaseType}

### Technical Details
- Automated version update
- Build timestamp: ${new Date().toISOString()}
`;

  try {
    let changelog = '';
    if (fs.existsSync(changelogPath)) {
      changelog = fs.readFileSync(changelogPath, 'utf8');
    }
    
    // Insert new entry at the beginning (after title if exists)
    const lines = changelog.split('\n');
    const titleIndex = lines.findIndex(line => line.startsWith('# '));
    const insertIndex = titleIndex >= 0 ? titleIndex + 2 : 0;
    
    lines.splice(insertIndex, 0, entry.trim());
    fs.writeFileSync(changelogPath, lines.join('\n'));
    console.log(`✅ Updated CHANGELOG.md`);
  } catch (error) {
    console.error('Error updating changelog:', error.message);
  }
}

/**
 * Main function
 */
async function main() {
  try {
    console.log('🚀 Starting version update process...\n');
    
    // Get current version
    const currentVersion = getCurrentVersion();
    console.log(`📋 Current version: ${currentVersion}`);
    
    // Determine new version
    let targetVersion;
    if (newVersion) {
      targetVersion = newVersion;
    } else if (isAuto) {
      targetVersion = incrementVersion(currentVersion, versionType);
    } else {
      console.error('❌ Please provide a version number or use --auto flag');
      process.exit(1);
    }
    
    console.log(`🎯 Target version: ${targetVersion}\n`);
    
    // Update version in config file
    const buildInfo = updateVersionConfig(targetVersion, versionType);
    
    // Update package.json
    updatePackageJson(targetVersion);
    
    // Update app.json
    updateAppJson(targetVersion);
    
    // Create changelog entry
    createChangelogEntry(targetVersion, versionType, buildInfo);
    
    console.log('\n🎉 Version update completed successfully!');
    console.log(`📊 Summary:`);
    console.log(`   Version: ${targetVersion}`);
    console.log(`   Build: ${buildInfo.buildNumber}`);
    console.log(`   Release Date: ${buildInfo.releaseDate}`);
    console.log(`   Release Type: ${buildInfo.releaseType}`);
    
    // Log version info
    console.log('\n📝 Next steps:');
    console.log('   1. Review the changes in config/version.ts');
    console.log('   2. Update features, bugfixes, and notes in version config');
    console.log('   3. Commit changes with: git add . && git commit -m "chore: bump version to ' + targetVersion + '"');
    console.log('   4. Create a git tag: git tag v' + targetVersion);
    
  } catch (error) {
    console.error('❌ Version update failed:', error.message);
    process.exit(1);
  }
}

// Run the script
main();
