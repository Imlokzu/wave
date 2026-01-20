const fs = require('fs');
const path = require('path');

console.log('🔄 Updating frontend files...\n');

const frontendDir = './frontend';

// Step 1: Add config.js to all HTML files
function addConfigToHTML(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Check if config.js is already included
  if (content.includes('config.js')) {
    return false;
  }
  
  // Add config.js before closing </head> tag
  content = content.replace(
    '</head>',
    '    <script src="/config.js"></script>\n</head>'
  );
  
  fs.writeFileSync(filePath, content, 'utf8');
  return true;
}

// Step 2: Update API calls
function updateAPIcalls(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let updated = false;
  
  // Update fetch calls
  const patterns = [
    { from: /fetch\(\s*['"`]\/api\//g, to: "fetch(`${window.API_URL}/api/" },
    { from: /fetch\(\s*`\/api\//g, to: "fetch(`${window.API_URL}/api/" },
    { from: /fetch\(\s*"\/api\//g, to: 'fetch(`${window.API_URL}/api/' },
    { from: /fetch\(\s*'\/api\//g, to: 'fetch(`${window.API_URL}/api/' },
  ];
  
  patterns.forEach(({ from, to }) => {
    if (from.test(content)) {
      content = content.replace(from, to);
      updated = true;
    }
  });
  
  // Update Socket.IO
  if (content.includes('io()') && !content.includes('io(window.API_URL)')) {
    content = content.replace(/io\(\)/g, 'io(window.API_URL)');
    updated = true;
  }
  
  if (updated) {
    fs.writeFileSync(filePath, content, 'utf8');
  }
  
  return updated;
}

// Walk through directory
function processDirectory(dir, level = 0) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      processDirectory(filePath, level + 1);
    } else if (file.endsWith('.html')) {
      if (addConfigToHTML(filePath)) {
        console.log('✅ Added config to:', filePath);
      }
    } else if (file.endsWith('.js')) {
      if (updateAPIcalls(filePath)) {
        console.log('✅ Updated API calls in:', filePath);
      }
    }
  });
}

// Run
if (fs.existsSync(frontendDir)) {
  processDirectory(frontendDir);
  console.log('\n✨ Frontend files updated!');
  console.log('\n📝 Remember to:');
  console.log('1. Update window.API_URL in frontend/config.js after deploying backend');
  console.log('2. Test locally before deploying');
} else {
  console.log('❌ Frontend directory not found!');
  console.log('Run MOVE_FILES.bat first');
}
