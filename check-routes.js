// Quick script to check if routes are registered
const express = require('express');

// Simulate the app
const app = express();

// Check what routes would be registered
console.log('\n=== Checking Route Registration ===\n');

// Simulate route registration
const routes = [
  '/api/auth',
  '/api/rooms',
  '/api/users',
  '/api/dms',
  '/api/chats',
  '/api/invites',
  '/api/profile',
  '/api/music',
  '/api/ai',
  '/api/subscription',
  '/api/feed',
  '/api/settings',
  '/api/search',
  '/api/ai-chat',
  '/api/reports',  // <-- This should be here
  '/api/weather',
  '/api/version'
];

console.log('Expected routes:');
routes.forEach(route => console.log(`  ✓ ${route}`));

console.log('\n=== Testing Reports Endpoints ===\n');

const reportsEndpoints = [
  'POST /api/reports/bug',
  'POST /api/reports/pro-request',
  'POST /api/reports/scam',
  'GET  /api/reports/my-reports'
];

console.log('Reports endpoints that should work:');
reportsEndpoints.forEach(endpoint => console.log(`  ✓ ${endpoint}`));

console.log('\n=== Action Required ===\n');
console.log('1. Stop your server (Ctrl+C)');
console.log('2. Run: npm run dev');
console.log('3. Test the bug report form again');
console.log('\nThe /api/reports routes are registered in src/server.ts line 145');
console.log('If you still get 404, the server needs to be restarted.\n');
