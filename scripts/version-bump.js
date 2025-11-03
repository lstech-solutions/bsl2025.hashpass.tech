#!/usr/bin/env node

/**
 * Wrapper script for version bumping via npm
 * Reorders arguments so version comes first
 */

const { spawn } = require('child_process');
const path = require('path');

// Get all arguments except node and script name
const args = process.argv.slice(2);

// Find version number (should be first non-flag argument)
const versionRegex = /^\d+\.\d+\.\d+$/;
const versionIndex = args.findIndex(arg => versionRegex.test(arg));

if (versionIndex === -1) {
  console.error('❌ Error: Please provide a version number');
  console.log('Usage: npm run version:bump <version>');
  console.log('Example: npm run version:bump 1.3.7');
  process.exit(1);
}

// Reorder: version first, then flags
const version = args[versionIndex];
const otherArgs = [...args.slice(0, versionIndex), ...args.slice(versionIndex + 1)];
const reorderedArgs = [version, ...otherArgs, '--auto-git'];

// Execute the actual script
const scriptPath = path.join(__dirname, 'update-version.mjs');
const child = spawn('node', [scriptPath, ...reorderedArgs], {
  stdio: 'inherit',
  shell: true
});

child.on('close', (code) => {
  process.exit(code || 0);
});

