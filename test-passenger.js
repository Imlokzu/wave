#!/usr/bin/env node

/**
 * Simple test file for Passenger debugging
 * Use this as Application startup file to test if Passenger works at all
 */

console.log('=== PASSENGER TEST START ===');
console.log('Working directory:', process.cwd());
console.log('Node version:', process.version);
console.log('Environment:', process.env.NODE_ENV);

// Test 1: Can we load express?
try {
  const express = require('express');
  console.log('✅ Express loaded successfully');
  
  const app = express();
  
  app.get('/', (req, res) => {
    res.send('Hello from Passenger test!');
  });
  
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      message: 'Passenger test is working',
      cwd: process.cwd(),
      nodeVersion: process.version
    });
  });
  
  console.log('✅ Express app created');
  console.log('=== PASSENGER TEST SUCCESS ===');
  
  module.exports = app;
  
} catch (error) {
  console.error('❌ ERROR:', error.message);
  console.error('Stack:', error.stack);
  console.log('=== PASSENGER TEST FAILED ===');
  process.exit(1);
}
