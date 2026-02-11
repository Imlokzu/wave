(function () {
  'use strict';

  const CONFIG = window.__CLERK_CONFIG__ || {};
  const PUBLISHABLE_KEY = CONFIG.publishableKey || '';
  const FRONTEND_API = CONFIG.frontendApi || '';
  const TOKEN_REFRESH_MS = 4 * 60 * 1000;

  let clerkLoadPromise = null;
  let refreshTimer = null;

  function isConfigured() {
    return Boolean(PUBLISHABLE_KEY && FRONTEND_API);
  }

  function loadClerkScript() {
    if (window.Clerk) return Promise.resolve(window.Clerk);
    if (clerkLoadPromise) return clerkLoadPromise;

    clerkLoadPromise = new Promise((resolve, reject) => {
      if (!isConfigured()) {
        reject(new Error('Clerk is not configured. Set publishableKey and frontendApi in /js/clerk-config.js'));
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

  function clearAuthStorage() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userId');
    localStorage.removeItem('username');
    localStorage.removeItem('nickname');
    localStorage.removeItem('auth_cached');
    localStorage.removeItem('auth_cache_time');
    sessionStorage.removeItem('auth_cached');
    sessionStorage.removeItem('auth_session_valid');
  }

  function setUserInStorage(user) {
    if (!user) return;
    localStorage.setItem('userId', user.id);
    localStorage.setItem('username', user.username);
    localStorage.setItem('nickname', user.nickname || user.username);

    const cacheData = JSON.stringify({ user });
    localStorage.setItem('auth_cached', cacheData);
    localStorage.setItem('auth_cache_time', Date.now().toString());
    sessionStorage.setItem('auth_cached', cacheData);
  }

  function deriveUserProfile(clerkUser) {
    if (!clerkUser) return null;

    const email = clerkUser.primaryEmailAddress?.emailAddress || '';
    const baseUsername = clerkUser.username || email.split('@')[0] || clerkUser.id;
    const nickname = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ').trim();

    return {
      id: clerkUser.id,
      username: baseUsername,
      nickname: nickname || baseUsername
    };
  }

  async function getToken() {
    try {
      const clerk = await ensureLoaded();
      if (!clerk.session) return null;
      const token = await clerk.session.getToken();
      if (token) {
        localStorage.setItem('authToken', token);
      }
      return token;
    } catch (error) {
      console.error('[ClerkAuth] Failed to get token:', error);
      return null;
    }
  }

  async function syncUserToStorage() {
    const clerk = await ensureLoaded();
    if (!clerk.user) {
      clearAuthStorage();
      return null;
    }

    const user = deriveUserProfile(clerk.user);
    if (user) {
      setUserInStorage(user);
    }

    return user;
  }

  async function syncSessionWithBackend() {
    const token = await getToken();
    if (!token) return null;

    try {
      const response = await fetch('/api/auth/session', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        clearAuthStorage();
        return null;
      }

      const data = await response.json();
      if (data?.user) {
        setUserInStorage(data.user);
        sessionStorage.setItem('auth_session_valid', JSON.stringify({
          timestamp: Date.now(),
          valid: true
        }));
      }

      return data?.user || null;
    } catch (error) {
      console.error('[ClerkAuth] Failed to sync session with backend:', error);
      return null;
    }
  }

  async function signOutAndRedirect(redirectUrl = '/login.html') {
    try {
      const clerk = await ensureLoaded();
      await clerk.signOut();
    } catch (error) {
      console.warn('[ClerkAuth] Sign out error:', error);
    }

    clearAuthStorage();
    window.location.href = redirectUrl;
  }

  function startTokenRefresh() {
    if (refreshTimer) return;
    refreshTimer = setInterval(async () => {
      await getToken();
    }, TOKEN_REFRESH_MS);
  }

  window.clerkAuth = {
    isConfigured,
    ensureLoaded,
    getToken,
    syncUserToStorage,
    syncSessionWithBackend,
    signOutAndRedirect,
    startTokenRefresh,
    clearAuthStorage
  };
})();
