/**
 * State Manager - Centralized application state
 * Handles state updates and notifies subscribers
 */

class StateManager {
  constructor() {
    this.state = {
      // User state
      user: {
        id: null,
        username: null,
        nickname: null,
        isAuthenticated: false
      },

      // Room state
      room: {
        id: null,
        code: null,
        name: null,
        isLocked: false,
        participantCount: 0
      },

      // Messages state
      messages: [],
      pinnedMessages: [],

      // UI state
      ui: {
        screen: 'login', // 'login' | 'chat'
        isTyping: false,
        typingUsers: [],
        editingMessageId: null,
        connectionStatus: 'disconnected' // 'connected' | 'disconnected' | 'reconnecting'
      },

      // Error state
      error: null
    };

    this.subscribers = new Map();
  }

  /**
   * Get current state
   */
  getState() {
    return this.state;
  }

  /**
   * Get specific state slice
   */
  get(path) {
    const keys = path.split('.');
    let value = this.state;
    for (const key of keys) {
      value = value?.[key];
    }
    return value;
  }

  /**
   * Update state and notify subscribers
   */
  setState(updates) {
    const oldState = { ...this.state };
    this.state = this.deepMerge(this.state, updates);
    this.notifySubscribers(oldState, this.state);
  }

  /**
   * Deep merge objects
   */
  deepMerge(target, source) {
    const output = { ...target };
    for (const key in source) {
      // Don't deep merge arrays - replace them entirely
      if (Array.isArray(source[key])) {
        output[key] = source[key];
      } else if (source[key] instanceof Object && key in target && !Array.isArray(target[key])) {
        output[key] = this.deepMerge(target[key], source[key]);
      } else {
        output[key] = source[key];
      }
    }
    return output;
  }

  /**
   * Subscribe to state changes
   */
  subscribe(path, callback) {
    if (!this.subscribers.has(path)) {
      this.subscribers.set(path, []);
    }
    this.subscribers.get(path).push(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.subscribers.get(path);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    };
  }

  /**
   * Notify subscribers of state changes
   */
  notifySubscribers(oldState, newState) {
    this.subscribers.forEach((callbacks, path) => {
      const oldValue = this.getValueByPath(oldState, path);
      const newValue = this.getValueByPath(newState, path);

      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        callbacks.forEach(callback => {
          try {
            callback(newValue, oldValue);
          } catch (error) {
            console.error(`[State] Error in subscriber for ${path}:`, error);
          }
        });
      }
    });
  }

  /**
   * Get value by path
   */
  getValueByPath(obj, path) {
    const keys = path.split('.');
    let value = obj;
    for (const key of keys) {
      value = value?.[key];
    }
    return value;
  }

  /**
   * User actions
   */
  setUser(user) {
    this.setState({
      user: {
        ...user,
        isAuthenticated: true
      }
    });
  }

  clearUser() {
    this.setState({
      user: {
        id: null,
        username: null,
        nickname: null,
        isAuthenticated: false
      }
    });
  }

  /**
   * Room actions
   */
  setRoom(room) {
    this.setState({ room });
  }

  clearRoom() {
    this.setState({
      room: {
        id: null,
        code: null,
        name: null,
        isLocked: false,
        participantCount: 0
      }
    });
  }

  /**
   * Message actions
   */
  addMessage(message) {
    // Ensure messages is an array
    const currentMessages = Array.isArray(this.state.messages) ? this.state.messages : [];
    
    // Prevent duplicates
    if (currentMessages.some(m => m.id === message.id)) {
      return;
    }

    this.setState({
      messages: [...currentMessages, message]
    });
  }

  updateMessage(messageId, updates) {
    const currentMessages = Array.isArray(this.state.messages) ? this.state.messages : [];
    this.setState({
      messages: currentMessages.map(msg =>
        msg.id === messageId ? { ...msg, ...updates } : msg
      )
    });
  }

  removeMessage(messageId) {
    const currentMessages = Array.isArray(this.state.messages) ? this.state.messages : [];
    this.setState({
      messages: currentMessages.filter(msg => msg.id !== messageId)
    });
  }

  setMessages(messages) {
    // Ensure messages is an array
    this.setState({ 
      messages: Array.isArray(messages) ? messages : []
    });
  }

  clearMessages() {
    this.setState({ messages: [] });
  }

  /**
   * UI actions
   */
  setScreen(screen) {
    this.setState({
      ui: { ...this.state.ui, screen }
    });
  }

  setConnectionStatus(status) {
    this.setState({
      ui: { ...this.state.ui, connectionStatus: status }
    });
  }

  setEditingMessage(messageId) {
    this.setState({
      ui: { ...this.state.ui, editingMessageId: messageId }
    });
  }

  clearEditingMessage() {
    this.setState({
      ui: { ...this.state.ui, editingMessageId: null }
    });
  }

  setTypingUsers(users) {
    this.setState({
      ui: { ...this.state.ui, typingUsers: users }
    });
  }

  /**
   * Error actions
   */
  setError(error) {
    this.setState({ error });
  }

  clearError() {
    this.setState({ error: null });
  }

  /**
   * Reset entire state
   */
  reset() {
    this.state = {
      user: {
        id: null,
        username: null,
        nickname: null,
        isAuthenticated: false
      },
      room: {
        id: null,
        code: null,
        name: null,
        isLocked: false,
        participantCount: 0
      },
      messages: [],
      pinnedMessages: [],
      ui: {
        screen: 'login',
        isTyping: false,
        typingUsers: [],
        editingMessageId: null,
        connectionStatus: 'disconnected'
      },
      error: null
    };
    this.notifySubscribers({}, this.state);
  }
}

// Export singleton instance
const state = new StateManager();

// Make available globally
window.state = state;
