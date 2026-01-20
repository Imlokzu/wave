/**
 * Socket Manager - Handles WebSocket connections and real-time events
 * Manages connection state, reconnection, and event subscriptions
 */

class SocketManager {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.eventHandlers = new Map();
    this.messageQueue = [];
  }

  /**
   * Initialize socket connection
   */
  connect() {
    if (this.socket) {
      return;
    }

    this.socket = io({
      reconnection: true,
      reconnectionDelay: this.reconnectDelay,
      reconnectionAttempts: this.maxReconnectAttempts
    });

    this.setupConnectionHandlers();
    this.setupEventForwarding();
  }

  /**
   * Setup connection lifecycle handlers
   */
  setupConnectionHandlers() {
    this.socket.on('connect', () => {
      console.log('[Socket] Connected');
      this.connected = true;
      this.reconnectAttempts = 0;
      this.emit('connection:established');
      this.flushMessageQueue();
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
      this.connected = false;
      this.emit('connection:lost', { reason });
    });

    this.socket.on('connect_error', (error) => {
      console.error('[Socket] Connection error:', error);
      this.reconnectAttempts++;
      this.emit('connection:error', { error, attempts: this.reconnectAttempts });
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('[Socket] Reconnected after', attemptNumber, 'attempts');
      this.emit('connection:reconnected', { attempts: attemptNumber });
    });

    this.socket.on('reconnect_failed', () => {
      console.error('[Socket] Reconnection failed');
      this.emit('connection:failed');
    });
  }

  /**
   * Setup event forwarding to registered handlers
   */
  setupEventForwarding() {
    // Room events
    this.socket.on('room:joined', (data) => this.emit('room:joined', data));
    this.socket.on('room:user:joined', (data) => this.emit('room:user:joined', data));
    this.socket.on('room:user:left', (data) => this.emit('room:user:left', data));
    this.socket.on('room:participants', (data) => {
      console.log('[Socket] Received room:participants event:', data);
      this.emit('room:participants', data);
    });

    // Message events
    this.socket.on('messages:history', (data) => this.emit('messages:history', data));
    this.socket.on('message:new', (data) => this.emit('message:new', data));
    this.socket.on('message:edited', (data) => this.emit('message:edited', data));
    this.socket.on('message:deleted', (data) => this.emit('message:deleted', data));
    this.socket.on('message:image', (data) => this.emit('message:image', data));
    this.socket.on('message:file', (data) => this.emit('message:file', data));
    this.socket.on('message:voice', (data) => this.emit('message:voice', data));
    this.socket.on('message:poll', (data) => this.emit('message:poll', data));
    this.socket.on('message:fake', (data) => this.emit('message:fake', data));
    this.socket.on('message:pinned', (data) => this.emit('message:pinned', data));
    this.socket.on('message:unpinned', (data) => this.emit('message:unpinned', data));

    // Reaction events
    this.socket.on('reaction:added', (data) => this.emit('reaction:added', data));
    this.socket.on('reaction:removed', (data) => this.emit('reaction:removed', data));

    // Poll events
    this.socket.on('poll:voted', (data) => this.emit('poll:voted', data));
    this.socket.on('poll:closed', (data) => this.emit('poll:closed', data));

    // Typing events
    this.socket.on('typing:update', (data) => this.emit('typing:update', data));

    // Read receipt events
    this.socket.on('message:read', (data) => this.emit('message:read', data));
    this.socket.on('dm:read', (data) => this.emit('dm:read', data));

    // Chat events
    this.socket.on('chat:cleared', (data) => this.emit('chat:cleared', data));
    this.socket.on('chat:cleared:local', () => this.emit('chat:cleared:local'));

    // User status events
    this.socket.on('user:online', (data) => this.emit('user:online', data));
    this.socket.on('user:offline', (data) => this.emit('user:offline', data));

    // DM events
    this.socket.on('dm:received', (data) => {
      console.log('[Socket] DM received:', data);
      this.emit('dm:received', data);
    });
    this.socket.on('dm:sent', (data) => this.emit('dm:sent', data));
    this.socket.on('dm:history', (data) => {
      console.log('[Socket] DM history received:', data);
      this.emit('dm:history', data);
    });

    // Invite events
    this.socket.on('invite:received', (data) => {
      console.log('');
      console.log('🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔');
      console.log('📨 [Socket.js] RAW INVITE:RECEIVED EVENT FROM SERVER!');
      console.log('🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔');
      console.log('Data:', JSON.stringify(data, null, 2));
      console.log('🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔🔔');
      console.log('');
      this.emit('invite:received', data);
    });
    this.socket.on('invite:sent', (data) => {
      console.log('');
      console.log('✅ [Socket.js] RAW INVITE:SENT EVENT FROM SERVER!');
      console.log('Data:', JSON.stringify(data, null, 2));
      console.log('');
      this.emit('invite:sent', data);
    });

    // Username registration events
    this.socket.on('username:registered', (data) => {
      console.log('[Socket] ✅ Username registered:', data);
      this.emit('username:registered', data);
    });

    // Error events
    this.socket.on('error', (data) => this.emit('error', data));
  }

  /**
   * Register event handler
   */
  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event).push(handler);
  }

  /**
   * Unregister event handler
   */
  off(event, handler) {
    if (!this.eventHandlers.has(event)) {
      return;
    }
    const handlers = this.eventHandlers.get(event);
    const index = handlers.indexOf(handler);
    if (index > -1) {
      handlers.splice(index, 1);
    }
  }

  /**
   * Emit event to registered handlers
   */
  emit(event, data) {
    if (!this.eventHandlers.has(event)) {
      return;
    }
    this.eventHandlers.get(event).forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        console.error(`[Socket] Error in handler for ${event}:`, error);
      }
    });
  }

  /**
   * Send event to server (with queueing if disconnected)
   */
  send(event, data) {
    if (!this.connected) {
      console.warn('[Socket] Not connected, queueing message:', event);
      this.messageQueue.push({ event, data });
      return;
    }

    this.socket.emit(event, data);
  }

  /**
   * Flush queued messages after reconnection
   */
  flushMessageQueue() {
    if (this.messageQueue.length === 0) {
      return;
    }

    console.log('[Socket] Flushing', this.messageQueue.length, 'queued messages');
    this.messageQueue.forEach(({ event, data }) => {
      this.socket.emit(event, data);
    });
    this.messageQueue = [];
  }

  /**
   * Room actions
   */
  joinRoom(roomCode, nickname) {
    this.send('join:room', { roomCode, nickname });
  }

  leaveRoom() {
    this.send('leave:room');
  }

  /**
   * Register username for invites and DMs
   */
  registerUsername(username, nickname) {
    this.send('register:username', { username, nickname });
  }

  /**
   * Message actions
   */
  sendMessage(content) {
    // Check if message contains @ai and inject preferred model if set
    if (content.includes('@ai') && !content.includes('[model:')) {
      const preferredModel = localStorage.getItem('preferredAIModel');
      if (preferredModel && preferredModel !== 'auto') {
        // Inject model selection into message
        content = content.replace('@ai', `@ai [model:${preferredModel}]`);
      }
    }
    this.send('send:message', { content });
  }

  sendImage(imageData, filename) {
    this.send('send:image', { imageData, filename });
  }

  editMessage(messageId, content) {
    console.log('[Socket] Sending edit:message for:', messageId);
    this.send('edit:message', { messageId, content });
  }

  deleteMessage(messageId) {
    console.log('[Socket] ✅ Sending delete:message for:', messageId);
    this.send('delete:message', { messageId });
  }

  /**
   * Typing indicators
   */
  startTyping() {
    this.send('typing:start');
  }

  stopTyping() {
    this.send('typing:stop');
  }

  /**
   * Reactions
   */
  addReaction(messageId, emoji) {
    this.send('add:reaction', { messageId, emoji });
  }

  removeReaction(messageId, emoji) {
    this.send('remove:reaction', { messageId, emoji });
  }

  /**
   * Read receipts
   */
  markMessageRead(messageId) {
    this.send('mark:read', { messageId });
  }

  markAllRead(messageIds) {
    console.log('[Socket] Marking messages as read:', messageIds);
    this.send('mark:all:read', { messageIds });
  }

  /**
   * DM Read receipts
   */
  markDMRead(messageId, otherUsername) {
    console.log('[Socket] Marking DM as read:', { messageId, otherUsername });
    this.send('mark:dm:read', { messageId, otherUsername });
  }

  markDMAllRead(messageIds, otherUsername) {
    console.log('[Socket] Marking DMs as read:', { count: messageIds.length, otherUsername });
    this.send('mark:dm:all:read', { messageIds, otherUsername });
  }

  /**
   * Polls
   */
  sendPoll(question, options, allowMultiple = false) {
    this.send('send:poll', { question, options, allowMultiple });
  }

  votePoll(messageId, optionId) {
    this.send('vote:poll', { messageId, optionId });
  }

  closePoll(messageId) {
    this.send('close:poll', { messageId });
  }

  /**
   * Invites
   */
  sendInvite(toUsername, roomId, roomCode) {
    console.log('');
    console.log('═══════════════════════════════════════════════════════');
    console.log('📤 [Socket.js] SENDING INVITE');
    console.log('═══════════════════════════════════════════════════════');
    console.log('To Username:', toUsername);
    console.log('Room Code:', roomCode);
    console.log('Room ID:', roomId);
    console.log('Socket Connected:', this.connected);
    console.log('Socket ID:', this.socket?.id);
    console.log('═══════════════════════════════════════════════════════');
    console.log('');
    
    this.send('send:invite', { toUsername, roomId, roomCode });
  }

  /**
   * Direct Messages
   */
  sendDM(toUsername, content) {
    console.log('[Socket] 💬 Sending DM to:', toUsername);
    // Check if message contains @ai and inject preferred model if set
    if (content.includes('@ai') && !content.includes('[model:')) {
      const preferredModel = localStorage.getItem('preferredAIModel');
      if (preferredModel && preferredModel !== 'auto') {
        // Inject model selection into message
        content = content.replace('@ai', `@ai [model:${preferredModel}]`);
      }
    }
    this.send('send:dm', { toUsername, content });
  }

  getDMHistory(otherUsername) {
    console.log('[Socket] 📜 Getting DM history with:', otherUsername);
    this.send('get:dm:history', { otherUsername });
  }

  /**
   * Pin/Unpin
   */
  pinMessage(messageId) {
    this.send('pin:message', { messageId });
  }

  unpinMessage(messageId) {
    this.send('unpin:message', { messageId });
  }

  /**
   * Chat actions
   */
  clearChatLocal() {
    this.send('clear:chat:local');
  }

  clearChatAll() {
    this.send('clear:chat:all');
  }

  /**
   * Request current participants list
   */
  requestParticipants() {
    this.send('get:participants');
  }

  /**
   * Disconnect
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
    }
  }

  /**
   * Get connection status
   */
  isConnected() {
    return this.connected;
  }
}

// Export singleton instance
const socketManager = new SocketManager();

// Make available globally
window.socketManager = socketManager;
