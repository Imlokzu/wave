/**
 * MobileInterface - Professional mobile interface handler
 * Handles mobile-specific UI interactions and responsive behavior
 * @author Senior Backend Developer
 * @version 2.0.0
 */

class MobileInterface {
    constructor(chatCore, config = {}) {
        this.chatCore = chatCore;
        this.config = {
            swipeThreshold: config.swipeThreshold || 50,
            animationDuration: config.animationDuration || 300,
            debugMode: config.debugMode || false,
            ...config
        };

        this.state = {
            currentPanel: 'main',
            isSwipeActive: false,
            touchStartX: 0,
            touchStartY: 0,
            touchCurrentX: 0,
            lastTouchTime: 0
        };

        this.elements = {};
        this.boundMethods = {};
        this.resizeObserver = null;

        if (this.isMobileDevice()) {
            this.init();
        }
    }

    /**
     * Initialize mobile interface
     */
    init() {
        try {
            this.cacheElements();
            this.bindEvents();
            this.setupGestures();
            this.applyMobileStyles();
            
            this.log('Mobile interface initialized');
            this.emit('mobile:initialized');
        } catch (error) {
            console.error('[MobileInterface] Initialization failed:', error);
            this.emit('mobile:error', { type: 'initialization', error });
        }
    }

    /**
     * Cache DOM elements
     */
    cacheElements() {
        const selectors = {
            chatScreen: '#chatScreen',
            leftPanel: '#mobileLeftPanel',
            rightPanel: '#mobileRightPanel',
            overlay: '#mobileOverlay',
            leftIndicator: '#leftSwipeIndicator',
            rightIndicator: '#rightSwipeIndicator',
            bottomNav: '#mobileBottomNav',
            messagesFeed: '#messagesFeed',
            chatsList: '#mobileChatsList',
            desktopChatsList: '#dmsListContainer'
        };

        Object.entries(selectors).forEach(([key, selector]) => {
            this.elements[key] = document.querySelector(selector);
            if (!this.elements[key] && this.config.debugMode) {
                console.warn(`[MobileInterface] Element not found: ${selector}`);
            }
        });
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        // Bind methods to preserve context
        this.boundMethods = {
            handleTouchStart: this.handleTouchStart.bind(this),
            handleTouchMove: this.handleTouchMove.bind(this),
            handleTouchEnd: this.handleTouchEnd.bind(this),
            handleResize: this.debounce(this.handleResize.bind(this), 250),
            handleOrientationChange: this.handleOrientationChange.bind(this)
        };

        // Touch events for main chat area
        const touchTargets = [
            this.elements.chatScreen,
            this.elements.messagesFeed
        ].filter(Boolean);

        touchTargets.forEach(element => {
            element.addEventListener('touchstart', this.boundMethods.handleTouchStart, { passive: false });
            element.addEventListener('touchmove', this.boundMethods.handleTouchMove, { passive: false });
            element.addEventListener('touchend', this.boundMethods.handleTouchEnd, { passive: true });
        });

        // Button events
        this.bindButtonEvents();

        // Window events
        window.addEventListener('resize', this.boundMethods.handleResize);
        window.addEventListener('orientationchange', this.boundMethods.handleOrientationChange);

        // Prevent panel scrolling interference
        [this.elements.leftPanel, this.elements.rightPanel].forEach(panel => {
            if (panel) {
                panel.addEventListener('touchmove', (e) => e.stopPropagation(), { passive: false });
            }
        });
    }

    /**
     * Bind button events
     */
    bindButtonEvents() {
        const buttonBindings = [
            { selector: '#showMobileChatsList', action: () => this.showPanel('right') },
            { selector: '#showMobileRoomInfo', action: () => this.showPanel('left') },
            { selector: '#closeMobileLeftPanel', action: () => this.showPanel('main') },
            { selector: '#closeMobileRightPanel', action: () => this.showPanel('main') }
        ];

        buttonBindings.forEach(({ selector, action }) => {
            const button = document.querySelector(selector);
            if (button) {
                button.addEventListener('click', action);
            }
        });

        // Overlay click
        if (this.elements.overlay) {
            this.elements.overlay.addEventListener('click', () => this.showPanel('main'));
        }
    }

    /**
     * Handle touch start
     */
    handleTouchStart(e) {
        if (!this.isMobileDevice()) return;

        const touch = e.touches[0];
        this.state.touchStartX = touch.clientX;
        this.state.touchStartY = touch.clientY;
        this.state.touchCurrentX = touch.clientX;
        this.state.lastTouchTime = Date.now();
        this.state.isSwipeActive = false;

        // Reset panel transforms
        this.resetPanelTransforms();
    }

    /**
     * Handle touch move
     */
    handleTouchMove(e) {
        if (!this.isMobileDevice()) return;

        const touch = e.touches[0];
        this.state.touchCurrentX = touch.clientX;

        const deltaX = this.state.touchCurrentX - this.state.touchStartX;
        const deltaY = touch.clientY - this.state.touchStartY;
        const absDeltaX = Math.abs(deltaX);
        const absDeltaY = Math.abs(deltaY);

        // Determine if this is a horizontal swipe
        if (!this.state.isSwipeActive && absDeltaX > 10 && absDeltaX > absDeltaY) {
            this.state.isSwipeActive = true;
            e.preventDefault();
        }

        if (!this.state.isSwipeActive) return;
        
        e.preventDefault();
        this.updateSwipeVisuals(deltaX);
    }

    /**
     * Handle touch end
     */
    handleTouchEnd(e) {
        if (!this.isMobileDevice() || !this.state.isSwipeActive) return;

        const deltaX = this.state.touchCurrentX - this.state.touchStartX;
        const swipeDistance = Math.abs(deltaX);
        const timeDelta = Date.now() - this.state.lastTouchTime;
        const velocity = swipeDistance / timeDelta;

        // Determine if swipe should trigger panel change
        const shouldSwipe = swipeDistance > this.config.swipeThreshold || velocity > 0.5;

        this.hideSwipeIndicators();

        if (shouldSwipe && this.state.currentPanel === 'main') {
            if (deltaX > 0) {
                this.showPanel('left');
            } else {
                this.showPanel('right');
            }
        } else {
            this.showPanel(this.state.currentPanel);
        }

        this.state.isSwipeActive = false;
    }

    /**
     * Update visual feedback during swipe
     */
    updateSwipeVisuals(deltaX) {
        const { leftPanel, rightPanel, overlay, leftIndicator, rightIndicator } = this.elements;

        // Show appropriate indicator
        if (deltaX > 30 && this.state.currentPanel === 'main') {
            leftIndicator?.classList.add('show');
            rightIndicator?.classList.remove('show');
        } else if (deltaX < -30 && this.state.currentPanel === 'main') {
            rightIndicator?.classList.add('show');
            leftIndicator?.classList.remove('show');
        } else {
            leftIndicator?.classList.remove('show');
            rightIndicator?.classList.remove('show');
        }

        // Apply transform for visual feedback
        if (this.state.currentPanel === 'main') {
            const maxSwipeDistance = window.innerWidth * 0.5;
            
            if (deltaX > 0 && leftPanel) {
                // Swiping right - show left panel
                const progress = Math.min(deltaX / maxSwipeDistance, 1);
                leftPanel.style.transform = `translateX(${-100 + (progress * 100)}%)`;
                if (overlay) {
                    overlay.style.opacity = progress * 0.5;
                    overlay.style.visibility = 'visible';
                }
            } else if (deltaX < 0 && rightPanel) {
                // Swiping left - show right panel
                const progress = Math.min(Math.abs(deltaX) / maxSwipeDistance, 1);
                rightPanel.style.transform = `translateX(${100 - (progress * 100)}%)`;
                if (overlay) {
                    overlay.style.opacity = progress * 0.5;
                    overlay.style.visibility = 'visible';
                }
            }
        }
    }

    /**
     * Show panel with animation
     */
    showPanel(panelName) {
        if (this.state.currentPanel === panelName) return;

        this.state.currentPanel = panelName;
        this.resetPanelTransforms();
        this.hideSwipeIndicators();

        const { leftPanel, rightPanel, overlay, bottomNav } = this.elements;

        // Remove all panel classes
        [leftPanel, rightPanel].forEach(panel => {
            panel?.classList.remove('show');
        });
        overlay?.classList.remove('show');

        // Apply new panel state
        switch (panelName) {
            case 'left':
                leftPanel?.classList.add('show');
                overlay?.classList.add('show');
                this.hideBottomNav();
                this.emit('panel:shown', { panel: 'left' });
                break;

            case 'right':
                rightPanel?.classList.add('show');
                overlay?.classList.add('show');
                this.syncChatsList();
                this.hideBottomNav();
                this.emit('panel:shown', { panel: 'right' });
                break;

            case 'main':
            default:
                this.showBottomNav();
                this.emit('panel:shown', { panel: 'main' });
                break;
        }

        this.log(`Panel changed to: ${panelName}`);
    }

    /**
     * Sync mobile chats list with desktop
     */
    syncChatsList() {
        const { chatsList, desktopChatsList } = this.elements;
        
        if (!chatsList || !desktopChatsList) return;

        try {
            // Clone desktop chat list content
            chatsList.innerHTML = desktopChatsList.innerHTML;

            // Bind click handlers for mobile chat items
            const chatItems = chatsList.querySelectorAll('.cursor-pointer');
            
            chatItems.forEach(item => {
                item.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    const userId = item.dataset.userId;
                    const roomId = item.dataset.roomId;

                    // Find corresponding desktop item
                    const selector = userId ? `[data-user-id="${userId}"]` : `[data-room-id="${roomId}"]`;
                    const desktopItem = desktopChatsList.querySelector(selector);

                    if (desktopItem) {
                        // Trigger desktop click to maintain consistency
                        desktopItem.click();
                        
                        // Close mobile panel after short delay
                        setTimeout(() => {
                            this.showPanel('main');
                            this.scrollMessagesToBottom();
                        }, 150);
                    } else {
                        // Fallback: just close panel
                        this.showPanel('main');
                    }
                });
            });

            this.emit('chatsList:synced');
        } catch (error) {
            console.error('[MobileInterface] Failed to sync chats list:', error);
            this.emit('mobile:error', { type: 'sync', error });
        }
    }

    /**
     * Scroll messages to bottom
     */
    scrollMessagesToBottom() {
        if (this.elements.messagesFeed) {
            setTimeout(() => {
                this.elements.messagesFeed.scrollTop = this.elements.messagesFeed.scrollHeight;
            }, 100);
        }
    }

    /**
     * Hide/show bottom navigation
     */
    hideBottomNav() {
        if (this.elements.bottomNav) {
            this.elements.bottomNav.style.transform = 'translateY(100%)';
        }
    }

    showBottomNav() {
        if (this.elements.bottomNav) {
            this.elements.bottomNav.style.transform = '';
        }
    }

    /**
     * Reset panel transforms
     */
    resetPanelTransforms() {
        const { leftPanel, rightPanel, overlay } = this.elements;
        
        [leftPanel, rightPanel].forEach(panel => {
            if (panel) panel.style.transform = '';
        });
        
        if (overlay) {
            overlay.style.opacity = '';
            overlay.style.visibility = '';
        }
    }

    /**
     * Hide swipe indicators
     */
    hideSwipeIndicators() {
        const { leftIndicator, rightIndicator } = this.elements;
        leftIndicator?.classList.remove('show');
        rightIndicator?.classList.remove('show');
    }

    /**
     * Apply mobile-specific styles
     */
    applyMobileStyles() {
        if (!this.isMobileDevice()) return;

        document.body.classList.add('mobile-interface-active');
        
        // Add mobile-specific CSS variables
        const root = document.documentElement;
        root.style.setProperty('--mobile-swipe-threshold', `${this.config.swipeThreshold}px`);
        root.style.setProperty('--mobile-animation-duration', `${this.config.animationDuration}ms`);
    }

    /**
     * Handle window resize
     */
    handleResize() {
        if (this.isMobileDevice()) {
            this.cacheElements(); // Re-cache in case layout changed
            this.showPanel('main'); // Reset to main panel
        }
    }

    /**
     * Handle orientation change
     */
    handleOrientationChange() {
        setTimeout(() => {
            this.handleResize();
        }, 100);
    }

    /**
     * Setup gesture recognition
     */
    setupGestures() {
        // Additional gesture setup can go here
        // For now, basic swipe gestures are handled in touch events
    }

    /**
     * Device detection
     */
    isMobileDevice() {
        return window.innerWidth <= 1023 || 
               /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    /**
     * Utility functions
     */
    debounce(func, wait) {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    log(message, ...args) {
        if (this.config.debugMode) {
            console.log(`[MobileInterface] ${message}`, ...args);
        }
    }

    emit(event, data) {
        if (this.chatCore) {
            this.chatCore.emit(event, data);
        }
    }

    /**
     * Cleanup
     */
    destroy() {
        // Remove event listeners
        Object.values(this.boundMethods).forEach(method => {
            window.removeEventListener('resize', method);
            window.removeEventListener('orientationchange', method);
        });

        // Disconnect resize observer
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }

        // Reset styles
        document.body.classList.remove('mobile-interface-active');

        this.log('Mobile interface destroyed');
    }

    /**
     * Public API
     */
    getCurrentPanel() {
        return this.state.currentPanel;
    }

    isSwipeActive() {
        return this.state.isSwipeActive;
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MobileInterface;
} else if (typeof window !== 'undefined') {
    window.MobileInterface = MobileInterface;
}