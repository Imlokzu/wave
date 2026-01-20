/**
 * Verify Hallucination Fix is Active
 * 
 * This script checks if the server is using the new searchWithContent method
 */

const fs = require('fs');
const path = require('path');

console.log('╔═══════════════════════════════════════════════════════════════╗');
console.log('║         Verifying Hallucination Fix Installation              ║');
console.log('╚═══════════════════════════════════════════════════════════════╝');
console.log();

// Check if compiled files exist
const distPath = path.join(__dirname, 'dist', 'services', 'DeepSeekAIService.js');
const searchServicePath = path.join(__dirname, 'dist', 'services', 'SearchService.js');

console.log('Checking compiled files...');
console.log();

if (!fs.existsSync(distPath)) {
  console.log('❌ DeepSeekAIService.js not found in dist/');
  console.log('   Run: npm run build');
  process.exit(1);
}

if (!fs.existsSync(searchServicePath)) {
  console.log('❌ SearchService.js not found in dist/');
  console.log('   Run: npm run build');
  process.exit(1);
}

console.log('✅ Compiled files exist');
console.log();

// Check if searchWithContent is in compiled code
const deepSeekContent = fs.readFileSync(distPath, 'utf8');
const searchServiceContent = fs.readFileSync(searchServicePath, 'utf8');

console.log('Checking for new methods...');
console.log();

let allGood = true;

// Check DeepSeekAIService
if (deepSeekContent.includes('searchWithContent')) {
  console.log('✅ DeepSeekAIService uses searchWithContent');
} else {
  console.log('❌ DeepSeekAIService still uses old searchDuckDuckGo');
  console.log('   Run: npm run build');
  allGood = false;
}

// Check SearchService
if (searchServiceContent.includes('fetchPageContent')) {
  console.log('✅ SearchService has fetchPageContent method');
} else {
  console.log('❌ SearchService missing fetchPageContent method');
  console.log('   Run: npm run build');
  allGood = false;
}

if (searchServiceContent.includes('searchWithContent')) {
  console.log('✅ SearchService has searchWithContent method');
} else {
  console.log('❌ SearchService missing searchWithContent method');
  console.log('   Run: npm run build');
  allGood = false;
}

if (searchServiceContent.includes('formatResultsWithContentForAI')) {
  console.log('✅ SearchService has formatResultsWithContentForAI method');
} else {
  console.log('❌ SearchService missing formatResultsWithContentForAI method');
  console.log('   Run: npm run build');
  allGood = false;
}

console.log();

if (allGood) {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                    ✅ FIX IS ACTIVE                           ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  console.log();
  console.log('The hallucination fix is properly installed!');
  console.log();
  console.log('Next steps:');
  console.log('  1. Restart your server: npm start');
  console.log('  2. Test in AI chat: "Compare Honor Magic 6 Pro vs OnePlus Ace 5 Pro"');
  console.log('  3. Watch console for:');
  console.log('     [DeepSeek] Searching with full content for: "..."');
  console.log('     [Search] Fetching content from: https://...');
  console.log('     [Search] Extracted XXXX characters from https://...');
  console.log();
} else {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                    ❌ FIX NOT ACTIVE                          ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  console.log();
  console.log('The fix is not active. Please run:');
  console.log('  npm run build');
  console.log();
  console.log('Then restart your server:');
  console.log('  npm start');
  console.log();
}

// Check source files
console.log('Source file status:');
console.log();

const srcDeepSeek = path.join(__dirname, 'src', 'services', 'DeepSeekAIService.ts');
const srcSearch = path.join(__dirname, 'src', 'services', 'SearchService.ts');

if (fs.existsSync(srcDeepSeek)) {
  const srcContent = fs.readFileSync(srcDeepSeek, 'utf8');
  if (srcContent.includes('searchWithContent')) {
    console.log('✅ Source: DeepSeekAIService.ts has fix');
  } else {
    console.log('❌ Source: DeepSeekAIService.ts missing fix');
  }
}

if (fs.existsSync(srcSearch)) {
  const srcContent = fs.readFileSync(srcSearch, 'utf8');
  if (srcContent.includes('fetchPageContent')) {
    console.log('✅ Source: SearchService.ts has fix');
  } else {
    console.log('❌ Source: SearchService.ts missing fix');
  }
}

console.log();
console.log('═══════════════════════════════════════════════════════════════');
