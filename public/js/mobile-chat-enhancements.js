/**
 * Mobile Chat Enhancements
 * Touch-optimized interactions and mobile-specific features
 */

class MobileChatEnhancements {
    constructor() {
        this.isMobile = window.innerWidth <= 1023;
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.touchCurrentX = 0;
        this.touchCurrentY = 0;
        this.swipeThreshold = 50;
        this.lastScrollTop = 0;
        this.headerHidden = false;
        this.keyboardOpen = false;
        
        this.init();
    }

    init() {
        if (!this.isMobile) return;

        this.setupTouchGestures();
        this.setupKeyboardHandling();
        this.setupHeaderAutoHide();
        this.setupViewportFixes();
        this.setupPerformanceOptimizations();
        this.setupAccessibility();
        
        console.log('[MobileChat] Mobile enhancements initialized');
    }

    /**
     * Touch Gestures
     */
    setupTouchGestures() {
        // Swipe back gesture
        document.addEventListener('touchstart', (e) => {
            this.touchStartX = e.touches[0].clientX;
            this.touchStartY = e.touches[0].clientY;
        }, { passive: true });

        document.addEventListener('touchmove', (e) => {
            this.touchCurrentX = e.touches[0].clientX;
            this.touchCurrentY = e.touches[0].clientY;
        }, { passive: true });

        document.addEventListener('touchend', () => {
            this.handleSwipeGesture();
        }, { passive: true });

        // Message swipe actions
        this.setupMessageSwipe();
    }

    handleSwipeGesture() {
        const diffX = this.touchCurrentX - this.touchStartX;
        const diffY = this.touchCurrentY - this.touchStartY;
        
        // Horizontal swipe (back/forward navigation)
        if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > this.swipeThreshold) {
            if (diffX > 0 && this.touchStartX < 50) {
                // Swipe from left edge - back gesture
                this.handleBackSwipe();
            }
        }
    }

    handleBackSwipe() {
        // Check if we're in a chat view
        const currentDM = localStorage.getItem('currentDM');
        const currentRoom = localStorage.getItem('currentRoomCode');
        
        if (currentDM || currentRoom) {
            // Navigate back to chat list
            window.location.href = '/mobile/chat.html';
        }
    }

    /**
     * Message Swipe Actions (Delete, Reply, etc.)
     */
    setupMessageSwipe() {
        const messages = document.querySelectorAll('.message-bubble');
        
        messages.forEach(message => {
            let startX = 0;
            let currentX = 0;
            let isSwiping = false;
            
            message.addEventListener('touchstart', (e) => {
                startX = e.touches[0].clientX;
                isSwiping = true;
            }, { passive: true });

            message.addEventListener('touchmove', (e) => {
                if (!isSwiping) return;
                currentX = e.touches[0].clientX;
                const diff = currentX - startX;
                
                if (Math.abs(diff) > 10) {
                    message.style.transition = 'none';
                    message.style.transform = `translateX(${diff}px)`;
                }
            }, { passive: true });

            message.addEventListener('touchend', () => {
                if (!isSwiping) return;
                isSwiping = false;
                const diff = currentX - startX;
                
                if (diff < -this.swipeThreshold) {
                    // Swiped left - show actions
                    this.showMessageActions(message);
                } else if (diff > this.swipeThreshold) {
                    // Swiped right - quick reply
                    this.handleQuickReply(message);
                } else {
                    // Reset
                    message.style.transition = 'transform 0.3s ease';
                    message.style.transform = 'translateX(0)';
                }
                
                currentX = 0;
                startX = 0;
            }, { passive: true });
        });
    }

    showMessageActions(message) {
        // Create or show action menu
        let actions = message.querySelector('.message-actions');
        
        if (!actions) {
            actions = document.createElement('div');
            actions.className = 'message-actions absolute right-0 top-0 bottom-0 flex items-center gap-2 pr-4';
            actions.innerHTML = `
                <button class="action-btn reply w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center">
                    <span class="material-symbols-outlined">reply</span>
                </button>
                <button class="action-btn delete w-10 h-10 rounded-full bg-red-500 text-white flex items-center justify-center">
                    <span class="material-symbols-outlined">delete</span>
                </button>
            `;
            
            message.parentElement.style.position = 'relative';
            message.parentElement.style.overflow = 'hidden';
            message.parentElement.appendChild(actions);
        }
        
        actions.style.display = 'flex';
    }

    handleQuickReply(message) {
        const messageId = message.dataset.messageId;
        const messageText = message.querySelector('.message-content')?.textContent;
        
        if (messageText) {
            const input = document.getElementById('messageInput');
            if (input) {
                input.value = `> ${messageText.trim()}\n`;
                input.focus();
            }
        }
    }

    /**
     * Keyboard Handling (Mobile)
     */
    setupKeyboardHandling() {
        const input = document.getElementById('messageInput');
        if (!input) return;

        // Detect keyboard open/close on mobile
        let initialHeight = window.innerHeight;
        
        window.addEventListener('resize', () => {
            const heightDiff = initialHeight - window.innerHeight;
            
            if (heightDiff > 200) {
                // Keyboard opened
                this.keyboardOpen = true;
                document.body.classList.add('keyboard-open');
                
                // Scroll to bottom when keyboard opens
                this.scrollToBottom();
            } else {
                // Keyboard closed
                this.keyboardOpen = false;
                document.body.classList.remove('keyboard-open');
            }
        });

        // Prevent scroll on input focus
        input.addEventListener('focus', () => {
            setTimeout(() => {
                this.scrollToBottom();
            }, 300);
        });
    }

    scrollToBottom() {
        const messagesFeed = document.getElementById('messages');
        if (messagesFeed) {
            messagesFeed.scrollTop = messagesFeed.scrollHeight;
        }
    }

    /**
     * Auto-hide Header on Scroll
     */
    setupHeaderAutoHide() {
        const header = document.querySelector('header');
        const messagesFeed = document.getElementById('messages');
        
        if (!header || !messagesFeed) return;

        messagesFeed.addEventListener('scroll', () => {
            const scrollTop = messagesFeed.scrollTop;
            
            if (scrollTop > this.lastScrollTop && scrollTop > 100) {
                // Scrolling down - hide header
                if (!this.headerHidden) {
                    header.style.transform = 'translateY(-100%)';
                    header.style.transition = 'transform 0.3s ease';
                    this.headerHidden = true;
                }
            } else {
                // Scrolling up - show header
                if (this.headerHidden) {
                    header.style.transform = 'translateY(0)';
                    this.headerHidden = false;
                }
            }
            
            this.lastScrollTop = scrollTop;
        }, { passive: true });
    }

    /**
     * Viewport Fixes (iOS Safari, etc.)
     */
    setupViewportFixes() {
        // Fix for iOS Safari viewport height
        const setVH = () => {
            const vh = window.innerHeight * 0.01;
            document.documentElement.style.setProperty('--vh', `${vh}px`);
        };
        
        setVH();
        window.addEventListener('resize', setVH);

        // Prevent pull-to-refresh on mobile
        document.body.addEventListener('scroll', (e) => {
            if (window.scrollY === 0) {
                document.body.style.overflow = 'hidden';
                setTimeout(() => {
                    document.body.style.overflow = '';
                }, 100);
            }
        }, { passive: true });

        // Fix for input zoom on iOS
        const preventZoom = (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                const viewport = document.querySelector('meta[name="viewport"]');
                if (viewport) {
                    viewport.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no');
                }
            }
        };

        document.addEventListener('focusin', preventZoom);
    }

    /**
     * Performance Optimizations
     */
    setupPerformanceOptimizations() {
        // Lazy load images
        const images = document.querySelectorAll('img[data-src]');
        
        const imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                    imageObserver.unobserve(img);
                }
            });
        }, { rootMargin: '100px' });

        images.forEach(img => imageObserver.observe(img));

        // Throttle scroll events
        let ticking = false;
        const messagesFeed = document.getElementById('messages');
        
        if (messagesFeed) {
            messagesFeed.addEventListener('scroll', () => {
                if (!ticking) {
                    window.requestAnimationFrame(() => {
                        // Handle scroll logic here if needed
                        ticking = false;
                    });
                    ticking = true;
                }
            }, { passive: true });
        }

        // Reduce animations for low-end devices
        const isLowEnd = 'deviceMemory' in navigator && navigator.deviceMemory < 4;
        
        if (isLowEnd) {
            document.documentElement.classList.add('reduce-motion');
        }
    }

    /**
     * Accessibility Enhancements
     */
    setupAccessibility() {
        // Add aria-labels to buttons
        const buttons = document.querySelectorAll('button');
        buttons.forEach(btn => {
            if (!btn.getAttribute('aria-label') && !btn.textContent.trim()) {
                const icon = btn.querySelector('.material-symbols-outlined');
                if (icon) {
                    btn.setAttribute('aria-label', icon.textContent);
                }
            }
        });

        // Focus management for modals
        const modals = document.querySelectorAll('[role="dialog"]');
        modals.forEach(modal => {
            modal.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    modal.dispatchEvent(new CustomEvent('close'));
                }
            });
        });

        // Announce dynamic content changes
        this.announceChanges();
    }

    announceChanges() {
        const messagesFeed = document.getElementById('messages');
        if (!messagesFeed) return;

        const observer = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                if (mutation.addedNodes.length > 0) {
                    const newMessage = mutation.addedNodes[0];
                    if (newMessage.classList?.contains('message-bubble')) {
                        const sender = newMessage.querySelector('.message-sender')?.textContent || 'Someone';
                        const text = newMessage.querySelector('.message-content')?.textContent || '';
                        
                        // Create announcement
                        const announcement = document.createElement('div');
                        announcement.setAttribute('aria-live', 'polite');
                        announcement.setAttribute('aria-atomic', 'true');
                        announcement.className = 'sr-only';
                        announcement.textContent = `New message from ${sender}: ${text.substring(0, 100)}`;
                        
                        document.body.appendChild(announcement);
                        setTimeout(() => announcement.remove(), 1000);
                    }
                }
            });
        });

        observer.observe(messagesFeed, { childList: true });
    }

    /**
     * Utility Methods
     */
    
    // Show toast notification
    showToast(message, duration = 3000) {
        const toast = document.createElement('div');
        toast.className = 'mobile-toast';
        toast.textContent = message;
        document.body.appendChild(toast);

        // Trigger reflow
        toast.offsetHeight;

        toast.classList.add('show');

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    // Vibrate device (if supported)
    vibrate(pattern = 50) {
        if ('vibrate' in navigator) {
            navigator.vibrate(pattern);
        }
    }

    // Copy to clipboard
    async copyToClipboard(text) {
        try {
            if (navigator.clipboard) {
                await navigator.clipboard.writeText(text);
                this.showToast('Copied to clipboard');
                this.vibrate([50, 50, 50]);
                return true;
            }
        } catch (err) {
            console.error('Failed to copy:', err);
        }
        return false;
    }

    // Check network status
    setupNetworkStatus() {
        const updateNetworkStatus = () => {
            const status = navigator.onLine ? 'online' : 'offline';
            document.body.setAttribute('data-network-status', status);
            
            if (!navigator.onLine) {
                this.showToast('You\'re offline. Some features may not work.');
            } else {
                this.showToast('Back online');
            }
        };

        window.addEventListener('online', updateNetworkStatus);
        window.addEventListener('offline', updateNetworkStatus);
        updateNetworkStatus();
    }
}

/**
 * Mobile Navigation Handler
 */
class MobileNavigationHandler {
    constructor() {
        this.currentTab = 'chats';
        this.init();
    }

    init() {
        this.setupTabNavigation();
        this.setupBackButton();
    }

    setupTabNavigation() {
        const tabBtns = document.querySelectorAll('.mobile-tab-btn');
        
        tabBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const tab = btn.dataset.tab;
                
                if (tab && tab !== this.currentTab) {
                    this.switchTab(tab);
                }
            });
        });
    }

    switchTab(tab) {
        // Update active state
        const tabBtns = document.querySelectorAll('.mobile-tab-btn');
        tabBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });

        // Navigate based on tab
        switch (tab) {
            case 'chats':
                window.location.href = '/mobile/chat.html';
                break;
            case 'feed':
                window.location.href = '/mobile/feed.html';
                break;
            case 'ai':
                window.location.href = '/mobile/aichat.html';
                break;
            case 'profile':
                window.location.href = '/mobile/bio.html';
                break;
        }

        this.currentTab = tab;
    }

    setupBackButton() {
        const backBtn = document.getElementById('backToRoomBtn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                window.history.back();
            });
        }

        // Handle browser back button
        window.addEventListener('popstate', () => {
            this.handleBackNavigation();
        });
    }

    handleBackNavigation() {
        const currentDM = localStorage.getItem('currentDM');
        const currentRoom = localStorage.getItem('currentRoomCode');

        if (!currentDM && !currentRoom) {
            // We're on chat list, no need to navigate back
            return;
        }

        // Clear current chat
        localStorage.removeItem('currentDM');
        localStorage.removeItem('currentRoomCode');
    }
}

/**
 * Mobile Modal Handler
 */
class MobileModalHandler {
    constructor() {
        this.activeModal = null;
        this.init();
    }

    init() {
        this.setupModalTriggers();
        this.setupModalCloseHandlers();
        this.setupSwipeToClose();
    }

    setupModalTriggers() {
        const modalTriggers = document.querySelectorAll('[data-modal-target]');
        
        modalTriggers.forEach(trigger => {
            trigger.addEventListener('click', (e) => {
                e.preventDefault();
                const modalId = trigger.dataset.modalTarget;
                this.openModal(modalId);
            });
        });
    }

    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;

        // Create backdrop if not exists
        let backdrop = modal.querySelector('.modal-backdrop');
        if (!backdrop) {
            backdrop = document.createElement('div');
            backdrop.className = 'modal-backdrop';
            backdrop.addEventListener('click', () => this.closeModal(modalId));
            modal.insertBefore(backdrop, modal.firstChild);
        }

        // Show modal
        modal.classList.add('modal-open');
        document.body.style.overflow = 'hidden';
        this.activeModal = modal;

        // Focus first input
        const firstInput = modal.querySelector('input, textarea, button');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 100);
        }
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;

        modal.classList.remove('modal-open');
        document.body.style.overflow = '';
        this.activeModal = null;
    }

    setupModalCloseHandlers() {
        const closeBtns = document.querySelectorAll('[data-modal-close]');
        
        closeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const modal = btn.closest('[id]');
                if (modal) {
                    this.closeModal(modal.id);
                }
            });
        });

        // ESC key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.activeModal) {
                this.closeModal(this.activeModal.id);
            }
        });
    }

    setupSwipeToClose() {
        let startY = 0;
        let currentY = 0;

        document.addEventListener('touchstart', (e) => {
            if (!this.activeModal) return;
            startY = e.touches[0].clientY;
        }, { passive: true });

        document.addEventListener('touchmove', (e) => {
            if (!this.activeModal) return;
            currentY = e.touches[0].clientY;
        }, { passive: true });

        document.addEventListener('touchend', () => {
            if (!this.activeModal) return;
            
            const diff = currentY - startY;
            
            // Swipe down to close
            if (diff > 100) {
                this.closeModal(this.activeModal.id);
            }
        }, { passive: true });
    }
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    window.mobileEnhancements = new MobileChatEnhancements();
    window.mobileNavigation = new MobileNavigationHandler();
    window.mobileModal = new MobileModalHandler();
});

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        MobileChatEnhancements,
        MobileNavigationHandler,
        MobileModalHandler
    };
}
