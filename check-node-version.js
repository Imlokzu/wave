#!/usr/bin/env node

console.log('=== NODE.JS VERSION CHECK ===');
console.log('Node version:', process.version);
console.log('Node versions:', process.versions);
console.log('Platform:', process.platform);
console.log('Arch:', process.arch);
console.log('Working directory:', process.cwd());
console.log('=== END CHECK ===');

// Simple HTTP server
const http = require('http');

const app = function(req, res) {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    nodeVersion: process.version,
    versions: process.versions,
    platform: process.platform,
    arch: process.arch,
    cwd: process.cwd()
  }, null, 2));
};

module.exports = app;
