/**
 * Mobile Chat Swipe Functionality
 * Handles touch gestures for navigating between panels
 */

class MobileChatSwipe {
    constructor() {
        this.initElements();
        this.initState();
        this.bindEvents();
        this.setupPanels();
    }

    initElements() {
        this.container = document.getElementById('mobileContainer');
        this.mainPanel = document.getElementById('mainPanel');
        this.leftPanel = document.getElementById('leftPanel');
        this.rightPanel = document.getElementById('rightPanel');
        this.overlay = document.getElementById('panelOverlay');
        this.leftSwipeIndicator = document.getElementById('leftSwipeIndicator');
        this.rightSwipeIndicator = document.getElementById('rightSwipeIndicator');
        this.pullRefreshIndicator = document.getElementById('pullRefreshIndicator');
        
        // Buttons
        this.showMembersBtn = document.getElementById('showMembersBtn');
        this.showChatsBtn = document.getElementById('showChatsBtn');
        this.closeLeftPanel = document.getElementById('closeLeftPanel');
        this.closeRightPanel = document.getElementById('closeRightPanel');
        
        // Chat elements
        this.messagesContainer = document.getElementById('messagesContainer');
    }

    initState() {
        this.currentPanel = 'main';
        this.isAnimating = false;
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.touchCurrentX = 0;
        this.touchCurrentY = 0;
        this.isDragging = false;
        this.swipeThreshold = 50;
        this.swipeVelocityThreshold = 0.3;
        this.pullRefreshThreshold = 80;
        this.pullRefreshTriggered = false;
    }

    bindEvents() {
        // Touch events for swipe gestures
        this.mainPanel.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        this.mainPanel.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        this.mainPanel.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });

        // Button events
        this.showMembersBtn.addEventListener('click', () => this.showPanel('left'));
        this.showChatsBtn.addEventListener('click', () => this.showPanel('right'));
        this.closeLeftPanel.addEventListener('click', () => this.showPanel('main'));
        this.closeRightPanel.addEventListener('click', () => this.showPanel('main'));
        
        // Overlay click to close panels
        this.overlay.addEventListener('click', () => this.showPanel('main'));

        // Prevent default scroll behavior on panels
        this.leftPanel.addEventListener('touchmove', (e) => e.stopPropagation());
        this.rightPanel.addEventListener('touchmove', (e) => e.stopPropagation());

        // Keyboard shortcuts
        document.addEventListener('keydown', this.handleKeyDown.bind(this));

        // Handle panel close on escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.currentPanel !== 'main') {
                this.showPanel('main');
            }
        });
    }

    setupPanels() {
        // Ensure panels start in correct positions
        this.showPanel('main', false);
    }

    handleTouchStart(e) {
        if (this.isAnimating) return;
        
        const touch = e.touches[0];
        this.touchStartX = touch.clientX;
        this.touchStartY = touch.clientY;
        this.touchCurrentX = touch.clientX;
        this.touchCurrentY = touch.clientY;
        this.startTime = Date.now();
        this.isDragging = false;

        // Check if starting from edge for edge swipe
        this.isEdgeSwipe = touch.clientX < 20 || touch.clientX > window.innerWidth - 20;
    }

    handleTouchMove(e) {
        if (this.isAnimating) return;

        const touch = e.touches[0];
        this.touchCurrentX = touch.clientX;
        this.touchCurrentY = touch.clientY;

        const deltaX = this.touchCurrentX - this.touchStartX;
        const deltaY = this.touchCurrentY - this.touchStartY;
        const absDeltaX = Math.abs(deltaX);
        const absDeltaY = Math.abs(deltaY);

        // Determine if this is a horizontal swipe
        if (!this.isDragging && absDeltaX > 10) {
            // Only start dragging if horizontal movement is greater than vertical
            if (absDeltaX > absDeltaY) {
                this.isDragging = true;
                e.preventDefault();
            }
        }

        // Handle pull to refresh if scrolled to top
        if (!this.isDragging && deltaY > 0 && this.isScrolledToTop()) {
            this.handlePullRefresh(deltaY);
            e.preventDefault();
            return;
        }

        if (!this.isDragging) return;

        e.preventDefault();

        // Show swipe indicators based on direction
        if (deltaX > 20 && this.currentPanel === 'main') {
            this.leftSwipeIndicator.classList.add('show');
            this.rightSwipeIndicator.classList.remove('show');
        } else if (deltaX < -20 && this.currentPanel === 'main') {
            this.rightSwipeIndicator.classList.add('show');
            this.leftSwipeIndicator.classList.remove('show');
        } else {
            this.leftSwipeIndicator.classList.remove('show');
            this.rightSwipeIndicator.classList.remove('show');
        }

        // Apply transform based on swipe direction and current panel
        if (this.currentPanel === 'main') {
            if (deltaX > 0) {
                // Swiping right - show left panel
                const progress = Math.min(deltaX / 280, 1);
                this.mainPanel.style.transform = `translateX(${deltaX * 0.5}px)`;
                this.leftPanel.style.transform = `translateX(${-100 + (progress * 50)}vw)`;
                this.overlay.style.opacity = progress * 0.5;
                this.overlay.style.visibility = 'visible';
            } else if (deltaX < 0) {
                // Swiping left - show right panel
                const progress = Math.min(Math.abs(deltaX) / 280, 1);
                this.mainPanel.style.transform = `translateX(${deltaX * 0.5}px)`;
                this.rightPanel.style.transform = `translateX(${100 - (progress * 50)}vw)`;
                this.overlay.style.opacity = progress * 0.5;
                this.overlay.style.visibility = 'visible';
            }
        }
    }

    handleTouchEnd(e) {
        if (this.isAnimating) return;

        // Handle pull refresh
        if (this.pullRefreshTriggered) {
            this.triggerRefresh();
            this.resetPullRefresh();
            return;
        }

        if (!this.isDragging) {
            this.resetPullRefresh();
            return;
        }

        const deltaX = this.touchCurrentX - this.touchStartX;
        const deltaTime = Date.now() - this.startTime;
        const velocity = Math.abs(deltaX) / deltaTime;

        // Hide swipe indicators
        this.leftSwipeIndicator.classList.remove('show');
        this.rightSwipeIndicator.classList.remove('show');

        // Determine if swipe should trigger panel change
        const shouldSwipe = Math.abs(deltaX) > this.swipeThreshold || velocity > this.swipeVelocityThreshold;

        if (shouldSwipe && this.currentPanel === 'main') {
            if (deltaX > 0) {
                this.showPanel('left');
            } else {
                this.showPanel('right');
            }
        } else {
            // Return to original position
            this.showPanel(this.currentPanel);
        }

        this.isDragging = false;
    }

    handlePullRefresh(deltaY) {
        const progress = Math.min(deltaY / this.pullRefreshThreshold, 1);
        
        if (deltaY > this.pullRefreshThreshold && !this.pullRefreshTriggered) {
            this.pullRefreshTriggered = true;
            this.pullRefreshIndicator.classList.add('show');
            
            // Add haptic feedback if available
            if (navigator.vibrate) {
                navigator.vibrate(50);
            }
        }

        // Visual feedback for pull distance
        this.messagesContainer.style.transform = `translateY(${Math.min(deltaY * 0.5, 40)}px)`;
        this.pullRefreshIndicator.style.transform = `translateX(-50%) scale(${progress})`;
    }

    resetPullRefresh() {
        this.pullRefreshTriggered = false;
        this.pullRefreshIndicator.classList.remove('show');
        this.messagesContainer.style.transform = '';
        this.pullRefreshIndicator.style.transform = 'translateX(-50%) scale(0)';
    }

    isScrolledToTop() {
        return this.messagesContainer.scrollTop <= 10;
    }

    triggerRefresh() {
        // Emit custom event for refresh
        const refreshEvent = new CustomEvent('pullRefresh');
        document.dispatchEvent(refreshEvent);
        
        console.log('Pull to refresh triggered');
        
        // Simulate refresh delay
        setTimeout(() => {
            this.resetPullRefresh();
        }, 1000);
    }

    showPanel(panel, animate = true) {
        if (this.isAnimating && animate) return;
        
        this.currentPanel = panel;
        
        if (animate) {
            this.isAnimating = true;
            setTimeout(() => {
                this.isAnimating = false;
            }, 300);
        }

        // Clear any transform styles from touch gestures
        this.mainPanel.style.transform = '';
        this.leftPanel.style.transform = '';
        this.rightPanel.style.transform = '';

        // Apply panel classes
        this.mainPanel.classList.remove('show-left', 'show-right');
        this.leftPanel.classList.remove('show');
        this.rightPanel.classList.remove('show');
        this.overlay.classList.remove('show');

        switch (panel) {
            case 'left':
                this.mainPanel.classList.add('show-left');
                this.leftPanel.classList.add('show');
                this.overlay.classList.add('show');
                break;
            case 'right':
                this.mainPanel.classList.add('show-right');
                this.rightPanel.classList.add('show');
                this.overlay.classList.add('show');
                break;
            case 'main':
                // Default state - no additional classes needed
                break;
        }

        // Update accessibility
        this.updateAccessibility(panel);
        
        // Emit panel change event
        const panelChangeEvent = new CustomEvent('panelChange', { detail: { panel } });
        document.dispatchEvent(panelChangeEvent);
    }

    updateAccessibility(panel) {
        // Update ARIA attributes for accessibility
        this.mainPanel.setAttribute('aria-hidden', panel !== 'main');
        this.leftPanel.setAttribute('aria-hidden', panel !== 'left');
        this.rightPanel.setAttribute('aria-hidden', panel !== 'right');

        // Focus management
        if (panel === 'left') {
            this.closeLeftPanel.focus();
        } else if (panel === 'right') {
            this.closeRightPanel.focus();
        } else {
            document.querySelector('#messageInput')?.focus();
        }
    }

    handleKeyDown(e) {
        // Handle keyboard navigation
        if (e.altKey) {
            switch (e.key) {
                case 'ArrowLeft':
                    e.preventDefault();
                    this.showPanel('left');
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    this.showPanel('right');
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    this.showPanel('main');
                    break;
            }
        }
    }

    // Public methods for external control
    getCurrentPanel() {
        return this.currentPanel;
    }

    isMainPanelVisible() {
        return this.currentPanel === 'main';
    }

    // Method to handle dynamic content updates
    refreshPanelContent(panel, content) {
        const panelElement = panel === 'left' ? this.leftPanel : 
                           panel === 'right' ? this.rightPanel : this.mainPanel;
        
        // Emit content update event
        const updateEvent = new CustomEvent('panelContentUpdate', { 
            detail: { panel, content } 
        });
        document.dispatchEvent(updateEvent);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.mobileChatSwipe = new MobileChatSwipe();
});

// Export for use in other modules
window.MobileChatSwipe = MobileChatSwipe;