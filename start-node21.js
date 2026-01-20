#!/usr/bin/env node

/**
 * Wrapper to force Node.js 21
 * This checks which Node version is running and warns if it's too old
 */

const { execSync } = require('child_process');
const { version } = process;

console.log('=== Node.js Version Check ===');
console.log('Current Node.js version:', version);

// Extract major version number
const majorVersion = parseInt(version.slice(1).split('.')[0]);

if (majorVersion < 14) {
  console.error('❌ ERROR: Node.js version is too old!');
  console.error(`   Current: ${version}`);
  console.error('   Required: 14.0.0 or higher');
  console.error('');
  console.error('Your Plesk is using an outdated Node.js version.');
  console.error('Please contact your hosting provider to update Node.js.');
  process.exit(1);
}

console.log('✅ Node.js version is compatible');
console.log('');

// Try to find and use Node.js 21 if available
const possiblePaths = [
  '/opt/plesk/node/21/bin/node',
  '/opt/plesk/node/20/bin/node',
  '/opt/plesk/node/18/bin/node',
  '/usr/local/bin/node',
  '/usr/bin/node'
];

let node21Path = null;

for (const path of possiblePaths) {
  try {
    const fs = require('fs');
    if (fs.existsSync(path)) {
      const testVersion = execSync(`${path} --version`, { encoding: 'utf8' }).trim();
      const testMajor = parseInt(testVersion.slice(1).split('.')[0]);
      console.log(`Found Node.js at ${path}: ${testVersion}`);
      
      if (testMajor >= 18 && !node21Path) {
        node21Path = path;
        console.log(`✅ Will use: ${path}`);
      }
    }
  } catch (e) {
    // Path doesn't exist or can't execute, skip
  }
}

console.log('');
console.log('Starting server...');
console.log('='.repeat(50));

// Load the actual server
require('./dist/server.js');
