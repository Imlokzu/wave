#!/usr/bin/env node

/**
 * Passenger startup file for Wave API (Production)
 * This file should be set as "Application startup file" in Plesk Node.js settings
 */

// Load environment variables from backend folder
require('dotenv').config({ path: require('path').join(__dirname, 'backend', '.env') });
require('dotenv').config(); // Also load from root

// Set Passenger environment flag BEFORE loading the server
process.env.PASSENGER_APP_ENV = 'true';

// Check required environment variables
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_KEY in .env file!');
  process.exit(1);
}

console.log('🚀 Loading Wave API for Passenger...');
console.log('📁 Working directory:', process.cwd());
console.log('🔧 Node version:', process.version);
console.log('🌍 Environment:', process.env.NODE_ENV || 'development');
console.log('🚂 Passenger mode: ENABLED');

// Import the compiled server - this will start the server
try {
  const { app } = require('./backend/dist/server');
  
  console.log('✅ Wave API loaded and started for Passenger');
  
  // Export the Express app for Passenger
  // Passenger will wrap this and handle the HTTP server
  module.exports = app;
  
} catch (error) {
  console.error('❌ Failed to load server:', error.message);
  console.error('Stack trace:', error.stack);
  process.exit(1);
}
