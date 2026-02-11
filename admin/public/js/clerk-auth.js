(function () {
  'use strict';

  const CONFIG = window.__CLERK_CONFIG__ || {};
  const PUBLISHABLE_KEY = CONFIG.publishableKey || '';
  const FRONTEND_API = CONFIG.frontendApi || '';

  let clerkLoadPromise = null;

  function isConfigured() {
    return Boolean(PUBLISHABLE_KEY && FRONTEND_API);
  }

  function loadClerkScript() {
    if (window.Clerk) return Promise.resolve(window.Clerk);
    if (clerkLoadPromise) return clerkLoadPromise;

    clerkLoadPromise = new Promise((resolve, reject) => {
      if (!isConfigured()) {
        reject(new Error('Clerk is not configured. Set publishableKey and frontendApi in /admin/js/clerk-config.js'));
        return;
      }

      const script = document.createElement('script');
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.type = 'text/javascript';
      script.src = `https://${FRONTEND_API}/npm/@clerk/clerk-js@5/dist/clerk.browser.js`;
      script.setAttribute('data-clerk-publishable-key', PUBLISHABLE_KEY);

      script.onload = () => resolve(window.Clerk);
      script.onerror = () => reject(new Error('Failed to load ClerkJS'));

      document.head.appendChild(script);
    });

    return clerkLoadPromise;
  }

  async function ensureLoaded() {
    const clerk = await loadClerkScript();
    if (!clerk) {
      throw new Error('ClerkJS failed to load');
    }
    await clerk.load();
    return clerk;
  }

  /**
   * Clear legacy auth storage
   * Note: Clerk now manages sessions via secure HTTP-only cookies
   * This function only clears old localStorage items for cleanup
   */
  function clearAuthStorage() {
    // Clear legacy storage items (no longer used)
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
   * Get session token from Clerk
   * Note: This is only for sending to backend API
   * Clerk automatically manages session cookies
   */
  async function getToken() {
    try {
      const clerk = await ensureLoaded();
      if (!clerk.session) return null;
      
      // Get token for API requests (but don't store it in localStorage)
      const token = await clerk.session.getToken();
      return token;
    } catch (error) {
      console.error('[ClerkAuth] Failed to get token:', error);
      return null;
    }
  }

  async function signOutAndRedirect(redirectUrl = '/admin/login.html') {
    try {
      const clerk = await ensureLoaded();
      await clerk.signOut();
    } catch (error) {
      console.warn('[ClerkAuth] Sign out error:', error);
    }

    clearAuthStorage();
    window.location.href = redirectUrl;
  }

  // Export public API
  window.clerkAuth = {
    isConfigured,
    ensureLoaded,
    getToken,
    signOutAndRedirect,
    clearAuthStorage
  };
})();
