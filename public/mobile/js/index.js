/**
 * Mobile JavaScript Modules - Entry Point
 * 
 * This file serves as the main entry point for all mobile-specific JavaScript modules.
 * It exports all components and utilities for use in mobile pages.
 * 
 * Usage:
 *   <script src="/mobile/js/mobile-ui.js"></script>
 *   <script src="/mobile/js/touch-handlers.js"></script>
 * 
 * Or with ES6 modules:
 *   import { MobileUIComponent, TouchHandler } from '/mobile/js/index.js';
 * 
 * Requirements: 20.1, 20.2
 */

// Re-export all modules for convenience
// Note: In a browser environment without a bundler, these will be available globally

// Mobile UI Components
if (typeof MobileUIComponent !== 'undefined') {
    window.MobileUI = {
        Component: MobileUIComponent,
        Utils: MobileUIUtils
    };
}

// Touch Handlers
if (typeof TouchHandler !== 'undefined') {
    window.TouchHandlers = {
        TouchHandler,
        LongPressDetector,
        SwipeDetector,
        PullToRefresh
    };
}

// For ES6 module environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        // Mobile UI
        MobileUIComponent,
        MobileUIUtils,
        
        // Touch Handlers
        TouchHandler,
        LongPressDetector,
        SwipeDetector,
        PullToRefresh
    };
}
