// Script to update API calls in frontend files
// Run this after moving files to frontend folder

const fs = require('fs');
const path = require('path');

const frontendDir = './frontend';

// Patterns to replace
const replacements = [
  // API calls
  { from: /fetch\(['"`]\/api\//g, to: "fetch(`${window.API_URL}/api/" },
  { from: /fetch\(['"`]\/api\//g, to: "fetch(`${window.API_URL}/api/" },
  
  // WebSocket connections
  { from: /new WebSocket\(['"`]ws:\/\/localhost:3001/g, to: "new WebSocket(window.WS_URL" },
  { from: /io\(['"`]http:\/\/localhost:3001/g, to: "io(window.API_URL" },
  
  // Socket.IO
  { from: /socket = io\(\)/g, to: "socket = io(window.API_URL)" },
];

function updateFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let updated = false;
  
  replacements.forEach(({ from, to }) => {
    if (from.test(content)) {
      content = content.replace(from, to);
      updated = true;
    }
  });
  
  if (updated) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('✅ Updated:', filePath);
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      walkDir(filePath);
    } else if (file.endsWith('.js') || file.endsWith('.html')) {
      updateFile(filePath);
    }
  });
}

console.log('🔄 Updating API calls in frontend files...\n');
walkDir(frontendDir);
console.log('\n✨ Done! Remember to update window.API_URL in frontend-config.js with your Vercel URL');
