/**
 * Centralized Authentication Guard
 * Include this script in any page that requires authentication
 * 
 * IMPORTANT: This now relies on Clerk's automatic session management
 * No manual token storage or refresh - Clerk handles everything via secure cookies
 */

(function() {
  'use strict';
  
  /**
   * Clear legacy auth storage (cleanup only)
   */
  function clearAuth() {
    if (window.clerkAuth?.clearAuthStorage) {
      window.clerkAuth.clearAuthStorage();
    }
    
    // Clear legacy storage items
    localStorage.removeItem('authToken');
    localStorage.removeItem('userId');
    localStorage.removeItem('username');
    localStorage.removeItem('nickname');
    localStorage.removeItem('auth_cached');
    localStorage.removeItem('auth_cache_time');
    sessionStorage.removeItem('auth_cached');
    sessionStorage.removeItem('auth_session_valid');
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
   * Validate authentication using Clerk
   * No manual token management - Clerk handles sessions automatically
   */
  async function validateAuth() {
    if (!window.clerkAuth) {
      console.error('[AuthGuard] Clerk not loaded');
      redirectToLogin();
      return false;
    }

    try {
      await window.clerkAuth.ensureLoaded();

      // Check if user is signed in via Clerk
      if (!window.Clerk?.user) {
        console.log('[AuthGuard] No Clerk session, redirecting to login');
        clearAuth();
        redirectToLogin();
        return false;
      }

      console.log('[AuthGuard] Clerk session valid for user:', window.Clerk.user.username || window.Clerk.user.primaryEmailAddress?.emailAddress);
      return true;
    } catch (error) {
      console.error('[AuthGuard] Clerk auth validation failed:', error);
      clearAuth();
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

      // Load Clerk if not already loaded
      if (!window.clerkAuth) {
        try {
          await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = '/js/clerk-config.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
          });

          await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = '/js/clerk-auth.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
          });
        } catch (error) {
          console.warn('[AuthGuard] Clerk helper failed to load:', error);
          redirectToLogin();
          return;
        }
      }

      const isValid = await validateAuth();

      if (!isValid) {
        console.log('[AuthGuard] Authentication failed, blocking page load');
        return;
      }

      console.log('[AuthGuard] Authentication successful');
    }
  })();
  
  // Export functions for use by other scripts
  window.authGuard = {
    validateAuth,
    clearAuth,
    redirectToLogin
  };
})();
