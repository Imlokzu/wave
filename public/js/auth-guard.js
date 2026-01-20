/**
 * Centralized Authentication Guard
 * Include this script in any page that requires authentication
 * Uses session cache to avoid re-validating on every page
 */

(function() {
  'use strict';
  
  const SESSION_CACHE_KEY = 'auth_session_valid';
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  
  /**
   * Check if we have a valid cached session
   */
  function hasValidCache() {
    const cached = sessionStorage.getItem(SESSION_CACHE_KEY);
    if (!cached) return false;
    
    try {
      const { timestamp, valid } = JSON.parse(cached);
      const age = Date.now() - timestamp;
      
      if (valid && age < CACHE_DURATION) {
        console.log('[AuthGuard] Using cached session (age: ' + Math.round(age/1000) + 's)');
        return true;
      }
    } catch (e) {
      return false;
    }
    
    return false;
  }
  
  /**
   * Cache session validation result
   */
  function cacheSession(valid) {
    sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify({
      timestamp: Date.now(),
      valid: valid
    }));
  }
  
  /**
   * Clear session cache
   */
  function clearCache() {
    sessionStorage.removeItem(SESSION_CACHE_KEY);
  }
  
  /**
   * Clear auth data from localStorage
   */
  function clearAuth() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userId');
    localStorage.removeItem('username');
    localStorage.removeItem('nickname');
    clearCache();
  }
  
  /**
   * Redirect to login page
   */
  function redirectToLogin() {
    const currentPath = window.location.pathname;
    // Don't redirect if already on login/signup pages
    if (currentPath.includes('login.html') || currentPath.includes('signup.html')) {
      return;
    }
    console.log('[AuthGuard] Redirecting to login...');
    window.location.href = '/login.html';
  }
  
  /**
   * Validate authentication token with server
   */
  async function validateAuth(skipCache = false) {
    const authToken = localStorage.getItem('authToken');
    const userId = localStorage.getItem('userId');
    
    // No token at all - redirect to login
    if (!authToken || !userId) {
      console.log('[AuthGuard] No credentials found, redirecting to login');
      clearCache();
      redirectToLogin();
      return false;
    }
    
    // Check cache first (unless explicitly skipped)
    if (!skipCache && hasValidCache()) {
      return true;
    }
    
    // Validate token with server
    try {
      console.log('[AuthGuard] Validating session with server...');
      const response = await fetch('/api/auth/session', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('[AuthGuard] Session valid for user:', data.user.username);
        cacheSession(true);
        return true;
      } else {
        console.log('[AuthGuard] Invalid session, clearing credentials');
        clearAuth();
        clearCache();
        redirectToLogin();
        return false;
      }
    } catch (error) {
      console.error('[AuthGuard] Auth validation failed:', error);
      clearAuth();
      clearCache();
      redirectToLogin();
      return false;
    }
  }
  
  /**
   * Check if current page requires authentication
   */
  function requiresAuth() {
    const currentPath = window.location.pathname;
    const publicPages = ['login.html', 'signup.html', 'index.html', '/'];
    
    return !publicPages.some(page => currentPath.includes(page));
  }
  
  // Run auth check if page requires authentication
  (async function() {
    if (requiresAuth()) {
      console.log('[AuthGuard] Checking authentication...');
      const isValid = await validateAuth();
      
      if (!isValid) {
        // Stop page execution by preventing DOMContentLoaded
        console.log('[AuthGuard] Authentication failed, blocking page load');
        document.addEventListener('DOMContentLoaded', function(e) {
          e.stopImmediatePropagation();
        }, true);
        return; // Don't throw error, just return
      }
      
      console.log('[AuthGuard] Authentication successful');
    }
  })();
  
  // Export functions for use by other scripts
  window.authGuard = {
    validateAuth,
    clearAuth,
    redirectToLogin,
    clearCache,
    cacheSession
  };
})();
