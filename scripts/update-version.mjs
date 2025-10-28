#!/usr/bin/env node

/**
 * Version Update Script for BSL 2025 HashPass
 * Automatically updates version numbers across all configuration files
 * 
 * Usage:
 *   node scripts/update-version.mjs 1.1.9
 *   node scripts/update-version.mjs 1.2.0 --type=stable
 *   node scripts/update-version.mjs 1.1.10 --type=beta --notes="Bug fixes"
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

// Parse command line arguments
const args = process.argv.slice(2);
const newVersion = args[0];
const releaseType = args.find(arg => arg.startsWith('--type='))?.split('=')[1] || 'beta';
const releaseNotes = args.find(arg => arg.startsWith('--notes='))?.split('=')[1] || '';

if (!newVersion) {
  console.error('❌ Error: Please provide a version number');
  console.log('Usage: node scripts/update-version.mjs <version> [--type=<type>] [--notes="<notes>"]');
  console.log('Example: node scripts/update-version.mjs 1.1.9 --type=beta --notes="Bug fixes"');
  process.exit(1);
}

// Validate version format
const versionRegex = /^\d+\.\d+\.\d+$/;
if (!versionRegex.test(newVersion)) {
  console.error('❌ Error: Version must be in format X.Y.Z (e.g., 1.1.9)');
  process.exit(1);
}

// Validate release type
const validTypes = ['alpha', 'beta', 'rc', 'stable'];
if (!validTypes.includes(releaseType)) {
  console.error(`❌ Error: Release type must be one of: ${validTypes.join(', ')}`);
  process.exit(1);
}

console.log(`🚀 Updating version to ${newVersion} (${releaseType})`);

// Generate build number (timestamp-based)
const buildNumber = parseInt(new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12));
const releaseDate = new Date().toISOString().split('T')[0];

// Function to update the CHANGELOG.md file
function updateChangelog(version, releaseType, notes = '') {
  const changelogPath = path.join(projectRoot, 'CHANGELOG.md');
  if (!fs.existsSync(changelogPath)) {
    console.log('ℹ️ CHANGELOG.md not found, creating a new one');
    const initialContent = `# Changelog\n\nAll notable changes to the BSL 2025 HashPass application will be documented in this file.\n\nThe format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),\nand this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).\n\n## [${version}] - ${releaseDate}\n\n### ${releaseType === 'stable' ? 'Released' : releaseType.charAt(0).toUpperCase() + releaseType.slice(1)}\n- ${notes || `Version ${version} release`}\n\n### Technical Details\n- Version: ${version}\n- Release Type: ${releaseType}\n- Build Number: ${buildNumber}\n- Release Date: ${new Date().toISOString()}\n`;
    fs.writeFileSync(changelogPath, initialContent);
    return;
  }

  let content = fs.readFileSync(changelogPath, 'utf8');
  
  // Check if the changelog already has this version
  if (content.includes(`## [${version}]`)) {
    console.log(`ℹ️ Version ${version} already exists in CHANGELOG.md, skipping update`);
    return;
  }

  // Add the new version at the top of the changelog
  const today = new Date().toISOString().split('T')[0];
  const newEntry = `## [${version}] - ${today}\n\n### ${releaseType === 'stable' ? 'Released' : releaseType.charAt(0).toUpperCase() + releaseType.slice(1)}\n- ${notes || `Version ${version} release`}\n\n### Technical Details\n- Version: ${version}\n- Release Type: ${releaseType}\n- Build Number: ${buildNumber}\n- Release Date: ${new Date().toISOString()}\n\n`;
  
  // Insert the new version after the changelog header
  const headerEnd = content.indexOf('\n## [');
  if (headerEnd !== -1) {
    content = content.slice(0, headerEnd) + '\n' + newEntry + content.slice(headerEnd);
  } else {
    content = newEntry + '\n' + content;
  }
  
  fs.writeFileSync(changelogPath, content);
  console.log(`✅ Updated CHANGELOG.md with version ${version}`);
}

// Files to update
const filesToUpdate = [
  {
    path: 'package.json',
    updates: [
      {
        key: 'version',
        value: newVersion
      }
    ]
  },
  {
    path: 'app.json',
    updates: [
      {
        key: 'expo.version',
        value: newVersion
      }
    ]
  },
  {
    path: 'config/version.ts',
    updates: [
      {
        key: 'buildNumber',
        value: buildNumber,
        pattern: /buildNumber:\s*\d+,/
      },
      {
        key: 'releaseDate',
        value: `'${releaseDate}'`,
        pattern: /releaseDate:\s*'[^']*',/
      },
      {
        key: 'releaseType',
        value: `'${releaseType}'`,
        pattern: /releaseType:\s*'[^']*',/
      },
      {
        key: 'notes',
        value: `'${releaseNotes || `Version ${newVersion} release`}'`,
        pattern: /notes:\s*'[^']*'/
      }
    ]
  }
];

// Update files
let allUpdated = true;

for (const file of filesToUpdate) {
  const filePath = path.join(projectRoot, file.path);
  
  try {
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️  Warning: File ${file.path} not found, skipping...`);
      continue;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    let fileUpdated = false;

    for (const update of file.updates) {
      const keys = update.key.split('.');
      let updated = false;

      if (update.pattern) {
        // Use custom pattern for version.ts file
        if (update.pattern.test(content)) {
          if (update.key === 'buildNumber') {
            content = content.replace(update.pattern, `buildNumber: ${update.value},`);
          } else if (update.key === 'notes') {
            content = content.replace(update.pattern, `${update.key}: ${update.value}`);
          } else {
            content = content.replace(update.pattern, `${update.key}: ${update.value},`);
          }
          updated = true;
        }
      } else if (keys.length === 1) {
        // Simple key update
        const regex = new RegExp(`("${keys[0]}"\\s*:\\s*)"[^"]*"`, 'g');
        if (regex.test(content)) {
          content = content.replace(regex, `$1"${update.value}"`);
          updated = true;
        }
      } else if (keys.length === 2) {
        // Nested key update (like expo.version)
        const regex = new RegExp(`("${keys[0]}"\\s*:\\s*{[^}]*"${keys[1]}"\\s*:\\s*)"[^"]*"`, 'g');
        if (regex.test(content)) {
          content = content.replace(regex, `$1"${update.value}"`);
          updated = true;
        }
      }

      if (updated) {
        fileUpdated = true;
        console.log(`✅ Updated ${file.path}: ${update.key} = ${update.value}`);
      } else {
        console.warn(`⚠️  Could not find ${update.key} in ${file.path}`);
      }
    }

    if (fileUpdated) {
      fs.writeFileSync(filePath, content, 'utf8');
    } else {
      allUpdated = false;
    }

  } catch (error) {
    console.error(`❌ Error updating ${file.path}:`, error.message);
    allUpdated = false;
  }
}

// Update CHANGELOG.md
updateChangelog(newVersion, releaseType, releaseNotes);

// Update version history in version.ts
try {
  const versionTsPath = path.join(projectRoot, 'config/version.ts');
  if (fs.existsSync(versionTsPath)) {
    let content = fs.readFileSync(versionTsPath, 'utf8');
    
    // Add new version to VERSION_HISTORY
    const newVersionEntry = `  '${newVersion}': {
    version: '${newVersion}',
    buildNumber: ${buildNumber},
    releaseDate: '${releaseDate}',
    releaseType: '${releaseType}',
    environment: 'development',
    features: [
      'User pass management system',
      'BSL 2025 event integration',
      'Speaker profile system with avatars',
      'Event agenda with live updates',
      'Unified search and filter system',
      'Dark mode support',
      'Event banner component',
      'Pass card UI with BSL branding',
      'Agenda tabbed interface',
      'Real-time countdown system'
    ],
    bugfixes: [
      'Fixed SVG logo rendering issues',
      'Resolved TypeScript undefined property errors',
      'Fixed agenda data grouping logic',
      'Corrected speaker count discrepancies',
      'Fixed dark mode contrast issues',
      'Resolved navigation routing problems'
    ],
    breakingChanges: [],
    notes: '${releaseNotes || `Version ${newVersion} release`}'
  },`;

    // Insert the new version entry at the beginning of VERSION_HISTORY
    const historyRegex = /(export const VERSION_HISTORY: VersionHistory = {)/;
    if (historyRegex.test(content)) {
      content = content.replace(historyRegex, `$1\n${newVersionEntry}`);
      fs.writeFileSync(versionTsPath, content, 'utf8');
      console.log(`✅ Added ${newVersion} to version history`);
    }
  }
} catch (error) {
  console.error('❌ Error updating version history:', error.message);
  allUpdated = false;
}

// Summary
if (allUpdated) {
  console.log(`\n🎉 Successfully updated to version ${newVersion}!`);
  console.log(`📝 Release type: ${releaseType}`);
  console.log(`📅 Release date: ${releaseDate}`);
  console.log(`🔢 Build number: ${buildNumber}`);
  if (releaseNotes) {
    console.log(`📋 Notes: ${releaseNotes}`);
  }
  console.log('\n📁 Files updated:');
  filesToUpdate.forEach(file => console.log(`   - ${file.path}`));
  console.log('\n🚀 Next steps:');
  console.log('   1. Review the changes: git diff');
  console.log('   2. Test the build: npm run build:web');
  console.log('   3. Commit the changes: git add . && git commit -m "Release v' + newVersion + '"');
  console.log('   4. Push to repository: git push');
  
  // Ask if user wants to build now
  console.log('\n🔨 Would you like to build the project now? (y/n)');
  console.log('   Run: npm run build:web');
} else {
  console.log('\n❌ Some files could not be updated. Please check the errors above.');
  process.exit(1);
}