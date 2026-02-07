/**
 * Configuration - Environment-specific settings
 * Centralized configuration management
 */

const config = {
  // API Configuration
  api: {
    baseURL: window.location.origin,
    timeout: 30000, // 30 seconds
    retryAttempts: 3,
    retryDelay: 1000, // 1 second
    // Performance optimizations
    cacheDuration: 600000, // 10 minutes
    batchRequests: true,
    batchDelay: 50 // Batch requests within 50ms
  },

  // Socket Configuration
  socket: {
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
    timeout: 20000
  },

  // Message Configuration
  messages: {
    maxLength: 2000,
    typingDebounceMs: 300,
    typingTimeoutMs: 3000,
    loadBatchSize: 50,
    virtualScrollThreshold: 100
  },

  // File Upload Configuration
  upload: {
    maxImageSize: 5 * 1024 * 1024, // 5MB
    maxFileSize: 10 * 1024 * 1024, // 10MB
    maxVoiceSize: 5 * 1024 * 1024, // 5MB
    allowedImageTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    allowedFileTypes: ['*'], // All types allowed
    allowedVoiceTypes: ['audio/webm', 'audio/ogg', 'audio/mp4']
  },

  // UI Configuration
  ui: {
    messageAnimationDuration: 200,
    errorDisplayDuration: 5000,
    toastDuration: 3000,
    scrollBehavior: 'smooth',
    theme: 'dark' // 'light' | 'dark'
  },

  // Feature Flags
  features: {
    voiceMessages: true,
    fileUploads: true,
    polls: true,
    reactions: true,
    typing: true,
    readReceipts: false,
    e2eEncryption: false,
    videoCall: false,
    aiAssistant: false
  },

  // Rate Limiting (client-side)
  rateLimit: {
    messagesPerMinute: 30,
    reactionsPerMinute: 60,
    typingEventsPerMinute: 20
  },

  // Debug Configuration
  debug: {
    enabled: false, // Set to true for development
    logLevel: 'info', // 'debug' | 'info' | 'warn' | 'error'
    logSocket: false,
    logAPI: false,
    logState: false
  }
};

// Override with environment-specific settings
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  config.debug.enabled = true;
  config.debug.logLevel = 'debug';
  config.debug.logSocket = true;
  config.debug.logAPI = true;
}

// Freeze config to prevent modifications
Object.freeze(config);

// Make available globally
window.config = config;
