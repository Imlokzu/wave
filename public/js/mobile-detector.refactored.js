/**
 * Mobile Device Detection and Redirect Module
 * 
 * Automatically redirects mobile users to mobile-optimized pages where available.
 * 
 * Behavior:
 * - Detects mobile devices via user agent, touch support, and screen size
 * - Redirects to /mobile/ versions for supported pages
 * - chat.html intentionally uses desktop version for mobile users
 * - Preserves query parameters and URL hash during redirect
 * - Prevents redirect loops with session-based tracking
 * 
 * Debug mode: Add ?mobile-debug to URL to see detection logs
 * 
 * @module MobileDetector
 */
(function() {
    'use strict';
    
    // ========================================
    // Configuration
    // ========================================
    const CONFIG = {
        MOBILE_BREAKPOINT: 768,        // Standard tablet breakpoint
        REDIRECT_TIMEOUT: 5000,        // 5 seconds
        REDIRECT_KEY: 'mobile_redirect_attempted',
        
        // Pages with dedicated mobile versions
        MOBILE_PAGES: {
            '/ai-chat.html': '/mobile/aichat.html',
            '/profile.html': '/mobile/bio.html',
            '/feed.html': '/mobile/feed.html',
            '/music.html': '/mobile/playlist.html',
            '/settings.html': '/mobile/settings.html'
        },
        
        // Root paths redirect to desktop chat
        // NOTE: chat.html intentionally excluded - mobile users get desktop version
        ROOT_PATHS: ['/', '/index.html'],
        CHAT_PATH: '/chat.html'
    };
    
    // Debug mode
    const DEBUG = new URLSearchParams(window.location.search).has('mobile-debug');
    
    // ========================================
    // Utility Functions
    // ========================================
    
    /**
     * Logs debug messages when debug mode is enabled
     * @param {...any} args - Arguments to log
     */
    function log(...args) {
        if (DEBUG) {
            console.log('[MobileDetector]', ...args);
        }
    }
    
    /**
     * Checks if a redirect was recently attempted (prevents loops)
     * @returns {boolean} True if redirect was recently attempted
     */
    function wasRecentlyRedirected() {
        const lastRedirect = sessionStorage.getItem(CONFIG.REDIRECT_KEY);
        if (!lastRedirect) return false;
        
        const timeSinceRedirect = Date.now() - parseInt(lastRedirect, 10);
        return timeSinceRedirect < CONFIG.REDIRECT_TIMEOUT;
    }
    
    /**
     * Marks that a redirect attempt was made
     */
    function markRedirectAttempt() {
        sessionStorage.setItem(CONFIG.REDIRECT_KEY, Date.now().toString());
    }
    
    // ========================================
    // Detection Functions
    // ========================================
    
    /**
     * Detects if the current device is a mobile device
     * Uses multiple signals: touch support, screen size, and user agent
     * @returns {boolean} True if mobile device detected
     */
    function isMobileDevice() {
        // Feature detection (most reliable)
        const hasTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        
        // Media query detection (respects user preferences)
        const isSmallScreen = window.matchMedia(`(max-width: ${CONFIG.MOBILE_BREAKPOINT}px)`).matches;
        
        // User agent detection (fallback)
        const userAgent = navigator.userAgent || navigator.vendor || window.opera;
        const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
        const isMobileUA = mobileRegex.test(userAgent);
        
        // Combine signals: touch + small screen is strong indicator
        const isMobile = (hasTouchScreen && isSmallScreen) || isMobileUA;
        
        log('Detection results:', {
            hasTouchScreen,
            isSmallScreen,
            isMobileUA,
            finalResult: isMobile
        });
        
        return isMobile;
    }
    
    /**
     * Gets the mobile version path for a given desktop path
     * @param {string} currentPath - Current page path
     * @returns {string|null} Mobile path or null if no mobile version exists
     */
    function getMobileVersion(currentPath) {
        // Handle root paths (redirect to desktop chat)
        if (CONFIG.ROOT_PATHS.includes(currentPath)) {
            log('Root path detected, redirecting to:', CONFIG.CHAT_PATH);
            return CONFIG.CHAT_PATH;
        }
        
        // Check for dedicated mobile page
        const mobilePath = CONFIG.MOBILE_PAGES[currentPath];
        log('Mobile path lookup:', currentPath, '->', mobilePath || 'none');
        
        return mobilePath || null;
    }
    
    // ========================================
    // Main Redirect Logic
    // ========================================
    
    /**
     * Performs the redirect if conditions are met
     */
    function performRedirect() {
        // Check for redirect loop
        if (wasRecentlyRedirected()) {
            log('Redirect loop detected, aborting');
            console.warn('[MobileDetector] Redirect loop detected, aborting');
            return;
        }
        
        // Check if mobile device
        if (!isMobileDevice()) {
            log('Not a mobile device, no redirect needed');
            return;
        }
        
        // Get current path
        const currentPath = window.location.pathname;
        log('Current path:', currentPath);
        
        // Don't redirect if already on mobile version
        const isAlreadyMobile = currentPath.includes('/mobile/');
        if (isAlreadyMobile) {
            log('Already on mobile version, no redirect needed');
            return;
        }
        
        // Get mobile version path
        const mobilePath = getMobileVersion(currentPath);
        if (!mobilePath) {
            log('No mobile version available for this page');
            return;
        }
        
        // Perform redirect
        markRedirectAttempt();
        
        // Preserve query parameters and hash
        const search = window.location.search;
        const hash = window.location.hash;
        const fullPath = mobilePath + search + hash;
        
        log('Redirecting to:', fullPath);
        window.location.href = fullPath;
    }
    
    // ========================================
    // Initialize
    // ========================================
    
    try {
        performRedirect();
    } catch (error) {
        console.error('[MobileDetector] Error during redirect:', error);
    }
})();
