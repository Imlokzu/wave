// Frontend API Configuration
// Add this file to frontend/ folder and include it in all HTML files before other scripts

(function() {
  // Detect environment
  const isDevelopment = window.location.hostname === 'localhost' || 
                        window.location.hostname === '127.0.0.1';
  
  // Set API URLs
  if (isDevelopment) {
    window.API_URL = 'http://localhost:3001';
    window.WS_URL = 'ws://localhost:3001';
    window.ADMIN_URL = 'http://localhost:3004';
  } else {
    // IMPORTANT: Replace these with your actual deployment URLs
    window.API_URL = 'https://your-backend.vercel.app';
    window.WS_URL = 'wss://your-backend.vercel.app';
    window.ADMIN_URL = 'https://your-backend.vercel.app'; // Admin on same backend
  }
  
  console.log('🌐 API Configuration:', {
    API_URL: window.API_URL,
    WS_URL: window.WS_URL,
    environment: isDevelopment ? 'development' : 'production'
  });
})();
