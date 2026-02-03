/**
 * Touch Handlers
 * Utilities for handling touch gestures on mobile devices
 * 
 * This module provides touch gesture detection and handling for mobile interactions,
 * including tap, long-press, swipe, and slide gestures.
 * 
 * Requirements: 20.1, 20.2
 */

/**
 * Touch gesture handler class
 * Detects and handles various touch gestures
 */
class TouchHandler {
    constructor(element, options = {}) {
        this.element = element;
        this.options = {
            longPressDuration: options.longPressDuration || 500,
            swipeThreshold: options.swipeThreshold || 50,
            tapThreshold: options.tapThreshold || 10,
            doubleTapDelay: options.doubleTapDelay || 300,
            ...options
        };
        
        this.touchState = {
            startX: 0,
            startY: 0,
            startTime: 0,
            isLongPress: false,
            isSwiping: false,
            lastTapTime: 0
        };
        
        this.longPressTimer = null;
        this.handlers = {
            tap: null,
            doubleTap: null,
            longPress: null,
            swipeLeft: null,
            swipeRight: null,
            swipeUp: null,
            swipeDown: null,
            slideStart: null,
            slideMove: null,
            slideEnd: null,
            slideCancel: null
        };
        
        this.init();
    }

    /**
     * Initialize touch event listeners
     */
    init() {
        this.element.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        this.element.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        this.element.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
        this.element.addEventListener('touchcancel', this.handleTouchCancel.bind(this), { passive: false });
    }

    /**
     * Handle touch start event
     * @param {TouchEvent} event - Touch event
     */
    handleTouchStart(event) {
        const touch = event.touches[0];
        this.touchState.startX = touch.clientX;
        this.touchState.startY = touch.clientY;
        this.touchState.startTime = Date.now();
        this.touchState.isLongPress = false;
        this.touchState.isSwiping = false;
        
        // Start long press timer
        this.longPressTimer = setTimeout(() => {
            this.touchState.isLongPress = true;
            if (this.handlers.longPress) {
                this.handlers.longPress({
                    x: this.touchState.startX,
                    y: this.touchState.startY,
                    target: event.target,
                    originalEvent: event
                });
            }
        }, this.options.longPressDuration);
        
        // Trigger slide start if handler exists
        if (this.handlers.slideStart) {
            this.handlers.slideStart({
                x: touch.clientX,
                y: touch.clientY,
                target: event.target,
                originalEvent: event
            });
        }
    }

    /**
     * Handle touch move event
     * @param {TouchEvent} event - Touch event
     */
    handleTouchMove(event) {
        const touch = event.touches[0];
        const deltaX = touch.clientX - this.touchState.startX;
        const deltaY = touch.clientY - this.touchState.startY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        // Cancel long press if moved too much
        if (distance > this.options.tapThreshold) {
            this.clearLongPressTimer();
            this.touchState.isSwiping = true;
        }
        
        // Trigger slide move if handler exists
        if (this.handlers.slideMove) {
            this.handlers.slideMove({
                x: touch.clientX,
                y: touch.clientY,
                deltaX,
                deltaY,
                distance,
                target: event.target,
                originalEvent: event
            });
        }
        
        // Check for slide cancel (moved too far in a direction)
        if (this.handlers.slideCancel && Math.abs(deltaX) > this.options.swipeThreshold) {
            this.handlers.slideCancel({
                x: touch.clientX,
                y: touch.clientY,
                deltaX,
                deltaY,
                target: event.target,
                originalEvent: event
            });
        }
    }

    /**
     * Handle touch end event
     * @param {TouchEvent} event - Touch event
     */
    handleTouchEnd(event) {
        this.clearLongPressTimer();
        
        const touch = event.changedTouches[0];
        const deltaX = touch.clientX - this.touchState.startX;
        const deltaY = touch.clientY - this.touchState.startY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const duration = Date.now() - this.touchState.startTime;
        
        // Trigger slide end if handler exists
        if (this.handlers.slideEnd) {
            this.handlers.slideEnd({
                x: touch.clientX,
                y: touch.clientY,
                deltaX,
                deltaY,
                distance,
                duration,
                target: event.target,
                originalEvent: event
            });
        }
        
        // Don't process tap/swipe if it was a long press
        if (this.touchState.isLongPress) {
            return;
        }
        
        // Detect swipe gestures
        if (this.touchState.isSwiping && distance > this.options.swipeThreshold) {
            const absX = Math.abs(deltaX);
            const absY = Math.abs(deltaY);
            
            if (absX > absY) {
                // Horizontal swipe
                if (deltaX > 0 && this.handlers.swipeRight) {
                    this.handlers.swipeRight({
                        distance: deltaX,
                        duration,
                        target: event.target,
                        originalEvent: event
                    });
                } else if (deltaX < 0 && this.handlers.swipeLeft) {
                    this.handlers.swipeLeft({
                        distance: Math.abs(deltaX),
                        duration,
                        target: event.target,
                        originalEvent: event
                    });
                }
            } else {
                // Vertical swipe
                if (deltaY > 0 && this.handlers.swipeDown) {
                    this.handlers.swipeDown({
                        distance: deltaY,
                        duration,
                        target: event.target,
                        originalEvent: event
                    });
                } else if (deltaY < 0 && this.handlers.swipeUp) {
                    this.handlers.swipeUp({
                        distance: Math.abs(deltaY),
                        duration,
                        target: event.target,
                        originalEvent: event
                    });
                }
            }
            return;
        }
        
        // Detect tap gestures
        if (distance < this.options.tapThreshold) {
            const now = Date.now();
            const timeSinceLastTap = now - this.touchState.lastTapTime;
            
            // Check for double tap
            if (timeSinceLastTap < this.options.doubleTapDelay && this.handlers.doubleTap) {
                this.handlers.doubleTap({
                    x: touch.clientX,
                    y: touch.clientY,
                    target: event.target,
                    originalEvent: event
                });
                this.touchState.lastTapTime = 0; // Reset to prevent triple tap
            } else if (this.handlers.tap) {
                // Single tap
                this.handlers.tap({
                    x: touch.clientX,
                    y: touch.clientY,
                    target: event.target,
                    originalEvent: event
                });
                this.touchState.lastTapTime = now;
            }
        }
    }

    /**
     * Handle touch cancel event
     * @param {TouchEvent} event - Touch event
     */
    handleTouchCancel(event) {
        this.clearLongPressTimer();
        
        if (this.handlers.slideCancel) {
            this.handlers.slideCancel({
                target: event.target,
                originalEvent: event
            });
        }
    }

    /**
     * Clear long press timer
     */
    clearLongPressTimer() {
        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
        }
    }

    /**
     * Register a gesture handler
     * @param {string} gesture - Gesture name
     * @param {Function} handler - Handler function
     */
    on(gesture, handler) {
        if (this.handlers.hasOwnProperty(gesture)) {
            this.handlers[gesture] = handler;
        } else {
            console.warn(`Unknown gesture: ${gesture}`);
        }
        return this;
    }

    /**
     * Unregister a gesture handler
     * @param {string} gesture - Gesture name
     */
    off(gesture) {
        if (this.handlers.hasOwnProperty(gesture)) {
            this.handlers[gesture] = null;
        }
        return this;
    }

    /**
     * Destroy the touch handler and clean up
     */
    destroy() {
        this.clearLongPressTimer();
        this.element.removeEventListener('touchstart', this.handleTouchStart);
        this.element.removeEventListener('touchmove', this.handleTouchMove);
        this.element.removeEventListener('touchend', this.handleTouchEnd);
        this.element.removeEventListener('touchcancel', this.handleTouchCancel);
        this.handlers = {};
    }
}

/**
 * Long press detector utility
 * Simplified interface for detecting long press gestures
 */
class LongPressDetector {
    constructor(element, callback, duration = 500) {
        this.element = element;
        this.callback = callback;
        this.duration = duration;
        this.timer = null;
        this.startPos = { x: 0, y: 0 };
        
        this.init();
    }

    init() {
        this.element.addEventListener('touchstart', this.handleStart.bind(this));
        this.element.addEventListener('touchmove', this.handleMove.bind(this));
        this.element.addEventListener('touchend', this.handleEnd.bind(this));
        this.element.addEventListener('touchcancel', this.handleEnd.bind(this));
    }

    handleStart(event) {
        const touch = event.touches[0];
        this.startPos = { x: touch.clientX, y: touch.clientY };
        
        this.timer = setTimeout(() => {
            this.callback({
                x: this.startPos.x,
                y: this.startPos.y,
                target: event.target,
                originalEvent: event
            });
        }, this.duration);
    }

    handleMove(event) {
        const touch = event.touches[0];
        const deltaX = touch.clientX - this.startPos.x;
        const deltaY = touch.clientY - this.startPos.y;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        // Cancel if moved more than 10px
        if (distance > 10) {
            this.cancel();
        }
    }

    handleEnd() {
        this.cancel();
    }

    cancel() {
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
    }

    destroy() {
        this.cancel();
        this.element.removeEventListener('touchstart', this.handleStart);
        this.element.removeEventListener('touchmove', this.handleMove);
        this.element.removeEventListener('touchend', this.handleEnd);
        this.element.removeEventListener('touchcancel', this.handleEnd);
    }
}

/**
 * Swipe detector utility
 * Simplified interface for detecting swipe gestures
 */
class SwipeDetector {
    constructor(element, options = {}) {
        this.element = element;
        this.options = {
            threshold: options.threshold || 50,
            onSwipeLeft: options.onSwipeLeft || null,
            onSwipeRight: options.onSwipeRight || null,
            onSwipeUp: options.onSwipeUp || null,
            onSwipeDown: options.onSwipeDown || null
        };
        
        this.startPos = { x: 0, y: 0 };
        this.init();
    }

    init() {
        this.element.addEventListener('touchstart', this.handleStart.bind(this));
        this.element.addEventListener('touchend', this.handleEnd.bind(this));
    }

    handleStart(event) {
        const touch = event.touches[0];
        this.startPos = { x: touch.clientX, y: touch.clientY };
    }

    handleEnd(event) {
        const touch = event.changedTouches[0];
        const deltaX = touch.clientX - this.startPos.x;
        const deltaY = touch.clientY - this.startPos.y;
        const absX = Math.abs(deltaX);
        const absY = Math.abs(deltaY);
        
        if (absX > this.options.threshold || absY > this.options.threshold) {
            if (absX > absY) {
                // Horizontal swipe
                if (deltaX > 0 && this.options.onSwipeRight) {
                    this.options.onSwipeRight({ distance: deltaX, originalEvent: event });
                } else if (deltaX < 0 && this.options.onSwipeLeft) {
                    this.options.onSwipeLeft({ distance: absX, originalEvent: event });
                }
            } else {
                // Vertical swipe
                if (deltaY > 0 && this.options.onSwipeDown) {
                    this.options.onSwipeDown({ distance: deltaY, originalEvent: event });
                } else if (deltaY < 0 && this.options.onSwipeUp) {
                    this.options.onSwipeUp({ distance: absY, originalEvent: event });
                }
            }
        }
    }

    destroy() {
        this.element.removeEventListener('touchstart', this.handleStart);
        this.element.removeEventListener('touchend', this.handleEnd);
    }
}

/**
 * Pull to refresh utility
 * Implements pull-to-refresh gesture for scrollable containers
 */
class PullToRefresh {
    constructor(element, onRefresh, options = {}) {
        this.element = element;
        this.onRefresh = onRefresh;
        this.options = {
            threshold: options.threshold || 80,
            maxPull: options.maxPull || 120,
            ...options
        };
        
        this.startY = 0;
        this.currentY = 0;
        this.isPulling = false;
        this.isRefreshing = false;
        
        this.init();
    }

    init() {
        this.element.addEventListener('touchstart', this.handleStart.bind(this));
        this.element.addEventListener('touchmove', this.handleMove.bind(this));
        this.element.addEventListener('touchend', this.handleEnd.bind(this));
    }

    handleStart(event) {
        if (this.element.scrollTop === 0 && !this.isRefreshing) {
            this.startY = event.touches[0].clientY;
            this.isPulling = true;
        }
    }

    handleMove(event) {
        if (!this.isPulling) return;
        
        this.currentY = event.touches[0].clientY;
        const pullDistance = Math.min(
            this.currentY - this.startY,
            this.options.maxPull
        );
        
        if (pullDistance > 0) {
            event.preventDefault();
            // Update UI to show pull distance
            this.element.style.transform = `translateY(${pullDistance}px)`;
        }
    }

    handleEnd() {
        if (!this.isPulling) return;
        
        const pullDistance = this.currentY - this.startY;
        this.isPulling = false;
        
        if (pullDistance > this.options.threshold && !this.isRefreshing) {
            this.isRefreshing = true;
            this.onRefresh(() => {
                this.isRefreshing = false;
                this.element.style.transform = '';
            });
        } else {
            this.element.style.transform = '';
        }
    }

    destroy() {
        this.element.removeEventListener('touchstart', this.handleStart);
        this.element.removeEventListener('touchmove', this.handleMove);
        this.element.removeEventListener('touchend', this.handleEnd);
        this.element.style.transform = '';
    }
}

// Export for ES6 modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        TouchHandler,
        LongPressDetector,
        SwipeDetector,
        PullToRefresh
    };
}
