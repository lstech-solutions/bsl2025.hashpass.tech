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
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

// Parse command line arguments
const args = process.argv.slice(2);

// Find version number (first argument that matches version format)
const versionRegex = /^\d+\.\d+\.\d+$/;
const versionIndex = args.findIndex(arg => versionRegex.test(arg));
const versionArg = versionIndex !== -1 ? args[versionIndex] : args[0];

// If version is not found or doesn't match format, try first non-flag argument
let newVersionFinal = versionArg;
if (!versionRegex.test(newVersionFinal)) {
  const nonFlagArgs = args.filter(arg => !arg.startsWith('--') && !arg.startsWith('-'));
  newVersionFinal = nonFlagArgs[0] || newVersionFinal;
}

const releaseType = args.find(arg => arg.startsWith('--type='))?.split('=')[1] || 'beta';
const releaseNotes = args.find(arg => arg.startsWith('--notes='))?.split('=')[1] || '';

// Git operation flags (optional)
const shouldCommit = args.includes('--commit') || args.includes('-c');
const shouldTag = args.includes('--tag') || args.includes('-t');
const shouldPush = args.includes('--push') || args.includes('-p');
const autoGit = args.includes('--auto-git'); // Shorthand for --commit --tag --push

// Validate version format
if (!newVersionFinal || !versionRegex.test(newVersionFinal)) {
  console.error('❌ Error: Please provide a valid version number in format X.Y.Z');
  console.log('');
  console.log('Usage: node scripts/update-version.mjs <version> [options]');
  console.log('   or: npm run version:update <version> [-- --options]');
  console.log('   or: npm run version:bump <version>');
  console.log('');
  console.log('Options:');
  console.log('  --type=<type>        Release type: alpha, beta, rc, stable (default: beta)');
  console.log('  --notes="<notes>"    Release notes');
  console.log('  --commit, -c         Commit changes automatically');
  console.log('  --tag, -t            Create git tag automatically');
  console.log('  --push, -p           Push to remote automatically');
  console.log('  --auto-git           Shorthand for --commit --tag --push');
  console.log('');
  console.log('Examples:');
  console.log('  node scripts/update-version.mjs 1.3.7');
  console.log('  node scripts/update-version.mjs 1.3.7 --type=beta --notes="Bug fixes"');
  console.log('  node scripts/update-version.mjs 1.3.7 --auto-git');
  console.log('  npm run version:update 1.3.7 -- --type=beta');
  console.log('  npm run version:bump 1.3.7');
  process.exit(1);
}

// Use the validated version (rename to avoid conflict)
const newVersion = newVersionFinal;

// Validate release type
const validTypes = ['alpha', 'beta', 'rc', 'stable'];
if (!validTypes.includes(releaseType)) {
  console.error(`❌ Error: Release type must be one of: ${validTypes.join(', ')}`);
  process.exit(1);
}

console.log(`🚀 Updating version to ${newVersion} (${releaseType})`);
if (autoGit || shouldCommit || shouldTag || shouldPush) {
  console.log(`📋 Git operations: ${autoGit || shouldCommit ? 'commit' : ''} ${autoGit || shouldTag ? 'tag' : ''} ${autoGit || shouldPush ? 'push' : ''}`);
}

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

// Update config/versions.json (used by sidebar version display)
try {
  const versionsJsonPath = path.join(projectRoot, 'config/versions.json');
  if (fs.existsSync(versionsJsonPath)) {
    const versionsData = JSON.parse(fs.readFileSync(versionsJsonPath, 'utf8'));
    
    // Update currentVersion
    versionsData.currentVersion = newVersion;
    
    // Check if version already exists in versions array
    const versionExists = versionsData.versions.some(v => v.version === newVersion);
    
    if (!versionExists) {
      // Add new version entry at the beginning of versions array
      const newVersionEntry = {
        version: newVersion,
        buildNumber: buildNumber,
        releaseDate: releaseDate,
        releaseType: releaseType,
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
        notes: releaseNotes || `Version ${newVersion} release`
      };
      
      versionsData.versions.unshift(newVersionEntry);
    }
    
    // Write updated JSON back to file
    fs.writeFileSync(versionsJsonPath, JSON.stringify(versionsData, null, 2) + '\n', 'utf8');
    console.log(`✅ Updated config/versions.json: currentVersion = ${newVersion}`);
  }
} catch (error) {
  console.error('❌ Error updating config/versions.json:', error.message);
  allUpdated = false;
}

// Update config/git-info.json with current git information
try {
  const gitInfoPath = path.join(projectRoot, 'config/git-info.json');
  
  // Get current git information
  let gitCommit = 'unknown';
  let gitCommitFull = 'unknown';
  let gitBranch = 'main';
  let gitRepoUrl = 'https://github.com/lstech-solutions/bsl2025.hashpass.tech';
  
  try {
    gitCommit = execSync('git rev-parse --short HEAD', { encoding: 'utf8', cwd: projectRoot }).trim();
    gitCommitFull = execSync('git rev-parse HEAD', { encoding: 'utf8', cwd: projectRoot }).trim();
    gitBranch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8', cwd: projectRoot }).trim();
    const remoteUrl = execSync('git remote get-url origin', { encoding: 'utf8', cwd: projectRoot }).trim();
    
    // Convert SSH URL to HTTPS if needed
    if (remoteUrl.startsWith('git@')) {
      gitRepoUrl = remoteUrl.replace('git@github.com:', 'https://github.com/').replace('.git', '');
    } else if (remoteUrl.startsWith('https://')) {
      gitRepoUrl = remoteUrl.replace('.git', '');
    }
  } catch (gitError) {
    console.warn('⚠️  Could not get git information, using defaults');
  }
  
  const gitInfo = {
    gitCommit: gitCommit,
    gitCommitFull: gitCommitFull,
    gitBranch: gitBranch,
    gitRepoUrl: gitRepoUrl
  };
  
  fs.writeFileSync(gitInfoPath, JSON.stringify(gitInfo, null, 2) + '\n', 'utf8');
  console.log(`✅ Updated config/git-info.json: commit = ${gitCommit}, branch = ${gitBranch}`);
} catch (error) {
  console.error('❌ Error updating config/git-info.json:', error.message);
  // Don't fail the whole process if git info update fails
}

// Git operations (if requested)
const performGitOperations = async () => {
  if (!shouldCommit && !shouldTag && !shouldPush && !autoGit) {
    return;
  }

  try {
    const currentBranch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8', cwd: projectRoot }).trim();
    
    // Commit changes
    if (autoGit || shouldCommit) {
      console.log('\n📝 Creating commit for version ' + newVersion + '...');
      execSync('git add .', { cwd: projectRoot, stdio: 'inherit' });
      execSync(`git commit -m "chore: bump version to ${newVersion} (build ${buildNumber})"`, { 
        cwd: projectRoot, 
        stdio: 'inherit' 
      });
    }

    // Create tag
    if (autoGit || shouldTag) {
      console.log('🏷️  Creating tag v' + newVersion + '...');
      execSync(`git tag -a "v${newVersion}" -m "Version ${newVersion}"`, { 
        cwd: projectRoot, 
        stdio: 'inherit' 
      });
    }

    // Push changes
    if (autoGit || shouldPush) {
      console.log('🚀 Pushing changes to ' + currentBranch + '...');
      execSync(`git push origin "${currentBranch}"`, { 
        cwd: projectRoot, 
        stdio: 'inherit' 
      });
      if (autoGit || shouldTag) {
        execSync('git push --tags', { 
          cwd: projectRoot, 
          stdio: 'inherit' 
        });
      }
      console.log(`\n🎉 Version ${newVersion} (build ${buildNumber}) has been successfully released!`);
      console.log(`🔗 Changes have been pushed to the ${currentBranch} branch and tagged as v${newVersion}.`);
    }
  } catch (gitError) {
    console.error('❌ Error performing git operations:', gitError.message);
    console.log('\n⚠️  Git operations failed, but version files were updated successfully.');
    console.log('You can manually commit and push the changes.');
  }
};

// Summary
(async () => {
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
    console.log('   - config/versions.json');
    console.log('   - config/git-info.json');
    console.log('   - CHANGELOG.md');
    
    // Perform git operations if requested
    await performGitOperations();
    
    if (!shouldCommit && !shouldTag && !shouldPush && !autoGit) {
      console.log('\n🚀 Next steps:');
      console.log('   1. Review the changes: git diff');
      console.log('   2. Test the build: npm run build:web');
      console.log('   3. Commit the changes: git add . && git commit -m "chore: bump version to ' + newVersion + '"');
      console.log('   4. Create tag: git tag -a "v' + newVersion + '" -m "Version ' + newVersion + '"');
      console.log('   5. Push to repository: git push origin <branch> && git push --tags');
      console.log('\n💡 Tip: Use --auto-git flag to automatically commit, tag, and push');
      console.log('   Example: npm run version:update ' + newVersion + ' -- --auto-git');
    }
  } else {
    console.log('\n❌ Some files could not be updated. Please check the errors above.');
    process.exit(1);
  }
})();