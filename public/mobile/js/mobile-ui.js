/**
 * Mobile UI Components
 * Base classes and utilities for mobile-optimized UI components
 * 
 * This module provides the foundation for all mobile UI components,
 * including base classes, common utilities, and component lifecycle management.
 * 
 * Requirements: 20.1, 20.2
 */

/**
 * Base class for all mobile UI components
 * Provides common functionality for component lifecycle, rendering, and event handling
 */
class MobileUIComponent {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            throw new Error(`Container element with id "${containerId}" not found`);
        }
        this.state = {};
        this.eventListeners = [];
    }

    /**
     * Render the component
     * Override this method in subclasses
     */
    render() {
        throw new Error('render() must be implemented by subclass');
    }

    /**
     * Update component state and trigger re-render
     * @param {Object} newState - Partial state to merge with current state
     */
    setState(newState) {
        this.state = { ...this.state, ...newState };
        this.render();
    }

    /**
     * Get current component state
     * @returns {Object} Current state
     */
    getState() {
        return { ...this.state };
    }

    /**
     * Add event listener and track it for cleanup
     * @param {HTMLElement} element - Element to attach listener to
     * @param {string} event - Event name
     * @param {Function} handler - Event handler function
     * @param {Object} options - Event listener options
     */
    addEventListener(element, event, handler, options = {}) {
        element.addEventListener(event, handler, options);
        this.eventListeners.push({ element, event, handler, options });
    }

    /**
     * Remove all event listeners
     */
    removeAllEventListeners() {
        this.eventListeners.forEach(({ element, event, handler, options }) => {
            element.removeEventListener(event, handler, options);
        });
        this.eventListeners = [];
    }

    /**
     * Destroy component and clean up resources
     */
    destroy() {
        this.removeAllEventListeners();
        if (this.container) {
            this.container.innerHTML = '';
        }
    }

    /**
     * Show the component
     */
    show() {
        if (this.container) {
            this.container.style.display = '';
        }
    }

    /**
     * Hide the component
     */
    hide() {
        if (this.container) {
            this.container.style.display = 'none';
        }
    }

    /**
     * Create an HTML element with attributes and children
     * @param {string} tag - HTML tag name
     * @param {Object} attributes - Element attributes
     * @param {Array|string} children - Child elements or text content
     * @returns {HTMLElement} Created element
     */
    createElement(tag, attributes = {}, children = []) {
        const element = document.createElement(tag);
        
        // Set attributes
        Object.entries(attributes).forEach(([key, value]) => {
            if (key === 'className') {
                element.className = value;
            } else if (key === 'style' && typeof value === 'object') {
                Object.assign(element.style, value);
            } else if (key.startsWith('on') && typeof value === 'function') {
                const eventName = key.substring(2).toLowerCase();
                this.addEventListener(element, eventName, value);
            } else {
                element.setAttribute(key, value);
            }
        });
        
        // Add children
        if (typeof children === 'string') {
            element.textContent = children;
        } else if (Array.isArray(children)) {
            children.forEach(child => {
                if (typeof child === 'string') {
                    element.appendChild(document.createTextNode(child));
                } else if (child instanceof HTMLElement) {
                    element.appendChild(child);
                }
            });
        }
        
        return element;
    }

    /**
     * Sanitize HTML to prevent XSS attacks
     * @param {string} html - HTML string to sanitize
     * @returns {string} Sanitized HTML
     */
    sanitizeHTML(html) {
        const div = document.createElement('div');
        div.textContent = html;
        return div.innerHTML;
    }

    /**
     * Format timestamp for display
     * @param {Date|string|number} timestamp - Timestamp to format
     * @returns {string} Formatted time string
     */
    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const seconds = Math.floor((now - date) / 1000);
        
        if (seconds < 60) return 'Just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
        
        return date.toLocaleDateString();
    }

    /**
     * Show loading indicator
     */
    showLoading() {
        const loader = this.createElement('div', {
            className: 'mobile-loading',
            style: {
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '20px'
            }
        }, 'Loading...');
        
        this.container.innerHTML = '';
        this.container.appendChild(loader);
    }

    /**
     * Show error message
     * @param {string} message - Error message to display
     */
    showError(message) {
        const error = this.createElement('div', {
            className: 'mobile-error',
            style: {
                padding: '20px',
                color: '#f44336',
                textAlign: 'center'
            }
        }, message);
        
        this.container.innerHTML = '';
        this.container.appendChild(error);
    }

    /**
     * Show empty state message
     * @param {string} message - Empty state message
     */
    showEmpty(message) {
        const empty = this.createElement('div', {
            className: 'mobile-empty',
            style: {
                padding: '40px 20px',
                color: '#999',
                textAlign: 'center'
            }
        }, message);
        
        this.container.innerHTML = '';
        this.container.appendChild(empty);
    }
}

/**
 * Utility functions for mobile UI
 */
const MobileUIUtils = {
    /**
     * Detect if device is in portrait or landscape mode
     * @returns {string} 'portrait' or 'landscape'
     */
    getOrientation() {
        return window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
    },

    /**
     * Get screen size category
     * @returns {string} 'phone' or 'tablet'
     */
    getScreenSize() {
        return window.innerWidth < 768 ? 'phone' : 'tablet';
    },

    /**
     * Check if touch is supported
     * @returns {boolean} True if touch is supported
     */
    isTouchDevice() {
        return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    },

    /**
     * Debounce function calls
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in milliseconds
     * @returns {Function} Debounced function
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * Throttle function calls
     * @param {Function} func - Function to throttle
     * @param {number} limit - Time limit in milliseconds
     * @returns {Function} Throttled function
     */
    throttle(func, limit) {
        let inThrottle;
        return function executedFunction(...args) {
            if (!inThrottle) {
                func(...args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    /**
     * Scroll element into view smoothly
     * @param {HTMLElement} element - Element to scroll to
     * @param {Object} options - Scroll options
     */
    scrollIntoView(element, options = {}) {
        if (element && element.scrollIntoView) {
            element.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
                ...options
            });
        }
    },

    /**
     * Vibrate device if supported
     * @param {number|Array} pattern - Vibration pattern in milliseconds
     */
    vibrate(pattern = 50) {
        if ('vibrate' in navigator) {
            navigator.vibrate(pattern);
        }
    },

    /**
     * Copy text to clipboard
     * @param {string} text - Text to copy
     * @returns {Promise<boolean>} True if successful
     */
    async copyToClipboard(text) {
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(text);
                return true;
            } else {
                // Fallback for older browsers
                const textarea = document.createElement('textarea');
                textarea.value = text;
                textarea.style.position = 'fixed';
                textarea.style.opacity = '0';
                document.body.appendChild(textarea);
                textarea.select();
                const success = document.execCommand('copy');
                document.body.removeChild(textarea);
                return success;
            }
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
            return false;
        }
    },

    /**
     * Show toast notification
     * @param {string} message - Message to display
     * @param {number} duration - Duration in milliseconds
     */
    showToast(message, duration = 3000) {
        const toast = document.createElement('div');
        toast.className = 'mobile-toast';
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            bottom: 80px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 12px 24px;
            border-radius: 24px;
            font-size: 14px;
            z-index: 10000;
            animation: fadeIn 0.3s ease-in-out;
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'fadeOut 0.3s ease-in-out';
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, duration);
    }
};

// Export for ES6 modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MobileUIComponent, MobileUIUtils };
}

/**
 * MobileChatList Component
 * Displays list of DMs and Rooms with search and filtering
 * 
 * Requirements: 1.1, 1.5, 2.5, 10.2
 */
class MobileChatList extends MobileUIComponent {
    constructor(containerId, socketManager, apiClient) {
        super(containerId);
        
        if (!socketManager) {
            throw new Error('socketManager is required');
        }
        if (!apiClient) {
            throw new Error('apiClient is required');
        }
        
        this.socketManager = socketManager;
        this.apiClient = apiClient;
        
        // Initialize state
        this.state = {
            conversations: [], // DM conversations
            rooms: [],         // Room conversations
            activeTab: 'dms',  // 'dms' or 'rooms'
            searchQuery: '',   // Current search filter
            unreadCounts: {},  // Map of chatId to unread count
            loading: false,
            error: null
        };
        
        // Bind methods
        this.onChatSelect = this.onChatSelect.bind(this);
        this.onSearchInput = this.onSearchInput.bind(this);
        this.onTabSwitch = this.onTabSwitch.bind(this);
        this.loadConversations = this.loadConversations.bind(this);
        this.filterConversations = this.filterConversations.bind(this);
        this.updateUnreadCount = this.updateUnreadCount.bind(this);
        
        // Setup Socket.IO event listeners
        this.setupSocketListeners();
    }
    
    /**
     * Setup Socket.IO event listeners for real-time updates
     */
    setupSocketListeners() {
        // Listen for new DM messages
        this.socketManager.on('dm:received', (data) => {
            this.handleNewDM(data);
        });
        
        this.socketManager.on('dm:sent', (data) => {
            this.handleNewDM(data);
        });
        
        // Listen for room updates
        this.socketManager.on('room:joined', (data) => {
            this.handleRoomJoined(data);
        });
        
        this.socketManager.on('room:user:left', (data) => {
            this.handleRoomLeft(data);
        });
        
        // Listen for new messages in rooms
        this.socketManager.on('message:new', (data) => {
            this.handleNewRoomMessage(data);
        });
    }
    
    /**
     * Handle new DM message
     */
    handleNewDM(data) {
        const { fromUsername, toUsername, message } = data;
        const currentUsername = localStorage.getItem('username');
        
        // Determine the other user in the conversation
        const otherUsername = fromUsername === currentUsername ? toUsername : fromUsername;
        
        // Find or create conversation
        let conversation = this.state.conversations.find(c => c.otherUsername === otherUsername);
        
        if (!conversation) {
            // Create new conversation
            conversation = {
                id: `dm-${otherUsername}`,
                type: 'dm',
                otherUsername: otherUsername,
                name: otherUsername,
                lastMessage: message,
                timestamp: new Date(message.timestamp),
                unreadCount: fromUsername !== currentUsername ? 1 : 0
            };
            this.state.conversations.unshift(conversation);
        } else {
            // Update existing conversation
            conversation.lastMessage = message;
            conversation.timestamp = new Date(message.timestamp);
            
            // Increment unread count if message is from other user
            if (fromUsername !== currentUsername) {
                conversation.unreadCount = (conversation.unreadCount || 0) + 1;
            }
            
            // Move to top of list
            this.state.conversations = [
                conversation,
                ...this.state.conversations.filter(c => c.id !== conversation.id)
            ];
        }
        
        this.render();
    }
    
    /**
     * Handle room joined event
     */
    handleRoomJoined(data) {
        const { roomId, roomCode, roomName } = data;
        
        // Check if room already exists
        const existingRoom = this.state.rooms.find(r => r.id === roomId);
        if (existingRoom) {
            return;
        }
        
        // Add new room
        const room = {
            id: roomId,
            type: 'room',
            code: roomCode,
            name: roomName || `Room ${roomCode}`,
            lastMessage: null,
            timestamp: new Date(),
            unreadCount: 0
        };
        
        this.state.rooms.unshift(room);
        this.render();
    }
    
    /**
     * Handle room left event
     */
    handleRoomLeft(data) {
        const { roomId } = data;
        this.state.rooms = this.state.rooms.filter(r => r.id !== roomId);
        this.render();
    }
    
    /**
     * Handle new room message
     */
    handleNewRoomMessage(data) {
        const { roomId, message } = data;
        const currentUserId = localStorage.getItem('userId');
        
        // Find room
        const room = this.state.rooms.find(r => r.id === roomId);
        if (!room) {
            return;
        }
        
        // Update room
        room.lastMessage = message;
        room.timestamp = new Date(message.timestamp);
        
        // Increment unread count if message is from other user
        if (message.senderId !== currentUserId) {
            room.unreadCount = (room.unreadCount || 0) + 1;
        }
        
        // Move to top of list
        this.state.rooms = [
            room,
            ...this.state.rooms.filter(r => r.id !== room.id)
        ];
        
        this.render();
    }
    
    /**
     * Load conversations from API/localStorage
     */
    async loadConversations() {
        this.setState({ loading: true, error: null });
        
        try {
            // Load DM conversations from localStorage
            const storedConversations = localStorage.getItem('dm_conversations');
            if (storedConversations) {
                this.state.conversations = JSON.parse(storedConversations);
            }
            
            // Load rooms from localStorage
            const storedRooms = localStorage.getItem('joined_rooms');
            if (storedRooms) {
                this.state.rooms = JSON.parse(storedRooms);
            }
            
            this.setState({ loading: false });
        } catch (error) {
            console.error('[MobileChatList] Error loading conversations:', error);
            this.setState({ 
                loading: false, 
                error: 'Failed to load conversations' 
            });
        }
    }
    
    /**
     * Filter conversations based on search query
     * @param {string} query - Search query
     * @returns {Array} Filtered conversations
     */
    filterConversations(query) {
        if (!query || query.trim() === '') {
            return this.state.activeTab === 'dms' 
                ? this.state.conversations 
                : this.state.rooms;
        }
        
        const lowerQuery = query.toLowerCase().trim();
        
        if (this.state.activeTab === 'dms') {
            return this.state.conversations.filter(conv => 
                conv.name.toLowerCase().includes(lowerQuery) ||
                conv.otherUsername.toLowerCase().includes(lowerQuery)
            );
        } else {
            return this.state.rooms.filter(room => 
                room.name.toLowerCase().includes(lowerQuery) ||
                (room.code && room.code.toLowerCase().includes(lowerQuery))
            );
        }
    }
    
    /**
     * Update unread count for a chat
     * @param {string} chatId - Chat ID
     * @param {number} count - Unread count
     */
    updateUnreadCount(chatId, count) {
        this.state.unreadCounts[chatId] = count;
        
        // Update in conversations or rooms
        const conversation = this.state.conversations.find(c => c.id === chatId);
        if (conversation) {
            conversation.unreadCount = count;
        }
        
        const room = this.state.rooms.find(r => r.id === chatId);
        if (room) {
            room.unreadCount = count;
        }
        
        this.render();
    }
    
    /**
     * Handle chat selection
     * @param {string} chatId - Selected chat ID
     */
    onChatSelect(chatId) {
        console.log('[MobileChatList] Chat selected:', chatId);
        
        // Emit custom event for parent component to handle
        const event = new CustomEvent('chat:selected', {
            detail: { chatId }
        });
        this.container.dispatchEvent(event);
        
        // Clear unread count for selected chat
        this.updateUnreadCount(chatId, 0);
    }
    
    /**
     * Handle search input
     * @param {string} query - Search query
     */
    onSearchInput(query) {
        this.setState({ searchQuery: query });
    }
    
    /**
     * Handle tab switch
     * @param {string} tab - Tab name ('dms' or 'rooms')
     */
    onTabSwitch(tab) {
        if (tab !== 'dms' && tab !== 'rooms') {
            console.error('[MobileChatList] Invalid tab:', tab);
            return;
        }
        
        this.setState({ activeTab: tab, searchQuery: '' });
    }
    
    /**
     * Render the chat list
     */
    render() {
        // Clear container
        this.container.innerHTML = '';
        
        // Show loading state
        if (this.state.loading) {
            this.showLoading();
            return;
        }
        
        // Show error state
        if (this.state.error) {
            this.showError(this.state.error);
            return;
        }
        
        // Create main container
        const mainContainer = this.createElement('div', {
            className: 'mobile-chat-list'
        });
        
        // Create header with tabs
        const header = this.renderHeader();
        mainContainer.appendChild(header);
        
        // Create search bar
        const searchBar = this.renderSearchBar();
        mainContainer.appendChild(searchBar);
        
        // Render appropriate list based on active tab
        const list = this.state.activeTab === 'dms' 
            ? this.renderDMsList() 
            : this.renderRoomsList();
        mainContainer.appendChild(list);
        
        this.container.appendChild(mainContainer);
    }
    
    /**
     * Render header with tabs
     */
    renderHeader() {
        const header = this.createElement('div', {
            className: 'mobile-chat-list-header',
            style: {
                display: 'flex',
                borderBottom: '1px solid #e0e0e0',
                backgroundColor: '#fff'
            }
        });
        
        // DMs tab
        const dmsTab = this.createElement('button', {
            className: `mobile-chat-tab ${this.state.activeTab === 'dms' ? 'active' : ''}`,
            style: {
                flex: 1,
                padding: '16px',
                border: 'none',
                background: this.state.activeTab === 'dms' ? '#f0f0f0' : 'transparent',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: this.state.activeTab === 'dms' ? 'bold' : 'normal',
                borderBottom: this.state.activeTab === 'dms' ? '2px solid #2196F3' : 'none'
            },
            onClick: () => this.onTabSwitch('dms')
        }, `DMs (${this.state.conversations.length})`);
        
        // Rooms tab
        const roomsTab = this.createElement('button', {
            className: `mobile-chat-tab ${this.state.activeTab === 'rooms' ? 'active' : ''}`,
            style: {
                flex: 1,
                padding: '16px',
                border: 'none',
                background: this.state.activeTab === 'rooms' ? '#f0f0f0' : 'transparent',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: this.state.activeTab === 'rooms' ? 'bold' : 'normal',
                borderBottom: this.state.activeTab === 'rooms' ? '2px solid #2196F3' : 'none'
            },
            onClick: () => this.onTabSwitch('rooms')
        }, `Rooms (${this.state.rooms.length})`);
        
        header.appendChild(dmsTab);
        header.appendChild(roomsTab);
        
        return header;
    }
    
    /**
     * Render search bar
     */
    renderSearchBar() {
        const searchContainer = this.createElement('div', {
            className: 'mobile-chat-search',
            style: {
                padding: '12px',
                backgroundColor: '#fff',
                borderBottom: '1px solid #e0e0e0'
            }
        });
        
        const searchInput = this.createElement('input', {
            type: 'text',
            placeholder: `Search ${this.state.activeTab === 'dms' ? 'conversations' : 'rooms'}...`,
            value: this.state.searchQuery,
            className: 'mobile-chat-search-input',
            style: {
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #ddd',
                borderRadius: '20px',
                fontSize: '14px',
                outline: 'none'
            },
            onInput: (e) => this.onSearchInput(e.target.value)
        });
        
        searchContainer.appendChild(searchInput);
        return searchContainer;
    }
    
    /**
     * Render DMs list
     */
    renderDMsList() {
        const conversations = this.filterConversations(this.state.searchQuery);
        
        const listContainer = this.createElement('div', {
            className: 'mobile-chat-list-items',
            style: {
                overflowY: 'auto',
                height: 'calc(100vh - 180px)'
            }
        });
        
        if (conversations.length === 0) {
            const emptyMessage = this.state.searchQuery 
                ? 'No conversations found' 
                : 'No direct messages yet';
            listContainer.appendChild(
                this.createElement('div', {
                    style: {
                        padding: '40px 20px',
                        textAlign: 'center',
                        color: '#999'
                    }
                }, emptyMessage)
            );
            return listContainer;
        }
        
        conversations.forEach(conversation => {
            const item = this.renderChatItem(conversation);
            listContainer.appendChild(item);
        });
        
        return listContainer;
    }
    
    /**
     * Render Rooms list
     */
    renderRoomsList() {
        const rooms = this.filterConversations(this.state.searchQuery);
        
        const listContainer = this.createElement('div', {
            className: 'mobile-chat-list-items',
            style: {
                overflowY: 'auto',
                height: 'calc(100vh - 180px)'
            }
        });
        
        if (rooms.length === 0) {
            const emptyMessage = this.state.searchQuery 
                ? 'No rooms found' 
                : 'No rooms joined yet';
            listContainer.appendChild(
                this.createElement('div', {
                    style: {
                        padding: '40px 20px',
                        textAlign: 'center',
                        color: '#999'
                    }
                }, emptyMessage)
            );
            return listContainer;
        }
        
        rooms.forEach(room => {
            const item = this.renderChatItem(room);
            listContainer.appendChild(item);
        });
        
        return listContainer;
    }
    
    /**
     * Render individual chat item
     * @param {Object} chat - Chat object (conversation or room)
     */
    renderChatItem(chat) {
        const item = this.createElement('div', {
            className: 'mobile-chat-item',
            style: {
                display: 'flex',
                padding: '16px',
                borderBottom: '1px solid #f0f0f0',
                cursor: 'pointer',
                backgroundColor: '#fff',
                transition: 'background-color 0.2s'
            },
            onClick: () => this.onChatSelect(chat.id)
        });
        
        // Add hover effect
        item.addEventListener('mouseenter', () => {
            item.style.backgroundColor = '#f5f5f5';
        });
        item.addEventListener('mouseleave', () => {
            item.style.backgroundColor = '#fff';
        });
        
        // Avatar
        const avatar = this.createElement('div', {
            className: 'mobile-chat-avatar',
            style: {
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: '#2196F3',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                fontWeight: 'bold',
                flexShrink: 0,
                marginRight: '12px'
            }
        }, chat.name.charAt(0).toUpperCase());
        
        // Content container
        const content = this.createElement('div', {
            className: 'mobile-chat-content',
            style: {
                flex: 1,
                minWidth: 0,
                display: 'flex',
                flexDirection: 'column'
            }
        });
        
        // Top row: name and timestamp
        const topRow = this.createElement('div', {
            style: {
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '4px'
            }
        });
        
        const name = this.createElement('div', {
            className: 'mobile-chat-name',
            style: {
                fontSize: '16px',
                fontWeight: chat.unreadCount > 0 ? 'bold' : 'normal',
                color: '#333',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
            }
        }, chat.name);
        
        const timestamp = this.createElement('div', {
            className: 'mobile-chat-timestamp',
            style: {
                fontSize: '12px',
                color: '#999',
                flexShrink: 0,
                marginLeft: '8px'
            }
        }, chat.timestamp ? this.formatTime(chat.timestamp) : '');
        
        topRow.appendChild(name);
        topRow.appendChild(timestamp);
        
        // Bottom row: last message and unread badge
        const bottomRow = this.createElement('div', {
            style: {
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }
        });
        
        const lastMessage = this.createElement('div', {
            className: 'mobile-chat-last-message',
            style: {
                fontSize: '14px',
                color: '#666',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                flex: 1
            }
        }, chat.lastMessage ? this.sanitizeHTML(chat.lastMessage.content || 'New message') : 'No messages yet');
        
        bottomRow.appendChild(lastMessage);
        
        // Unread badge
        if (chat.unreadCount > 0) {
            const unreadBadge = this.createElement('div', {
                className: 'mobile-chat-unread-badge',
                style: {
                    backgroundColor: '#2196F3',
                    color: '#fff',
                    borderRadius: '12px',
                    padding: '2px 8px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    marginLeft: '8px',
                    flexShrink: 0
                }
            }, chat.unreadCount.toString());
            bottomRow.appendChild(unreadBadge);
        }
        
        content.appendChild(topRow);
        content.appendChild(bottomRow);
        
        item.appendChild(avatar);
        item.appendChild(content);
        
        return item;
    }
}

// Export MobileChatList
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ...module.exports, MobileChatList };
}
