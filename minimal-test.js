#!/usr/bin/env node

// Absolute minimal test - no dependencies
console.log('=== MINIMAL TEST START ===');
console.log('Node version:', process.version);
console.log('Working directory:', process.cwd());

// Create the simplest possible Express-like app without requiring express
const http = require('http');

const app = function(req, res) {
  console.log('Request received:', req.url);
  
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      message: 'Minimal test working!',
      node: process.version,
      cwd: process.cwd()
    }));
  } else {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('<h1>Minimal Test Working!</h1><p>Node.js is running on Passenger</p>');
  }
};

console.log('=== MINIMAL TEST SUCCESS ===');
console.log('App created, ready for Passenger');

module.exports = app;
