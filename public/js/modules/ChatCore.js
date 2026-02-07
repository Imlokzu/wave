/**
 * ChatCore - Core chat functionality and state management
 * Professional-grade chat application module
 * @author Senior Backend Developer
 * @version 2.0.0
 */

class ChatCore {
    constructor(config = {}) {
        this.config = {
            apiBaseUrl: config.apiBaseUrl || '/api',
            socketUrl: config.socketUrl || window.location.origin,
            reconnectAttempts: config.reconnectAttempts || 5,
            messageBuffer: config.messageBuffer || 100,
            ...config
        };

            this.state = {
            currentUser: null,
            currentRoom: null,
            isConnected: false,
            isAuthenticated: false,
            isDemoMode: false,
            messages: new Map(),
            users: new Map(),
            rooms: new Map()
        };

        this.socket = null;
        this.messageQueue = [];
        this.eventListeners = new Map();
        this.retryCount = 0;
        
        this.init();
    }

    /**
     * Initialize chat core
     */
    async init() {
        try {
            await this.authenticate();
            
            // Only initialize socket if authenticated
            if (this.state.isAuthenticated) {
                await this.initializeSocket();
                this.setupEventHandlers();
            } else {
                console.warn('[ChatCore] Initialized without authentication - limited functionality');
                this.setupOfflineEventHandlers();
            }
            
            this.emit('core:initialized');
        } catch (error) {
            console.error('[ChatCore] Initialization failed:', error);
            this.emit('core:error', { type: 'initialization', error });
            
            // Continue with offline mode
            this.setupOfflineEventHandlers();
        }
    }

    /**
     * Setup event handlers for authenticated socket connection
     */
    setupEventHandlers() {
        if (!this.socket) {
            console.warn('[ChatCore] No socket available for event handlers');
            return;
        }
        
        // Socket event handlers
        this.socket.on('connect', () => {
            console.log('[ChatCore] Socket connected');
            this.state.isConnected = true;
            this.emit('socket:connected');
        });
        
        this.socket.on('disconnect', () => {
            console.log('[ChatCore] Socket disconnected');
            this.state.isConnected = false;
            this.emit('socket:disconnected');
        });
        
        // Chat message events
        this.socket.on('message:new', (data) => {
            this.handleNewMessage(data);
        });
        
        this.socket.on('message:edited', (data) => {
            this.handleMessageEdit(data);
        });
        
        this.socket.on('message:deleted', (data) => {
            this.handleMessageDelete(data);
        });
        
        // Room events
        this.socket.on('room:joined', (data) => {
            this.handleRoomJoined(data);
        });
        
        this.socket.on('room:left', (data) => {
            this.handleRoomLeft(data);
        });
        
        // User events
        this.socket.on('user:joined', (data) => {
            this.handleUserJoined(data);
        });
        
        this.socket.on('user:left', (data) => {
            this.handleUserLeft(data);
        });
        
        console.log('[ChatCore] Socket event handlers initialized');
    }

    /**
     * Setup event handlers for offline mode
     */
    setupOfflineEventHandlers() {
        // Minimal event handling for offline/unauthenticated state
        this.emit('core:offline');
        
        // If in demo mode, add some demo data
        if (this.state.isDemoMode) {
            this.setupDemoData();
        }
    }
    
    /**
     * Setup demo data for development
     */
    setupDemoData() {
        console.log('[ChatCore] Setting up demo data');
        
        // Add demo rooms
        const demoRooms = [
            { id: 'demo1', name: 'General Chat', description: 'Demo room for testing' },
            { id: 'demo2', name: 'Random', description: 'Random conversations' }
        ];
        
        demoRooms.forEach(room => {
            this.state.rooms.set(room.id, room);
        });
        
        // Add demo messages
        const demoMessages = [
            {
                id: 'msg1',
                content: 'Welcome to the demo chat!',
                roomId: 'demo1',
                senderId: 'system',
                senderName: 'System',
                timestamp: Date.now() - 60000
            },
            {
                id: 'msg2',
                content: 'This is a demo message to show how the chat works.',
                roomId: 'demo1',
                senderId: 'demo_user',
                senderName: 'Demo User',
                timestamp: Date.now() - 30000
            }
        ];
        
        this.state.messages.set('demo1', demoMessages);
        
        // Emit demo data loaded
        setTimeout(() => {
            this.emit('demo:loaded', { rooms: demoRooms, messages: demoMessages });
        }, 500);
    }

    /**
     * Authenticate user
     */
    async authenticate() {
        try {
            // Check if we have a token from auth-guard.js or localStorage
            let token = localStorage.getItem('auth_token') || 
                       localStorage.getItem('token') ||
                       sessionStorage.getItem('auth_token');
            
            // If no token, try to get from existing auth system
            if (!token) {
                // Wait for auth-guard.js to complete
                await this.waitForAuth();
                token = localStorage.getItem('auth_token') || localStorage.getItem('token');
            }
            
            if (!token) {
                // Try guest mode or redirect to login
                console.warn('[ChatCore] No auth token found, attempting guest mode');
                this.handleNoAuth();
                return;
            }

            // Check if this is a demo/development token - skip API call
            if (token.startsWith('demo_') || token.startsWith('dev_') || 
                window.location.hostname === 'localhost' || 
                window.location.hostname === '127.0.0.1') {
                
                console.log('[ChatCore] Demo/Development mode detected - skipping API verification');
                
                // Get user data from localStorage for demo mode
                const userData = this.tryGetExistingUser() || {
                    id: 'demo_user_' + Date.now(),
                    username: 'Demo User',
                    email: 'demo@localhost',
                    isDev: true
                };
                
                this.state.currentUser = userData;
                this.state.isAuthenticated = true;
                this.state.isDemoMode = true;
                
                console.log('[ChatCore] Demo mode authentication successful');
                this.emit('auth:success', userData);
                return;
            }

            // Only make API call for real tokens
            const response = await this.apiRequest('/auth/verify', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                throw new Error(`Authentication failed: ${response.status}`);
            }
            
            const userData = await response.json();
            this.state.currentUser = userData.user;
            this.state.isAuthenticated = true;
            
            this.emit('auth:success', userData.user);
        } catch (error) {
            console.error('[ChatCore] Authentication failed:', error);
            this.emit('auth:failed', error);
            this.handleAuthFailure(error);
        }
    }

    /**
     * Wait for auth system to initialize
     */
    async waitForAuth(timeout = 10000) {
        return new Promise((resolve) => {
            const startTime = Date.now();
            const checkAuth = () => {
                // Check multiple possible token locations
                const hasToken = localStorage.getItem('auth_token') || 
                               localStorage.getItem('token') ||
                               sessionStorage.getItem('auth_token') ||
                               window.authGuard?.token;
                
                if (hasToken || Date.now() - startTime > timeout) {
                    console.log('[ChatCore] Auth check completed, token found:', !!hasToken);
                    resolve();
                } else {
                    setTimeout(checkAuth, 200);
                }
            };
            setTimeout(checkAuth, 100); // Initial delay
        });
    }

    /**
     * Handle missing authentication
     */
    handleNoAuth() {
        // Check if we're already on login page
        if (window.location.pathname.includes('login')) {
            this.emit('auth:failed', new Error('Please log in to continue'));
            return;
        }
        
        // Try to use existing user data from other sources
        const existingUser = this.tryGetExistingUser();
        if (existingUser) {
            this.state.currentUser = existingUser;
            this.state.isAuthenticated = true;
            this.emit('auth:success', existingUser);
            return;
        }
        
        // Redirect to login
        console.log('[ChatCore] Redirecting to login...');
        this.redirectToLogin();
    }

    /**
     * Try to get existing user data
     */
    tryGetExistingUser() {
        try {
            const userData = localStorage.getItem('user_data') || 
                           localStorage.getItem('currentUser');
            return userData ? JSON.parse(userData) : null;
        } catch (e) {
            return null;
        }
    }

    /**
     * Handle authentication failure
     */
    handleAuthFailure(error) {
        // Clear invalid tokens
        localStorage.removeItem('auth_token');
        localStorage.removeItem('token');
        sessionStorage.removeItem('auth_token');
        
        // Don't throw error, let app continue in limited mode
        console.warn('[ChatCore] Continuing in limited mode due to auth failure');
    }

    /**
     * Redirect to login page
     */
    redirectToLogin() {
        const currentPath = window.location.pathname;
        
        // Don't redirect if we're in development mode or already on chat page
        if (window.location.hostname === 'localhost' || 
            window.location.hostname === '127.0.0.1' ||
            currentPath.includes('chat')) {
            console.log('[ChatCore] Development mode - skipping login redirect');
            this.createDemoUser();
            return;
        }
        
        if (!currentPath.includes('login')) {
            window.location.href = '/login.html';
        }
    }
    
    /**
     * Create demo user for development
     */
    createDemoUser() {
        const demoUser = {
            id: 'demo_user_' + Date.now(),
            username: 'Demo User',
            email: 'demo@example.com',
            avatar: null
        };
        
        const demoToken = 'demo_token_' + Math.random().toString(36).substr(2, 9);
        
        localStorage.setItem('auth_token', demoToken);
        localStorage.setItem('user_data', JSON.stringify(demoUser));
        
        this.state.currentUser = demoUser;
        this.state.isAuthenticated = true;
        
        console.log('[ChatCore] Created demo user for development');
        this.emit('auth:success', demoUser);
    }

    /**
     * Initialize socket connection
     */
    async initializeSocket() {
        return new Promise((resolve, reject) => {
            try {
                this.socket = io(this.config.socketUrl, {
                    auth: { token: localStorage.getItem('auth_token') },
                    reconnection: true,
                    reconnectionAttempts: this.config.reconnectAttempts,
                    timeout: 10000
                });

                this.socket.on('connect', () => {
                    console.log('[ChatCore] Socket connected');
                    this.state.isConnected = true;
                    this.retryCount = 0;
                    this.processMessageQueue();
                    this.emit('socket:connected');
                    resolve();
                });

                this.socket.on('disconnect', (reason) => {
                    console.warn('[ChatCore] Socket disconnected:', reason);
                    this.state.isConnected = false;
                    this.emit('socket:disconnected', reason);
                });

                this.socket.on('connect_error', (error) => {
                    console.error('[ChatCore] Socket connection error:', error);
                    this.retryCount++;
                    this.emit('socket:error', error);
                    
                    if (this.retryCount >= this.config.reconnectAttempts) {
                        reject(new Error('Socket connection failed'));
                    }
                });

                this.setupSocketEventHandlers();

            } catch (error) {
                console.error('[ChatCore] Socket initialization failed:', error);
                reject(error);
            }
        });
    }

    /**
     * Setup socket event handlers
     */
    setupSocketEventHandlers() {
        this.socket.on('message:new', (message) => {
            this.handleNewMessage(message);
        });

        this.socket.on('message:updated', (message) => {
            this.handleMessageUpdate(message);
        });

        this.socket.on('user:joined', (user) => {
            this.state.users.set(user.id, user);
            this.emit('user:joined', user);
        });

        this.socket.on('user:left', (userId) => {
            this.state.users.delete(userId);
            this.emit('user:left', userId);
        });

        this.socket.on('room:updated', (room) => {
            this.state.rooms.set(room.id, room);
            this.emit('room:updated', room);
        });
    }

    /**
     * Handle new message
     */
    handleNewMessage(message) {
        try {
            const roomMessages = this.state.messages.get(message.roomId) || [];
            roomMessages.push(message);
            
            // Keep only last N messages in memory
            if (roomMessages.length > this.config.messageBuffer) {
                roomMessages.shift();
            }
            
            this.state.messages.set(message.roomId, roomMessages);
            this.emit('message:received', message);
        } catch (error) {
            console.error('[ChatCore] Failed to handle new message:', error);
        }
    }

    /**
     * Handle message edit
     */
    handleMessageEdit(data) {
        try {
            const roomMessages = this.state.messages.get(data.roomId) || [];
            const messageIndex = roomMessages.findIndex(msg => msg.id === data.messageId);
            
            if (messageIndex !== -1) {
                roomMessages[messageIndex] = { ...roomMessages[messageIndex], ...data.updates };
                this.state.messages.set(data.roomId, roomMessages);
                this.emit('message:edited', data);
            }
        } catch (error) {
            console.error('[ChatCore] Failed to handle message edit:', error);
        }
    }

    /**
     * Handle message delete
     */
    handleMessageDelete(data) {
        try {
            const roomMessages = this.state.messages.get(data.roomId) || [];
            const filteredMessages = roomMessages.filter(msg => msg.id !== data.messageId);
            
            this.state.messages.set(data.roomId, filteredMessages);
            this.emit('message:deleted', data);
        } catch (error) {
            console.error('[ChatCore] Failed to handle message delete:', error);
        }
    }

    /**
     * Handle room joined
     */
    handleRoomJoined(data) {
        try {
            this.state.rooms.set(data.room.id, data.room);
            this.emit('room:joined', data);
        } catch (error) {
            console.error('[ChatCore] Failed to handle room joined:', error);
        }
    }

    /**
     * Handle room left
     */
    handleRoomLeft(data) {
        try {
            this.state.rooms.delete(data.roomId);
            this.emit('room:left', data);
        } catch (error) {
            console.error('[ChatCore] Failed to handle room left:', error);
        }
    }

    /**
     * Handle user joined
     */
    handleUserJoined(data) {
        try {
            this.emit('user:joined', data);
        } catch (error) {
            console.error('[ChatCore] Failed to handle user joined:', error);
        }
    }

    /**
     * Handle user left
     */
    handleUserLeft(data) {
        try {
            this.emit('user:left', data);
        } catch (error) {
            console.error('[ChatCore] Failed to handle user left:', error);
        }
    }

    /**
     * Send message
     */
    async sendMessage(content, roomId, options = {}) {
        try {
            if (!this.state.isConnected) {
                throw new Error('Not connected to server');
            }

            if (!content?.trim()) {
                throw new Error('Message content cannot be empty');
            }

            const message = {
                id: this.generateMessageId(),
                content: content.trim(),
                roomId: roomId || this.state.currentRoom?.id,
                senderId: this.state.currentUser.id,
                timestamp: Date.now(),
                type: options.type || 'text',
                metadata: options.metadata || {}
            };

            // Add to queue if not connected
            if (!this.state.isConnected) {
                this.messageQueue.push(message);
                return message;
            }

            this.socket.emit('message:send', message);
            this.emit('message:sent', message);
            
            return message;
        } catch (error) {
            console.error('[ChatCore] Failed to send message:', error);
            this.emit('message:error', { error, content, roomId });
            throw error;
        }
    }

    /**
     * Join room
     */
    async joinRoom(roomId) {
        try {
            if (!roomId) throw new Error('Room ID is required');

            const response = await this.apiRequest(`/rooms/${roomId}/join`, {
                method: 'POST'
            });

            if (!response.ok) throw new Error('Failed to join room');

            const roomData = await response.json();
            this.state.currentRoom = roomData.room;
            
            // Load recent messages
            await this.loadRoomMessages(roomId);
            
            this.socket?.emit('room:join', roomId);
            this.emit('room:joined', roomData.room);
            
            return roomData.room;
        } catch (error) {
            console.error('[ChatCore] Failed to join room:', error);
            this.emit('room:error', { type: 'join', error, roomId });
            throw error;
        }
    }

    /**
     * Load room messages
     */
    async loadRoomMessages(roomId, limit = 50, before = null) {
        try {
            const params = new URLSearchParams({ limit });
            if (before) params.append('before', before);

            const response = await this.apiRequest(
                `/rooms/${roomId}/messages?${params}`
            );

            if (!response.ok) throw new Error('Failed to load messages');

            const { messages } = await response.json();
            this.state.messages.set(roomId, messages);
            
            this.emit('messages:loaded', { roomId, messages });
            return messages;
        } catch (error) {
            console.error('[ChatCore] Failed to load messages:', error);
            this.emit('messages:error', { type: 'load', error, roomId });
            throw error;
        }
    }

    /**
     * Process queued messages
     */
    processMessageQueue() {
        while (this.messageQueue.length > 0 && this.state.isConnected) {
            const message = this.messageQueue.shift();
            this.socket.emit('message:send', message);
        }
    }

    /**
     * API request wrapper
     */
    async apiRequest(endpoint, options = {}) {
        const url = `${this.config.apiBaseUrl}${endpoint}`;
        const token = localStorage.getItem('auth_token');
        
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` })
            }
        };

        return fetch(url, { ...defaultOptions, ...options });
    }

    /**
     * Event system
     */
    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }

    off(event, callback) {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            const index = listeners.indexOf(callback);
            if (index > -1) listeners.splice(index, 1);
        }
    }

    emit(event, data) {
        const listeners = this.eventListeners.get(event) || [];
        listeners.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`[ChatCore] Error in event listener for ${event}:`, error);
            }
        });
    }

    /**
     * Utilities
     */
    generateMessageId() {
        return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Cleanup
     */
    destroy() {
        this.socket?.disconnect();
        this.eventListeners.clear();
        this.messageQueue.length = 0;
        
        console.log('[ChatCore] Destroyed');
    }

    /**
     * Getters
     */
    get isConnected() { return this.state.isConnected; }
    get isAuthenticated() { return this.state.isAuthenticated; }
    get currentUser() { return this.state.currentUser; }
    get currentRoom() { return this.state.currentRoom; }
    get messages() { return this.state.messages; }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChatCore;
} else if (typeof window !== 'undefined') {
    window.ChatCore = ChatCore;
}