#!/usr/bin/env node

/**
 * Passenger startup file for Wave API
 */

// Load environment variables first
require('dotenv').config();

// Check if we have required env vars
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_KEY in .env file!');
  process.exit(1);
}

// Register ts-node for TypeScript support
try {
  require('ts-node/register');
} catch (e) {
  console.error('❌ ts-node not found. Installing...');
  console.error('Run: npm install ts-node typescript');
  process.exit(1);
}

// Load the actual server
try {
  const { app } = require('./src/server');
  
  // Export for Passenger
  module.exports = app;
  
  console.log('✅ Wave API loaded successfully');
} catch (error) {
  console.error('❌ Failed to load server:', error.message);
  console.error(error.stack);
  process.exit(1);
}
