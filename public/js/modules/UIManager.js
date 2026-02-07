/**
 * UIManager - Professional UI state management
 * Handles desktop and mobile UI coordination
 * @author Senior Backend Developer
 * @version 2.0.0
 */

class UIManager {
    constructor(chatCore, config = {}) {
        this.chatCore = chatCore;
        this.config = {
            theme: config.theme || 'dark',
            animations: config.animations !== false,
            debugMode: config.debugMode || false,
            ...config
        };

        this.state = {
            currentTheme: this.config.theme,
            sidebarOpen: true,
            roomInfoOpen: false,
            loading: new Set(),
            errors: new Map()
        };

        this.elements = {};
        this.observers = new Map();
        this.animationQueue = [];

        this.init();
    }

    /**
     * Initialize UI Manager
     */
    init() {
        try {
            this.cacheElements();
            this.bindEvents();
            this.setupObservers();
            this.loadTheme();
            this.setupChatListeners();
            
            this.log('UI Manager initialized');
            this.emit('ui:initialized');
        } catch (error) {
            console.error('[UIManager] Initialization failed:', error);
            this.emit('ui:error', { type: 'initialization', error });
        }
    }

    /**
     * Cache DOM elements
     */
    cacheElements() {
        const selectors = {
            // Layout elements
            loginScreen: '.login-screen',
            chatScreen: '.chat-screen',
            sidebar: '.desktop-sidebar',
            roomInfo: '#roomInfoPanel',
            messagesFeed: '#messagesFeed',
            
            // Chat elements
            chatsList: '#dmsListContainer',
            roomName: '#roomName',
            roomStatus: '#roomStatus',
            messageInput: '#messageInput',
            sendButton: '#sendButton',
            
            // UI controls
            themeToggle: '#themeToggle',
            sidebarToggle: '#sidebarToggle',
            
            // Loading/error states
            loadingSpinner: '.loading-spinner',
            errorContainer: '.error-container'
        };

        Object.entries(selectors).forEach(([key, selector]) => {
            this.elements[key] = document.querySelector(selector);
        });
    }

    /**
     * Bind UI events
     */
    bindEvents() {
        // Theme toggle
        if (this.elements.themeToggle) {
            this.elements.themeToggle.addEventListener('click', () => this.toggleTheme());
        }

        // Message input
        if (this.elements.messageInput) {
            this.elements.messageInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
        }

        // Send button
        if (this.elements.sendButton) {
            this.elements.sendButton.addEventListener('click', () => this.sendMessage());
        }

        // Window events
        window.addEventListener('beforeunload', () => this.cleanup());
        
        // Focus management
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.handleWindowFocus();
            }
        });
    }

    /**
     * Setup chat event listeners
     */
    setupChatListeners() {
        if (!this.chatCore) return;

        this.chatCore.on('auth:success', (user) => this.handleAuthSuccess(user));
        this.chatCore.on('auth:failed', (error) => this.handleAuthFailed(error));
        
        this.chatCore.on('message:received', (message) => this.handleMessageReceived(message));
        this.chatCore.on('message:sent', (message) => this.handleMessageSent(message));
        this.chatCore.on('message:error', (data) => this.handleMessageError(data));
        
        this.chatCore.on('room:joined', (room) => this.handleRoomJoined(room));
        this.chatCore.on('messages:loaded', (data) => this.handleMessagesLoaded(data));
        
        this.chatCore.on('socket:connected', () => this.handleSocketConnected());
        this.chatCore.on('socket:disconnected', (reason) => this.handleSocketDisconnected(reason));
        this.chatCore.on('socket:error', (error) => this.handleSocketError(error));
        
        this.chatCore.on('demo:loaded', (data) => this.handleDemoDataLoaded(data));
    }

    /**
     * Handle authentication success
     */
    handleAuthSuccess(user) {
        this.hideElement(this.elements.loginScreen);
        this.showElement(this.elements.chatScreen);
        
        // Update user info in UI
        this.updateUserInfo(user);
        
        this.log('User authenticated:', user.username);
        this.clearError('auth');
    }

    /**
     * Handle authentication failure
     */
    handleAuthFailed(error) {
        this.showElement(this.elements.loginScreen);
        this.hideElement(this.elements.chatScreen);
        
        this.showError('auth', 'Authentication failed. Please login again.');
        this.log('Authentication failed:', error);
    }

    /**
     * Handle message received
     */
    handleMessageReceived(message) {
        this.addMessageToUI(message);
        this.scrollToBottom();
        this.playNotificationSound();
        
        // Update unread count if not focused
        if (document.hidden) {
            this.updateUnreadCount(message.roomId);
        }
    }

    /**
     * Handle message sent
     */
    handleMessageSent(message) {
        // Message is typically added optimistically
        this.scrollToBottom();
        this.clearMessageInput();
    }

    /**
     * Handle message error
     */
    handleMessageError(data) {
        this.showError('message', `Failed to send message: ${data.error.message}`);
        
        // Re-enable input
        this.setInputDisabled(false);
    }

    /**
     * Handle room joined
     */
    handleRoomJoined(room) {
        this.updateRoomInfo(room);
        this.clearMessages();
        this.showLoading('messages', 'Loading messages...');
    }

    /**
     * Handle messages loaded
     */
    handleMessagesLoaded(data) {
        this.hideLoading('messages');
        this.renderMessages(data.messages);
        this.scrollToBottom();
    }

    /**
     * Handle socket connection
     */
    handleSocketConnected() {
        this.clearError('connection');
        this.showConnectionStatus('Connected', 'success');
        
        setTimeout(() => this.hideConnectionStatus(), 2000);
    }

    /**
     * Handle socket disconnection
     */
    handleSocketDisconnected(reason) {
        this.showError('connection', 'Connection lost. Reconnecting...');
        this.showConnectionStatus('Reconnecting...', 'warning');
    }

    /**
     * Handle socket error
     */
    handleSocketError(error) {
        this.showError('connection', 'Connection failed');
        this.showConnectionStatus('Offline', 'error');
    }

    /**
     * Handle demo data loaded
     */
    handleDemoDataLoaded(data) {
        console.log('[UIManager] Demo data loaded, populating UI');
        
        // Populate chat list with demo rooms
        this.populateDemoChatsList(data.rooms);
        
        // Auto-select first room if available
        if (data.rooms.length > 0) {
            setTimeout(() => {
                this.selectDemoRoom(data.rooms[0]);
            }, 1000);
        }
    }
    
    /**
     * Populate chats list with demo data
     */
    populateDemoChatsList(rooms) {
        const chatsList = this.elements.chatsList;
        if (!chatsList) return;
        
        chatsList.innerHTML = rooms.map(room => `
            <div class="cursor-pointer hover:bg-surface-hover p-3 border-b border-border-dark transition-colors" 
                 data-room-id="${room.id}" onclick="window.selectDemoRoom('${room.id}')">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                        <span class="material-symbols-outlined text-primary">group</span>
                    </div>
                    <div class="flex-1 min-w-0">
                        <h3 class="font-semibold text-white truncate">${room.name}</h3>
                        <p class="text-sm text-gray-400 truncate">${room.description}</p>
                    </div>
                </div>
            </div>
        `).join('');
    }
    
    /**
     * Select demo room
     */
    selectDemoRoom(roomId) {
        const room = this.chatCore.state.rooms.get(roomId);
        if (!room) return;
        
        console.log('[UIManager] Selecting demo room:', room.name);
        
        // Update room info
        this.updateRoomInfo(room);
        
        // Load demo messages for this room
        const messages = this.chatCore.state.messages.get(roomId) || [];
        this.renderMessages(messages);
        
        // Update current room state
        this.chatCore.state.currentRoom = room;
    }

    /**
     * Send message
     */
    async sendMessage() {
        const input = this.elements.messageInput;
        if (!input) return;

        const content = input.value.trim();
        if (!content) return;

        try {
            this.setInputDisabled(true);
            
            const currentRoom = this.chatCore.currentRoom;
            if (!currentRoom) {
                throw new Error('No room selected');
            }

            await this.chatCore.sendMessage(content, currentRoom.id);
            
        } catch (error) {
            console.error('[UIManager] Failed to send message:', error);
            this.showError('message', error.message);
        } finally {
            this.setInputDisabled(false);
        }
    }

    /**
     * Add message to UI
     */
    addMessageToUI(message) {
        const messageElement = this.createMessageElement(message);
        if (this.elements.messagesFeed && messageElement) {
            this.elements.messagesFeed.appendChild(messageElement);
        }
    }

    /**
     * Create message element
     */
    createMessageElement(message) {
        const messageEl = document.createElement('div');
        messageEl.className = 'message p-3 rounded-lg mb-2 bg-surface-dark';
        messageEl.dataset.messageId = message.id;
        
        const isOwn = message.senderId === this.chatCore.currentUser?.id;
        if (isOwn) {
            messageEl.classList.add('message-own', 'ml-auto', 'bg-primary');
        }

        messageEl.innerHTML = `
            <div class="message-header flex items-center gap-2 mb-1">
                <span class="font-medium text-sm">${this.escapeHtml(message.senderName || 'Unknown')}</span>
                <span class="text-xs opacity-60">${this.formatTime(message.timestamp)}</span>
            </div>
            <div class="message-content">${this.escapeHtml(message.content)}</div>
        `;

        return messageEl;
    }

    /**
     * Render messages
     */
    renderMessages(messages) {
        if (!this.elements.messagesFeed) return;

        // Clear existing messages
        this.elements.messagesFeed.innerHTML = '';

        // Add messages
        messages.forEach(message => this.addMessageToUI(message));
    }

    /**
     * Update room info
     */
    updateRoomInfo(room) {
        if (this.elements.roomName) {
            this.elements.roomName.textContent = room.name || 'Unnamed Room';
        }
        
        if (this.elements.roomStatus) {
            this.elements.roomStatus.textContent = room.description || '';
        }
    }

    /**
     * Theme management
     */
    toggleTheme() {
        const themes = ['dark', 'light', 'auto'];
        const currentIndex = themes.indexOf(this.state.currentTheme);
        const nextTheme = themes[(currentIndex + 1) % themes.length];
        
        this.setTheme(nextTheme);
    }

    setTheme(theme) {
        this.state.currentTheme = theme;
        localStorage.setItem('theme', theme);
        
        const html = document.documentElement;
        html.classList.remove('dark', 'light');
        
        if (theme === 'dark') {
            html.classList.add('dark');
        } else if (theme === 'light') {
            html.classList.add('light');
        } else if (theme === 'auto') {
            if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                html.classList.add('dark');
            } else {
                html.classList.add('light');
            }
        }
        
        this.emit('theme:changed', { theme });
    }

    loadTheme() {
        const savedTheme = localStorage.getItem('theme') || 'dark';
        this.setTheme(savedTheme);
    }

    /**
     * Loading states
     */
    showLoading(key, message = 'Loading...') {
        this.state.loading.add(key);
        
        // Show loading spinner or message
        if (this.elements.loadingSpinner) {
            this.elements.loadingSpinner.textContent = message;
            this.showElement(this.elements.loadingSpinner);
        }
        
        this.emit('loading:started', { key, message });
    }

    hideLoading(key) {
        this.state.loading.delete(key);
        
        if (this.state.loading.size === 0 && this.elements.loadingSpinner) {
            this.hideElement(this.elements.loadingSpinner);
        }
        
        this.emit('loading:finished', { key });
    }

    /**
     * Error management
     */
    showError(key, message) {
        this.state.errors.set(key, message);
        
        // Show error in UI
        const errorEl = this.createErrorElement(message);
        this.showNotification(errorEl, 'error');
        
        this.emit('error:shown', { key, message });
    }

    clearError(key) {
        this.state.errors.delete(key);
        this.emit('error:cleared', { key });
    }

    /**
     * Utility functions
     */
    showElement(element) {
        if (element) {
            element.classList.remove('hidden');
            element.classList.add('active');
        }
    }

    hideElement(element) {
        if (element) {
            element.classList.add('hidden');
            element.classList.remove('active');
        }
    }

    setInputDisabled(disabled) {
        if (this.elements.messageInput) {
            this.elements.messageInput.disabled = disabled;
        }
        if (this.elements.sendButton) {
            this.elements.sendButton.disabled = disabled;
        }
    }

    clearMessageInput() {
        if (this.elements.messageInput) {
            this.elements.messageInput.value = '';
        }
    }

    clearMessages() {
        if (this.elements.messagesFeed) {
            this.elements.messagesFeed.innerHTML = '';
        }
    }

    scrollToBottom() {
        if (this.elements.messagesFeed) {
            setTimeout(() => {
                this.elements.messagesFeed.scrollTop = this.elements.messagesFeed.scrollHeight;
            }, 50);
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatTime(timestamp) {
        return new Date(timestamp).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }

    /**
     * Setup observers
     */
    setupObservers() {
        // Intersection observer for message visibility
        if (this.elements.messagesFeed) {
            const messageObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        this.markMessageAsRead(entry.target);
                    }
                });
            });
            
            this.observers.set('messages', messageObserver);
        }
    }

    /**
     * Handle window focus
     */
    handleWindowFocus() {
        // Clear unread counts when window gains focus
        this.clearAllUnreadCounts();
        
        // Refresh connection status
        if (this.chatCore && this.chatCore.isConnected) {
            this.clearError('connection');
        }
        
        // Focus message input if appropriate
        if (this.elements.messageInput && !this.elements.messageInput.disabled) {
            setTimeout(() => {
                this.elements.messageInput.focus();
            }, 100);
        }
    }

    /**
     * Clear all unread counts
     */
    clearAllUnreadCounts() {
        // Implementation for clearing unread message counts
        const unreadElements = document.querySelectorAll('.unread-count');
        unreadElements.forEach(el => el.textContent = '0');
    }

    /**
     * Update unread count
     */
    updateUnreadCount(roomId, increment = true) {
        const unreadEl = document.querySelector(`[data-room-id="${roomId}"] .unread-count`);
        if (unreadEl) {
            const current = parseInt(unreadEl.textContent || '0');
            unreadEl.textContent = increment ? current + 1 : 0;
        }
    }

    /**
     * Show connection status
     */
    showConnectionStatus(message, type) {
        // Create or update connection status indicator
        let statusEl = document.getElementById('connectionStatus');
        if (!statusEl) {
            statusEl = document.createElement('div');
            statusEl.id = 'connectionStatus';
            statusEl.className = 'fixed top-4 left-4 px-3 py-2 rounded text-sm z-50 transition-all';
            document.body.appendChild(statusEl);
        }
        
        statusEl.textContent = message;
        statusEl.className = statusEl.className.split(' ').filter(c => !c.includes('bg-')).join(' ');
        
        switch(type) {
            case 'success':
                statusEl.classList.add('bg-green-500', 'text-white');
                break;
            case 'warning':
                statusEl.classList.add('bg-yellow-500', 'text-black');
                break;
            case 'error':
                statusEl.classList.add('bg-red-500', 'text-white');
                break;
            default:
                statusEl.classList.add('bg-gray-500', 'text-white');
        }
    }

    /**
     * Hide connection status
     */
    hideConnectionStatus() {
        const statusEl = document.getElementById('connectionStatus');
        if (statusEl) {
            statusEl.remove();
        }
    }

    /**
     * Create error element
     */
    createErrorElement(message) {
        const errorEl = document.createElement('div');
        errorEl.className = 'bg-red-500 text-white p-3 rounded-lg shadow-lg';
        errorEl.textContent = message;
        return errorEl;
    }

    /**
     * Show notification
     */
    showNotification(element, type = 'info') {
        // Simple notification system
        document.body.appendChild(element);
        setTimeout(() => {
            if (element.parentNode) {
                element.parentNode.removeChild(element);
            }
        }, 5000);
    }

    /**
     * Play notification sound
     */
    playNotificationSound() {
        // Only play if window is not focused
        if (document.hidden) {
            // Create audio element for notification
            try {
                const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+D0u2ciBSCC2e/QfjMFJHfH8N2QQAoUXrTp66hVFApGn+D0u2ciBSCC2e/QfjMFJHfH8N2QQAoUXrTp66hVFApGn+D0u2ciBSCC2e/QfjMFJHfH8N2QQAoUXrTp66hVFApGn+D0u2ciBSCC2e/QfjMFJHfH8N2QQAoUXrTp66hVFApGn+D0u2ciBSCC2e/QfjMFJHfH8N2QQAoUXrTp66hVFApGn+D0u2ciBSCC2e/QfjMFJHfH8N2QQAoUXrTp66hVFApGn+D0u2ciBSCC2e/QfjMFJHfH8N2QQAoUXrTp66hVFApGn+D0u2ciBSCC2e/QfjMFJHfH8N2QQAoUXrTp66hVFApGn+D0u2ciBSCC2e/QfjMFJHfH8N2QQAoUXrTp66hVFApGn+D0u2ciBSCC2e/QfjMFJHfH8N2QQAoUXrTp66hVFApGn+D0u2ciBSCC2e/QfjMFJHfH8N2QQAoUXrTp66hVFApGn+D0u2ciBSCC2e/QfjMFJHfH8N2QQAoUXrTp66hVFApGn+D0u2ciBSCC2e/QfjMFJHfH8N2QQAoUXrTp66hVFApGn+D0u2ciBSCC2e/QfjMFJHfH8N2QQAoUXrTp66hVFApGn+D0u2ciBSCC2e/QfjMFJHfH8N2QQAoUXrTp66hVFApGn+D0u2ciBSCC2e/QfjMFJHfH8N2QQAoUXrTp66hVFApGn+D0u2ciBSCC2e/QfjMFJHfH8N2QQAoUXrTp66hVFApGn+D0u2ciBSCC2e/QfjMFJHfH8N2QQAoUXrTp66hVFApGn+D0u2ciBSCC2e/QfjMFJHfH8N2QQAoUXrTp66hVFApGn+D0u2ciBSCC2e/QfjMFJHfH8N2QQAoUXrTp66hVFApGn+D0u2ciBSCC2e/QfjMFJHfH8N2QQAoUXrTp66hVFApGn+D0u2ciBSCC2e/QfjMFJHfH8N2QQAoUXrTp66hVFApGn+D0u2ciBSCC2e/QfjMFJHfH8N2QQAoUXrTp66hVFApGn+D0u2ciBSCC2e/QfjMFJHfH8N2QQAoUXrTp66hVFApGn+D0u2ciBSCC2e/QfjMFJHfH8N2QQAoUXrTp66hVFApGn+D0u2ciBSCC2e/QfjMF');
                audio.volume = 0.1;
                audio.play().catch(e => {});
            } catch (e) {
                // Ignore audio errors
            }
        }
    }

    /**
     * Mark message as read
     */
    markMessageAsRead(messageElement) {
        const messageId = messageElement.dataset.messageId;
        if (messageId && this.chatCore) {
            // Implementation depends on your backend API
            this.chatCore.emit('message:read', { messageId });
        }
    }

    /**
     * Update user info in UI
     */
    updateUserInfo(user) {
        // Update user avatar, name, status etc.
        const userElements = document.querySelectorAll('[data-user-info]');
        userElements.forEach(el => {
            const field = el.dataset.userInfo;
            if (user[field]) {
                el.textContent = user[field];
            }
        });
    }

    /**
     * Cleanup
     */
    cleanup() {
        // Disconnect observers
        this.observers.forEach(observer => observer.disconnect());
        this.observers.clear();
        
        // Clear animation queue
        this.animationQueue.forEach(id => cancelAnimationFrame(id));
        this.animationQueue.length = 0;
        
        // Remove connection status
        this.hideConnectionStatus();
        
        this.log('UI Manager cleaned up');
    }

    /**
     * Utility methods
     */
    log(message, ...args) {
        if (this.config.debugMode) {
            console.log(`[UIManager] ${message}`, ...args);
        }
    }

    emit(event, data) {
        if (this.chatCore) {
            this.chatCore.emit(event, data);
        }
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIManager;
} else if (typeof window !== 'undefined') {
    window.UIManager = UIManager;
}