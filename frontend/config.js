// Frontend API Configuration
// Automatically detects environment and sets correct API URLs

(function() {
  const isDevelopment = window.location.hostname === 'localhost' || 
                        window.location.hostname === '127.0.0.1';
  
  if (isDevelopment) {
    window.API_URL = 'http://localhost:3001';
    window.WS_URL = 'ws://localhost:3001';
    window.ADMIN_URL = 'http://localhost:3004';
  } else {
    // IMPORTANT: Update these after deploying backend to Railway
    window.API_URL = 'https://your-backend.up.railway.app';
    window.WS_URL = 'wss://your-backend.up.railway.app';
    window.ADMIN_URL = 'https://your-backend.up.railway.app';
  }
  
  console.log('🌐 Environment:', isDevelopment ? 'Development' : 'Production');
  console.log('📡 API URL:', window.API_URL);
})();
