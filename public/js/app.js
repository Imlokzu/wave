/**
 * Application Controller - Main application logic
 * Coordinates between API, Socket, State, and UI
 */

class App {
  constructor() {
    this.typingTimeout = null;
    this.typingDebounceMs = 300;
    this.participantsHeartbeat = null;
    this.isTabActive = true;
    
    // DM conversations list (for sidebar)
    this.dmConversations = new Set();
    
    // Rooms list (for sidebar)
    this.rooms = new Map(); // Map of roomCode -> {id, code, name}
    
    // Separate message stores for context isolation
    this.roomMessages = new Map(); // Map of roomId -> messages[]
    this.dmMessages = new Map();   // Map of dmUsername -> messages[]
    
    // Unread message counts
    this.unreadCounts = new Map(); // Map of roomId/dmUsername -> count
    
    // User preferences
    this.preferences = {
      soundEnabled: localStorage.getItem('soundEnabled') !== 'false', // Default true
      notificationsEnabled: localStorage.getItem('notificationsEnabled') !== 'false'
    };
    
    // Setup flags to prevent duplicates
    this.chatButtonsSetup = false;
    this.socketHandlersSetup = false;
  }

  /**
   * Initialize application
   */
  async init() {
    console.log('[App] Initializing...');

    // Initialize UI
    ui.init();

    // Setup state subscriptions FIRST (before any state changes)
    this.setupStateSubscriptions();

    // Check authentication FIRST - redirect if not authenticated
    const isAuthenticated = await this.checkAuthentication();
    if (!isAuthenticated) {
      console.log('[App] Not authenticated, redirecting to login...');
      window.location.href = '/login.html';
      return; // Stop initialization
    }

    // User is authenticated, show chat screen immediately
    console.log('[App] User authenticated, showing chat...');
    state.setScreen('chat');
    
    // Ensure loading screen is hidden
    const loadingScreen = document.getElementById('loginScreen');
    if (loadingScreen) {
      loadingScreen.classList.add('hidden');
      loadingScreen.style.display = 'none';
    }
    
    // Ensure chat screen is visible
    const chatScreen = document.getElementById('chatScreen');
    if (chatScreen) {
      chatScreen.classList.add('active');
      chatScreen.style.display = 'flex';
    }
    
    // Initialize UI state (show create room button if no room)
    this.updateRoomUIState(false);

    // Try to restore session from localStorage
    await this.restoreSession();

    // Setup UI event handlers
    this.setupUIHandlers();

    // Connect socket
    socketManager.connect();

    // Setup socket event handlers (username will be registered on connection)
    this.setupSocketHandlers();

    // Setup visibility change detection for away status
    this.setupVisibilityDetection();

    // Check health
    try {
      const health = await api.healthCheck();
      console.log('[App] Server health:', health);
    } catch (error) {
      console.error('[App] Health check failed:', error);
    }

    console.log('[App] Ready');
  }

  /**
   * Check if user is authenticated
   * Returns true if authenticated, false otherwise
   */
  async checkAuthentication() {
    const authToken = localStorage.getItem('authToken');
    const userId = localStorage.getItem('userId');

    if (!authToken || !userId) {
      console.log('[App] No auth token found');
      return false;
    }

    try {
      const response = await fetch('/api/auth/session', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('[App] Session valid:', data.user);
        
        // Store user info in state
        state.setUser({
          id: data.user.id,
          username: data.user.username,
          nickname: data.user.nickname
        });
        
        return true;
      } else {
        console.log('[App] Session invalid');
        // Clear invalid tokens
        localStorage.removeItem('authToken');
        localStorage.removeItem('userId');
        localStorage.removeItem('username');
        localStorage.removeItem('nickname');
        return false;
      }
    } catch (error) {
      console.error('[App] Auth check failed:', error);
      return false;
    }
  }

  /**
   * Setup visibility change detection
   * ## CODE REVIEW FIX: Removed user:away event - not needed for this app
   */
  setupVisibilityDetection() {
    // Removed away status tracking - not needed for this app
    document.addEventListener('visibilitychange', () => {
      this.isTabActive = !document.hidden;
      
      if (!document.hidden) {
        console.log('[App] Tab visible - user is active');
        // Request fresh participants when coming back
        if (state.get('room.id')) {
          socketManager.requestParticipants();
        }
      }
    });
  }

  /**
   * Restore session from localStorage
   * ## CODE REVIEW FIX: Added session data integrity validation
   */
  async restoreSession() {
    try {
      // FIRST: Check for direct DM or room navigation from mobile
      const currentDM = localStorage.getItem('currentDM');
      const currentRoomCode = localStorage.getItem('currentRoomCode');
      
      if (currentDM) {
        console.log('[App] Opening DM from navigation:', currentDM);
        // Open the DM (socket will connect shortly after)
        // Use setTimeout to let the socket connect first
        setTimeout(() => {
          this.openDM(currentDM);
        }, 500);
        // Clear the flag so it doesn't reopen on refresh
        localStorage.removeItem('currentDM');
        return;
      }
      
      if (currentRoomCode) {
        console.log('[App] Opening room from navigation:', currentRoomCode);
        // Use setTimeout to let the socket connect first
        setTimeout(() => {
          const nickname = state.get('user.nickname');
          if (nickname) {
            socketManager.joinRoom(currentRoomCode, nickname);
          }
        }, 500);
        // Clear the flag
        localStorage.removeItem('currentRoomCode');
        return;
      }
      
      // Try to restore room from previous session
      const savedSession = localStorage.getItem('wave_session');
      if (!savedSession) {
        console.log('[App] No previous room session found');
        return;
      }
      
      try {
        const session = JSON.parse(savedSession);
        
        // Validate session structure
        if (!session || typeof session !== 'object') {
          console.warn('[App] Invalid session format');
          localStorage.removeItem('wave_session');
          return;
        }
        
        // Restore DM conversations list
        if (session.dmConversations && Array.isArray(session.dmConversations)) {
          console.log('[App] Restoring DM conversations:', session.dmConversations.length);
          session.dmConversations.forEach(username => {
            this.dmConversations.add(username);
          });
          this.renderDMList();
        }
        
        // Validate timestamp
        if (!session.timestamp || typeof session.timestamp !== 'number') {
          console.warn('[App] Invalid session timestamp');
          localStorage.removeItem('wave_session');
          return;
        }
        
        // Check if session is recent (within last 24 hours)
        const sessionAge = Date.now() - session.timestamp;
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours
        
        if (sessionAge >= maxAge) {
          console.log('[App] Session expired, clearing...');
          localStorage.removeItem('wave_session');
          return;
        }
        
        // Validate room data
        if (!session.room || !session.room.code) {
          console.log('[App] No valid room in session');
          return;
        }
        
        // Don't restore DM sessions
        if (session.room.isDM) {
          console.log('[App] Skipping DM session restoration');
          return;
        }
        
        console.log('[App] Restoring room from session...');
        const nickname = state.get('user.nickname');
        if (nickname) {
          socketManager.joinRoom(session.room.code, nickname);
        }
      } catch (e) {
        console.warn('[App] Failed to parse session:', e);
        localStorage.removeItem('wave_session');
      }
    } catch (error) {
      console.error('[App] Failed to restore session:', error);
      localStorage.removeItem('wave_session');
    }
  }

  /**
   * Open a DM conversation (called from mobile navigation)
   */
  openDM(username) {
    console.log('[App] Opening DM from navigation:', username);
    this.handleStartChat(null, username);
  }

  /**
   * Save session to localStorage
   */
  saveSession() {
    try {
      const session = {
        user: state.get('user'),
        room: state.get('room'),
        dmConversations: Array.from(this.dmConversations), // Save DM list
        timestamp: Date.now()
      };
      localStorage.setItem('wave_session', JSON.stringify(session));
    } catch (error) {
      console.error('[App] Failed to save session:', error);
    }
  }

  /**
   * Setup UI event handlers
   */
  setupUIHandlers() {
    // Create/Join Room button (+ button near search)
    const createJoinBtn = document.getElementById('createJoinRoomBtn');
    if (createJoinBtn) {
      createJoinBtn.addEventListener('click', () => {
        this.handleCreateJoinRoom();
      });
    }

    // Send message
    ui.elements.sendButton?.addEventListener('click', () => {
      this.handleSendMessage();
    });

    // Message input
    ui.elements.messageInput?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.handleSendMessage();
      }
      if (e.key === 'Escape') {
        this.handleCancelEdit();
      }
    });

    // Typing indicator
    ui.elements.messageInput?.addEventListener('input', () => {
      this.handleTyping();
    });

    // Set UI callbacks
    ui.onEditClick = (messageId, content) => this.handleEditMessage(messageId, content);
    ui.onDeleteClick = (messageId) => this.handleDeleteMessage(messageId);
    ui.onReportClick = (messageId, message) => this.handleReportMessage(messageId, message);

    // Setup all other buttons after DOM is ready
    this.setupChatButtons();

    // Setup sidebar search for users and channels
    this.setupSidebarSearch();
    
    // Setup create/join room modal
    this.setupCreateJoinRoomModal();
  }

  /**
   * Handle create/join room button click
   */
  handleCreateJoinRoom() {
    const modal = document.getElementById('createJoinRoomModal');
    if (!modal) return;
    
    // Show modal
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    requestAnimationFrame(() => {
      modal.style.opacity = '1';
      const modalContent = modal.querySelector('.bg-surface-dark');
      if (modalContent) {
        modalContent.style.transform = 'scale(1)';
        modalContent.style.opacity = '1';
      }
    });
    
    // Focus input
    const input = document.getElementById('roomCodeInput');
    if (input) {
      input.focus();
    }
  }

  /**
   * Setup create/join room modal
   */
  setupCreateJoinRoomModal() {
    const modal = document.getElementById('createJoinRoomModal');
    const closeBtn = document.getElementById('closeCreateJoinModal');
    const submitBtn = document.getElementById('submitRoomBtn');
    const input = document.getElementById('roomCodeInput');
    
    if (!modal || !closeBtn || !submitBtn || !input) return;
    
    let isClosing = false;
    
    const closeModal = () => {
      if (isClosing) return;
      isClosing = true;
      
      modal.style.opacity = '0';
      const modalContent = modal.querySelector('.bg-surface-dark');
      if (modalContent) {
        modalContent.style.transform = 'scale(0.92)';
        modalContent.style.opacity = '0';
      }
      setTimeout(() => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        input.value = '';
        isClosing = false;
      }, 300);
    };
    
    closeBtn.addEventListener('click', closeModal);
    
    // Close on backdrop click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal();
      }
    });
    
    // Submit handler
    submitBtn.addEventListener('click', () => {
      const roomCode = input.value.trim();
      const nickname = state.get('user.nickname');
      
      if (!nickname) {
        alert('Please login first');
        return;
      }
      
      if (roomCode) {
        // Join existing room
        socketManager.joinRoom(roomCode, nickname);
      } else {
        // Create new room
        this.handleCreateNewRoom();
      }
      
      closeModal();
    });
    
    // Enter key to submit
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        submitBtn.click();
      }
    });
  }

  /**
   * Setup sidebar search for users and channels
   */
  setupSidebarSearch() {
    const searchInput = document.getElementById('sidebarSearchInput');
    const searchResults = document.getElementById('sidebarSearchResults');
    let searchTimeout;

    if (!searchInput || !searchResults) return;

    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.trim();

      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }

      if (!query) {
        searchResults.classList.add('hidden');
        return;
      }

      searchTimeout = setTimeout(async () => {
        try {
          const response = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
          
          if (response.ok) {
            const result = await response.json();
            const users = result.data || result;
            this.displaySidebarSearchResults(users, searchResults);
          } else {
            searchResults.innerHTML = '<div class="p-3 text-center text-red-400 text-sm">Search failed</div>';
            searchResults.classList.remove('hidden');
          }
        } catch (error) {
          console.error('[App] Search error:', error);
          searchResults.innerHTML = '<div class="p-3 text-center text-red-400 text-sm">Search error</div>';
          searchResults.classList.remove('hidden');
        }
      }, 300);
    });

    // Hide results when clicking outside
    document.addEventListener('click', (e) => {
      if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
        searchResults.classList.add('hidden');
      }
    });
  }

  /**
   * Display sidebar search results
   */
  displaySidebarSearchResults(users, container) {
    if (!Array.isArray(users)) {
      container.innerHTML = '<div class="p-3 text-center text-red-400 text-sm">Invalid response</div>';
      container.classList.remove('hidden');
      return;
    }
    
    if (users.length === 0) {
      container.innerHTML = '<div class="p-3 text-center text-slate-400 text-sm">No users found</div>';
      container.classList.remove('hidden');
      return;
    }
    
    container.innerHTML = users.map(user => `
      <button class="w-full flex items-center gap-3 p-3 hover:bg-surface-lighter rounded-lg transition-colors" data-user-id="${user.id}" data-username="${user.username || user.nickname}">
        <div class="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
          <span class="material-symbols-outlined text-primary">person</span>
        </div>
        <div class="flex-1 text-left">
          <div class="text-sm font-medium text-white">${user.username || user.nickname}</div>
          <div class="text-xs text-slate-400">${user.status || 'Available'}</div>
        </div>
        <span class="material-symbols-outlined text-primary text-[18px]">chat</span>
      </button>
    `).join('');
    
    // Add click handlers
    container.querySelectorAll('[data-user-id]').forEach(el => {
      el.addEventListener('click', () => {
        const username = el.dataset.username;
        container.classList.add('hidden');
        const searchInput = document.getElementById('sidebarSearchInput');
        if (searchInput) searchInput.value = '';
        this.handleStartChat(null, username);
      });
    });
    
    container.classList.remove('hidden');
  }

  /**
   * Handle new DM button click
   */
  handleNewDMClick() {
    const modal = document.getElementById('newDMModal');
    if (!modal) return;
    
    // Show modal
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    requestAnimationFrame(() => {
      modal.style.opacity = '1';
      const modalContent = modal.querySelector('.bg-surface-dark');
      if (modalContent) {
        modalContent.style.transform = 'scale(1)';
        modalContent.style.opacity = '1';
      }
    });
    
    // Focus search input
    const searchInput = document.getElementById('dmUserSearchInput');
    if (searchInput) {
      searchInput.focus();
    }
  }

  /**
   * Setup new DM modal functionality
   * ## CODE REVIEW FIX: Added flag to prevent multiple simultaneous closes
   */
  setupNewDMModal() {
    const modal = document.getElementById('newDMModal');
    const closeBtn = document.getElementById('closeNewDMModal');
    const searchInput = document.getElementById('dmUserSearchInput');
    const searchResults = document.getElementById('dmSearchResults');
    
    if (!modal || !closeBtn || !searchInput || !searchResults) return;
    
    let searchTimeout;
    let isClosing = false; // Prevent multiple simultaneous closes
    
    // Close modal
    const closeModal = () => {
      if (isClosing) return; // Already closing
      isClosing = true;
      
      modal.style.opacity = '0';
      const modalContent = modal.querySelector('.bg-surface-dark');
      if (modalContent) {
        modalContent.style.transform = 'scale(0.92)';
        modalContent.style.opacity = '0';
      }
      setTimeout(() => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        searchInput.value = '';
        searchResults.innerHTML = '';
        searchResults.classList.add('hidden');
        isClosing = false; // Reset flag
      }, 300);
    };
    
    closeBtn.addEventListener('click', closeModal);
    
    // Close on backdrop click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal();
      }
    });
    
    // Search functionality
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.trim();
      
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
      
      if (!query) {
        searchResults.classList.add('hidden');
        return;
      }
      
      searchTimeout = setTimeout(async () => {
        try {
          const response = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
          
          if (response.ok) {
            const result = await response.json();
            const users = result.data || result;
            this.displayDMSearchResults(users, searchResults, closeModal);
          } else {
            searchResults.innerHTML = '<div class="p-3 text-center text-red-400 text-sm">Search failed</div>';
            searchResults.classList.remove('hidden');
          }
        } catch (error) {
          console.error('[App] User search error:', error);
          searchResults.innerHTML = '<div class="p-3 text-center text-red-400 text-sm">Search error</div>';
          searchResults.classList.remove('hidden');
        }
      }, 300);
    });
  }

  /**
   * Display DM search results in modal
   */
  displayDMSearchResults(users, container, closeModal) {
    if (!Array.isArray(users)) {
      container.innerHTML = '<div class="p-3 text-center text-red-400 text-sm">Invalid response</div>';
      container.classList.remove('hidden');
      return;
    }
    
    if (users.length === 0) {
      container.innerHTML = '<div class="p-3 text-center text-slate-400 text-sm">No users found</div>';
      container.classList.remove('hidden');
      return;
    }
    
    container.innerHTML = users.map(user => `
      <button class="w-full flex items-center gap-3 p-3 hover:bg-surface-lighter rounded-lg transition-colors" data-user-id="${user.id}" data-username="${user.username || user.nickname}">
        <div class="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
          <span class="material-symbols-outlined text-primary">person</span>
        </div>
        <div class="flex-1 text-left">
          <div class="text-sm font-medium text-white">${user.username || user.nickname}</div>
          <div class="text-xs text-slate-400">${user.status || 'Available'}</div>
        </div>
      </button>
    `).join('');
    
    // Add click handlers
    container.querySelectorAll('[data-user-id]').forEach(el => {
      el.addEventListener('click', () => {
        const userId = el.dataset.userId;
        const username = el.dataset.username;
        closeModal();
        this.handleStartChat(userId, username);
      });
    });
    
    container.classList.remove('hidden');
  }

  /**
   * Handle start chat with user - Opens DM chat like a room
   * Click on DM = full chat interface opens
   */
  async handleStartChat(userId, username) {
    try {
      console.log('[App] 💬 Opening DM chat with:', username);

      // Show loading state
      this.showLoadingState('Loading chat...');

      // Clean username (remove @ if present)
      const cleanUsername = username.replace('@', '');
      
      // Save current context messages before switching
      const currentRoom = state.get('room');
      if (currentRoom) {
        const currentMessages = state.get('messages') || [];
        if (currentRoom.isDM) {
          // Save current DM messages
          this.dmMessages.set(currentRoom.dmUsername, [...currentMessages]);
        } else {
          // Save current room messages
          this.roomMessages.set(currentRoom.id, [...currentMessages]);
        }
      }
      
      // Clear messages for UI
      state.clearMessages();
      
      // Set room state as DM (using username as room identifier)
      const dmRoomId = `dm_${cleanUsername}`;
      state.setRoom({
        id: dmRoomId,
        code: null,
        name: cleanUsername,
        isDM: true,
        dmUsername: cleanUsername
      });
      
      // Restore DM messages if we have them cached
      const cachedMessages = this.dmMessages.get(cleanUsername) || [];
      if (cachedMessages.length > 0) {
        console.log('[App] Restoring', cachedMessages.length, 'cached DM messages');
        cachedMessages.forEach(msg => state.addMessage(msg));
      }
      
      // Update UI - show username as room name
      ui.updateRoomName(cleanUsername);
      
      // Update status text in header
      this.updateRoomStatus('Checking status...');
      
      // Check if user is online and update status
      const isOnline = await this.checkUserOnlineStatus(cleanUsername);
      this.updateRoomStatus(isOnline ? 'Online' : 'Offline');
      
      // Hide room code display for DMs
      this.updateRoomCodeDisplay(null);
      
      // Add to DM list in sidebar
      this.addDMToList(cleanUsername);
      
      // Clear unread count for this DM
      this.unreadCounts.delete(cleanUsername);
      
      // Save session
      this.saveSession();
      
      // Request DM history (will add new messages if any)
      socketManager.getDMHistory(cleanUsername);
      
      // Hide loading state
      this.hideLoadingState();
      
      console.log('[App] ✅ DM chat opened with:', cleanUsername);
    } catch (error) {
      console.error('[App] Error opening DM:', error);
      this.hideLoadingState();
      this.handleError({ code: 'DM_OPEN_FAILED', message: 'Failed to open chat' });
    }
  }
  
  /**
   * Show loading state overlay
   */
  showLoadingState(message = 'Loading...') {
    let loader = document.getElementById('appLoader');
    if (!loader) {
      loader = document.createElement('div');
      loader.id = 'appLoader';
      loader.className = 'fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center';
      loader.innerHTML = `
        <div class="bg-surface-dark rounded-xl p-6 flex flex-col items-center gap-4">
          <div class="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
          <span class="text-white text-sm">${message}</span>
        </div>
      `;
      document.body.appendChild(loader);
    }
  }
  
  /**
   * Hide loading state overlay
   */
  hideLoadingState() {
    const loader = document.getElementById('appLoader');
    if (loader) {
      loader.remove();
    }
  }
  
  /**
   * Update room status text in header
   */
  updateRoomStatus(statusText) {
    const statusEl = document.getElementById('roomStatus');
    if (statusEl) {
      statusEl.textContent = statusText;
    }
  }
  
  /**
   * Add DM to sidebar list
   */
  addDMToList(username) {
    const cleanUsername = username.replace('@', '');
    if (!this.dmConversations.has(cleanUsername)) {
      this.dmConversations.add(cleanUsername);
      this.renderDMList();
      this.saveSession();
    }
  }

  /**
   * Handle incoming DM - show in chat like a room message
   */
  handleDMReceived(data) {
    const message = data.message;
    if (!message) {
      console.warn('[App] DM received but no message data');
      return;
    }

    const senderUsername = (message.senderUsername || message.senderNickname || 'Unknown').replace('@', '');
    const currentUsername = (state.get('user.username') || state.get('user.nickname') || '').replace('@', '');
    
    console.log(`[App] 📩 New DM from ${senderUsername}`);
    
    // Ignore messages from ourselves (shouldn't happen, but just in case)
    if (senderUsername.toLowerCase() === currentUsername.toLowerCase()) {
      console.log('[App] Ignoring DM from self');
      return;
    }

    // Don't add AI bot to DM list - it should only respond in existing conversations
    const isAIBot = senderUsername.toLowerCase() === 'wavebot' || 
                    message.senderId === '00000000-0000-0000-0000-000000000001';
    
    if (!isAIBot) {
      // Add sender to DM list (but not the AI bot)
      this.addDMToList(senderUsername);
    }
    
    // Check if we're chatting with this user
    const currentRoom = state.get('room');
    const isInDMWithSender = currentRoom && currentRoom.isDM && 
      currentRoom.name.replace('@', '').toLowerCase() === senderUsername.toLowerCase();

    // For AI bot, check if we're in the DM that this AI message belongs to
    // The AI message includes dmContext which tells us which DM conversation it's part of
    let isAIBotInCurrentDM = false;
    if (isAIBot && currentRoom && currentRoom.isDM) {
      if (message.dmContext) {
        // AI message has context - check if we're in that DM
        const dmContextClean = message.dmContext.replace('@', '').toLowerCase();
        const currentDMClean = currentRoom.dmUsername.replace('@', '').toLowerCase();
        isAIBotInCurrentDM = dmContextClean === currentDMClean;
      } else {
        // No context (sender's own AI response) - show in any DM
        isAIBotInCurrentDM = true;
      }
    }

    if (isInDMWithSender || isAIBotInCurrentDM) {
      // Already chatting with this user, add the message like a room message
      console.log('[App] In chat with sender, adding message');
      
      // Parse content for image/file markers
      let messageType = 'text';
      let imageUrl = null;
      let fileUrl = null;
      let fileName = null;
      let content = message.content;
      
      // Check if it's an image message
      if (content && content.startsWith('[Image:') && content.endsWith(']')) {
        messageType = 'image';
        imageUrl = content.substring(8, content.length - 1).trim();
        content = '';
      }
      // Check if it's a file message
      else if (content && content.startsWith('[File:') && content.endsWith(']')) {
        messageType = 'file';
        const fileInfo = content.substring(7, content.length - 1).trim();
        fileName = fileInfo;
        fileUrl = fileInfo; // Assuming the file name is the URL
        content = '';
      }
      
      state.addMessage({
        id: message.id,
        senderId: message.senderId,
        senderNickname: senderUsername,
        content: content,
        timestamp: message.timestamp || new Date(),
        type: messageType,
        imageUrl: imageUrl,
        fileUrl: fileUrl,
        fileName: fileName
      });
      
      // Mark the message as read immediately since we're viewing it
      console.log('[App] Marking received DM as read:', message.id);
      socketManager.markDMRead(message.id, senderUsername);
      
      // Update cached DM messages
      // For AI bot messages, cache under the current DM partner's username, not "wavebot"
      const allMessages = state.get('messages') || [];
      const cacheKey = isAIBot ? currentRoom.dmUsername : senderUsername;
      this.dmMessages.set(cacheKey, [...allMessages]);
    } else if (!isAIBot) {
      // Show notification - clicking opens the chat (but not for AI bot)
      console.log('[App] Not in chat with sender, showing notification');
      
      // Increment unread count
      const currentCount = this.unreadCounts.get(senderUsername) || 0;
      this.unreadCounts.set(senderUsername, currentCount + 1);
      
      // Update sidebar to show unread badge
      this.renderDMList();
      
      this.playNotificationSound();
      this.showDMNotification(senderUsername, message.content);
    }
  }

  /**
   * Show DM notification toast
   * ## CODE REVIEW FIX: Added limit to prevent notification stacking
   */
  showDMNotification(senderUsername, content) {
    // Limit to 3 notifications max to prevent stacking
    const existingToasts = document.querySelectorAll('.dm-notification-toast');
    if (existingToasts.length >= 3) {
      // Remove oldest toast
      existingToasts[0].remove();
    }
    
    // Escape HTML to prevent XSS
    const escapeHtml = (text) => {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    };
    
    const toast = document.createElement('div');
    toast.className = 'dm-notification-toast fixed bottom-20 right-4 bg-surface-dark border border-primary/30 rounded-xl p-4 shadow-xl z-50 max-w-sm animate-slide-up cursor-pointer hover:border-primary/50 transition-all';
    toast.innerHTML = `
      <div class="flex items-start gap-3">
        <div class="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
          <span class="material-symbols-outlined text-primary">chat</span>
        </div>
        <div class="flex-1 min-w-0">
          <div class="text-sm font-bold text-white">${escapeHtml(senderUsername)}</div>
          <div class="text-xs text-slate-400 truncate">${escapeHtml(content || 'Sent you a message')}</div>
        </div>
        <button class="text-slate-400 hover:text-white transition-colors" onclick="event.stopPropagation(); this.parentElement.parentElement.remove()">
          <span class="material-symbols-outlined text-[18px]">close</span>
        </button>
      </div>
    `;
    
    toast.onclick = (e) => {
      if (e.target.closest('button')) return;
      toast.remove();
      this.handleStartChat(null, senderUsername);
    };
    
    document.body.appendChild(toast);
    
    // Stack notifications vertically if multiple exist
    const allToasts = document.querySelectorAll('.dm-notification-toast');
    allToasts.forEach((t, index) => {
      t.style.bottom = `${20 + (index * 90)}px`;
    });
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      if (toast.parentElement) {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => {
          toast.remove();
          // Reposition remaining toasts
          const remainingToasts = document.querySelectorAll('.dm-notification-toast');
          remainingToasts.forEach((t, index) => {
            t.style.bottom = `${20 + (index * 90)}px`;
          });
        }, 300);
      }
    }, 5000);
  }

  /**
   * Play notification sound
   */
  playNotificationSound() {
    // Check if sound is enabled
    if (!this.preferences.soundEnabled) {
      console.log('[App] Sound notifications disabled');
      return;
    }
    
    try {
      // Try to play a notification sound - use blink.mp3 from flick messenger folder
      const audio = new Audio('/flick messenger/blink.mp3');
      audio.volume = 0.3; // Lower volume for better UX
      audio.play().catch(() => {
        // Ignore errors - browser may block autoplay
        console.log('[App] Could not play notification sound');
      });
    } catch (e) {
      // Ignore
    }
  }
  
  /**
   * Toggle sound notifications
   */
  toggleSound() {
    this.preferences.soundEnabled = !this.preferences.soundEnabled;
    localStorage.setItem('soundEnabled', this.preferences.soundEnabled);
    console.log('[App] Sound notifications:', this.preferences.soundEnabled ? 'enabled' : 'disabled');
    return this.preferences.soundEnabled;
  }

  /**
   * Check if a user is currently online
   * @param {string} username - Username to check
   * @returns {Promise<boolean>} - True if user is online, false otherwise
   */
  async checkUserOnlineStatus(username) {
    try {
      // Try to get userId from username
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(username)}`);
      if (!response.ok) {
        return false;
      }
      
      const result = await response.json();
      const users = result.data || result;
      
      if (!Array.isArray(users) || users.length === 0) {
        return false;
      }
      
      const user = users.find(u => 
        (u.username || u.nickname || '').toLowerCase() === username.toLowerCase()
      );
      
      if (!user || !user.id) {
        return false;
      }
      
      // Check online status via socket
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          resolve(false);
        }, 2000); // 2 second timeout
        
        socketManager.socket.emit('user:status', { userId: user.id });
        
        const handler = (data) => {
          if (data.userId === user.id) {
            clearTimeout(timeout);
            socketManager.socket.off('user:status:response', handler);
            resolve(data.isOnline || false);
          }
        };
        
        socketManager.socket.on('user:status:response', handler);
      });
    } catch (error) {
      console.error('[App] Error checking user online status:', error);
      return false;
    }
  }

  /**
   * Setup chat screen buttons
   * ## CODE REVIEW FIX: Added duplicate prevention flag to avoid multiple event handlers
   */
  setupChatButtons() {
    // Prevent duplicate setup
    if (this.chatButtonsSetup) {
      console.log('[App] Chat buttons already set up, skipping...');
      return;
    }
    this.chatButtonsSetup = true;
    
    console.log('[App] Setting up chat buttons...');
    
    // Setup mobile tab navigation
    this.setupMobileTabNavigation();
    
    // Tab buttons (Chats, Clans, Guests) - OLD, keeping for compatibility
    const tabButtons = document.querySelectorAll('.px-4.mt-2 button:not(.desktop-tab-btn)');
    const tabNames = ['Chats', 'Clans', 'Guests'];
    
    tabButtons.forEach((btn, index) => {
      btn.addEventListener('click', () => {
        // Remove active class from all tabs
        tabButtons.forEach(b => {
          b.className = 'pb-3 border-b-2 border-transparent text-slate-400 hover:text-slate-200 font-medium text-sm transition-colors';
        });
        // Add active class to clicked tab
        btn.className = 'pb-3 border-b-2 border-primary text-primary font-medium text-sm';
        
        // Update active tab in state
        const tabName = tabNames[index];
        state.setState({ ui: { activeTab: tabName } });
        
        // Show/hide content based on tab
        this.handleTabChange(tabName);
      });
    });

    // Set Status link
    const setStatusLink = document.getElementById('setStatusLink');
    if (setStatusLink) {
      setStatusLink.addEventListener('click', () => this.handleSetStatus());
    }

    // Emoji button - find by icon text content
    const allButtons = Array.from(document.querySelectorAll('button'));
    
    // ## CODE REVIEW NOTE: Button cloning is intentional here to remove any stale event listeners
    // Combined with chatButtonsSetup flag, this ensures clean event handler setup
    
    // Attachment button - use ID directly
    const attachmentBtn = document.getElementById('attachmentBtn');
    console.log('[App] Looking for attachment button...', attachmentBtn);
    if (attachmentBtn) {
      console.log('[App] Attachment button found! Adding click listener');
      // Clone to remove any existing listeners
      const newBtn = attachmentBtn.cloneNode(true);
      attachmentBtn.parentNode.replaceChild(newBtn, attachmentBtn);
      
      newBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('[App] ✅ ATTACHMENT BUTTON CLICKED!');
        this.handleAttachmentClick();
      });
      console.log('[App] Attachment button listener added successfully');
    } else {
      console.error('[App] ❌ Attachment button NOT found!');
    }

    // Emoji button (sentiment_satisfied icon)
    const emojiBtn = document.getElementById('emojiBtn');
    console.log('[App] Looking for emoji button...', emojiBtn);
    if (emojiBtn) {
      console.log('[App] Emoji button found! Adding click listener');
      const newEmojiBtn = emojiBtn.cloneNode(true);
      emojiBtn.parentNode.replaceChild(newEmojiBtn, emojiBtn);
      
      newEmojiBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('[App] ✅ EMOJI BUTTON CLICKED!');
        this.handleEmojiClick();
      });
    } else {
      console.error('[App] ❌ Emoji button NOT found!');
    }
    
    // Poll button
    const pollBtn = document.getElementById('pollBtn');
    console.log('[App] Looking for poll button...', pollBtn);
    if (pollBtn) {
      console.log('[App] Poll button found! Adding click listener');
      const newPollBtn = pollBtn.cloneNode(true);
      pollBtn.parentNode.replaceChild(newPollBtn, pollBtn);
      
      newPollBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('[App] ✅ POLL BUTTON CLICKED!');
        this.handlePollClick();
      });
    } else {
      console.error('[App] ❌ Poll button NOT found!');
    }

    // Voice/Mic button
    const micBtn = document.getElementById('voiceBtn');
    console.log('[App] Looking for voice button...', micBtn);
    if (micBtn) {
      console.log('[App] Voice button found! Adding click listener');
      const newMicBtn = micBtn.cloneNode(true);
      micBtn.parentNode.replaceChild(newMicBtn, micBtn);
      
      newMicBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('[App] ✅ VOICE BUTTON CLICKED!');
        this.handleVoiceClick();
      });
    } else {
      console.error('[App] ❌ Voice button NOT found!');
    }

    // Mute button (right panel)
    const muteBtn = allButtons.find(btn => btn.textContent.includes('Mute'));
    if (muteBtn) {
      muteBtn.addEventListener('click', () => this.handleMuteClick());
    }

    // Add friend button (right panel)
    const addBtn = allButtons.find(btn => btn.textContent.includes('Add'));
    if (addBtn) {
      addBtn.addEventListener('click', () => this.handleAddFriendClick());
    }
    
    // Music button (top bar)
    const musicBtn = document.getElementById('musicBtn');
    if (musicBtn) {
      musicBtn.addEventListener('click', () => {
        alert('Music feature coming soon! 🎵\n\nShare and discover music with your friends.');
      });
    }
    
    // AI button (top bar)
    const aiBtn = document.getElementById('aiBtn');
    if (aiBtn) {
      aiBtn.addEventListener('click', () => {
        window.location.href = '/ai-chat.html';
      });
    }

    // Settings button - logout option
    const settingsBtn = allButtons.find(btn => {
      const icon = btn.querySelector('.material-symbols-outlined');
      return icon && icon.textContent.trim() === 'settings';
    });
    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => {
        this.handleSettingsClick();
      });
    }
    
    // Regenerate room code button
    const regenerateCodeBtn = document.getElementById('regenerateCodeBtn');
    if (regenerateCodeBtn) {
      regenerateCodeBtn.addEventListener('click', () => this.handleRegenerateRoomCode());
    }
    
    // Create new room buttons
    const createNewRoomBtn = document.getElementById('createNewRoomBtn');
    if (createNewRoomBtn) {
      createNewRoomBtn.addEventListener('click', () => this.handleCreateNewRoom());
    }
    
    const quickCreateRoomBtn = document.getElementById('quickCreateRoomBtn');
    if (quickCreateRoomBtn) {
      quickCreateRoomBtn.addEventListener('click', () => this.handleCreateNewRoom());
    }
    
    // Copy room code button
    const copyRoomCodeBtn = document.getElementById('copyRoomCodeBtn');
    if (copyRoomCodeBtn) {
      copyRoomCodeBtn.addEventListener('click', () => this.handleCopyRoomCode());
    }
    
    // Scroll to bottom button
    const scrollToBottomBtn = document.getElementById('scrollToBottomBtn');
    if (scrollToBottomBtn) {
      scrollToBottomBtn.addEventListener('click', () => {
        ui.scrollToBottom(true);
      });
    }
    
    // Setup scroll listener for scroll button visibility
    const messagesFeed = document.getElementById('messagesFeed');
    if (messagesFeed) {
      messagesFeed.addEventListener('scroll', () => {
        ui.updateScrollButton();
      });
    }
  }

  /**
   * Handle settings click
   * ## CODE REVIEW FIX: Added null checks for DOM elements and close flag
   */
  handleSettingsClick() {
    const modal = document.getElementById('settingsModal');
    if (!modal) return;
    
    // Update profile info with null checks
    const nickname = state.get('user.nickname');
    const username = state.get('user.username');
    
    const nicknameEl = document.getElementById('settingsNickname');
    if (nicknameEl) {
      nicknameEl.textContent = nickname || 'User';
    }
    
    const usernameEl = document.getElementById('settingsUsername');
    if (usernameEl) {
      usernameEl.textContent = username ? `@${username}` : '@user';
    }
    
    // Show modal with animation
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    // Trigger animation
    requestAnimationFrame(() => {
      modal.style.opacity = '1';
      const modalContent = modal.querySelector('.bg-surface-dark');
      if (modalContent) {
        modalContent.style.transform = 'scale(1)';
        modalContent.style.opacity = '1';
      }
    });
    
    // Setup modal handlers with null checks and close flag
    let isClosing = false;
    
    const closeModal = () => {
      if (isClosing) return; // Already closing
      isClosing = true;
      
      const modalContent = modal.querySelector('.bg-surface-dark');
      if (modalContent) {
        modalContent.style.transform = 'scale(0.92)';
        modalContent.style.opacity = '0';
      }
      modal.style.opacity = '0';
      setTimeout(() => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        isClosing = false; // Reset flag
      }, 400);
    };
    
    const closeBtn = document.getElementById('closeSettingsModal');
    if (closeBtn) {
      closeBtn.onclick = closeModal;
    }
    
    const clearChatBtn = document.getElementById('clearChatBtn');
    if (clearChatBtn) {
      clearChatBtn.onclick = () => {
        if (confirm('Clear all messages in this room? This cannot be undone.')) {
          socketManager.clearChatAll();
          closeModal();
        }
      };
    }
    
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.onclick = () => {
        if (confirm('Are you sure you want to logout?')) {
          this.logout();
        }
      };
    }
  }

  /**
   * Setup mobile tab navigation
   */
  setupMobileTabNavigation() {
    // Only handle the "chats" tab button since others are now navigation links
    const chatsTabButton = document.querySelector('.mobile-tab-btn[data-tab="chats"]');
    const chatScreen = document.getElementById('chatScreen');
    
    // Remove old mobile tab content containers (no longer needed)
    const musicContent = document.getElementById('musicTabContent');
    const waveContent = document.getElementById('waveTabContent');
    const aiContent = document.getElementById('aiTabContent');
    const profileContent = document.getElementById('profileTabContent');
    
    // Clean up old content containers
    [musicContent, waveContent, aiContent, profileContent].forEach(el => {
      if (el) el.remove();
    });
    
    // Chats tab is always active on this page
    if (chatsTabButton) {
      chatsTabButton.className = 'mobile-tab-btn flex flex-col items-center gap-1 w-12 text-primary transition-colors';
      const div = chatsTabButton.querySelector('div');
      if (div) div.classList.add('bg-primary/10');
      const span = chatsTabButton.querySelector('span:last-child');
      if (span) span.classList.add('font-semibold');
    }
    
    // Detect device type and show appropriate navigation
    const detectDevice = () => {
      const isMobile = window.innerWidth < 768;
      const mobileNav = document.getElementById('mobileBottomNav');
      
      if (isMobile) {
        mobileNav?.classList.remove('hidden');
      } else {
        mobileNav?.classList.add('hidden');
        // Ensure chat screen is visible on desktop
        if (chatScreen) {
          chatScreen.style.display = 'flex';
          chatScreen.style.opacity = '1';
        }
      }
    };
    
    // Initial detection
    detectDevice();
    
    // Re-detect on resize
    window.addEventListener('resize', detectDevice);
  }

  /**
   * Handle tab change
   */
  handleTabChange(tabName) {
    if (tabName === 'Chats') {
      // Show current room messages
      ui.showMessages();
      
      // Update rooms list to show current room
      const room = state.get('room');
      if (room && room.id) {
        ui.updateRoomsList([room]);
      }
    } else {
      // Hide messages and show empty state for Clans/Guests
      ui.hideMessages();
      ui.showEmptyState(tabName);
      
      // Clear rooms list for other tabs
      const roomsList = document.getElementById('roomsList');
      if (roomsList) {
        roomsList.innerHTML = `
          <div class="p-4 text-center text-slate-400 text-sm">
            No ${tabName.toLowerCase()} available
          </div>
        `;
      }
    }
  }

  /**
   * Handle set status
   */
  handleSetStatus() {
    const currentStatus = state.get('user.status') || 'Available';
    const statuses = ['Available', 'Busy', 'Away', 'Do Not Disturb', 'Invisible'];
    
    const statusOptions = statuses.map((s, i) => `${i + 1}. ${s}`).join('\n');
    const choice = prompt(`Select your status:\n${statusOptions}\n\nCurrent: ${currentStatus}\n\nEnter number (1-5):`);
    
    if (choice) {
      const index = parseInt(choice) - 1;
      if (index >= 0 && index < statuses.length) {
        const newStatus = statuses[index];
        
        // Update local state
        state.setState({ user: { status: newStatus } });
        
        // Update UI
        const statusLink = document.getElementById('setStatusLink');
        if (statusLink) {
          statusLink.textContent = newStatus;
        }
        
        // Send to server if connected
        const userId = state.get('user.id');
        if (userId) {
          fetch(`/api/users/${userId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
          }).catch(err => console.error('[App] Failed to update status:', err));
        }
        
        console.log('[App] Status updated to:', newStatus);
      }
    }
  }

  /**
   * Handle emoji picker
   */
  handleEmojiClick() {
    console.log('[App] handleEmojiClick called!');
    
    const emojis = ['😀', '😂', '❤️', '👍', '🎉', '🔥', '✨', '💯', '🚀', '👋', '😍', '🤔', '😎', '🙌', '💪'];
    
    // Show emoji picker popup
    const picker = document.getElementById('reactionPicker');
    console.log('[App] Emoji picker element:', picker);
    
    if (!picker) {
      console.warn('[App] Emoji picker not found, using fallback');
      // Fallback: just add a random emoji
      const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
      const currentInput = ui.getMessageInput();
      ui.setMessageInput(currentInput + randomEmoji);
      ui.focusMessageInput();
      return;
    }
    
    // Position picker near emoji button
    const emojiBtn = document.getElementById('emojiBtn');
    if (emojiBtn) {
      const rect = emojiBtn.getBoundingClientRect();
      console.log('[App] Positioning emoji picker near button:', rect);
      picker.style.left = `${rect.left}px`;
      picker.style.bottom = `${window.innerHeight - rect.top + 10}px`;
    }
    
    // Show picker with animation
    console.log('[App] Showing emoji picker');
    picker.classList.remove('hidden');
    // Trigger animation
    requestAnimationFrame(() => {
      picker.style.opacity = '1';
      picker.style.transform = 'scale(1) translateY(0)';
    });
    
    // Add click handlers to emoji buttons
    const emojiButtons = picker.querySelectorAll('.reaction-btn');
    console.log('[App] Found emoji buttons:', emojiButtons.length);
    emojiButtons.forEach(btn => {
      btn.onclick = () => {
        const emoji = btn.textContent;
        console.log('[App] Emoji selected:', emoji);
        const currentInput = ui.getMessageInput();
        ui.setMessageInput(currentInput + emoji);
        ui.focusMessageInput();
        // Hide with animation
        picker.style.opacity = '0';
        picker.style.transform = 'scale(0.9) translateY(8px)';
        setTimeout(() => picker.classList.add('hidden'), 350);
      };
    });
    
    // Close picker when clicking outside
    setTimeout(() => {
      document.addEventListener('click', function closeEmojiPicker(e) {
        if (!picker.contains(e.target) && e.target !== emojiBtn) {
          console.log('[App] Closing emoji picker (clicked outside)');
          picker.style.opacity = '0';
          picker.style.transform = 'scale(0.9) translateY(8px)';
          setTimeout(() => picker.classList.add('hidden'), 350);
          document.removeEventListener('click', closeEmojiPicker);
        }
      });
    }, 100);
  }
  
  /**
   * Handle poll creation
   */
  handlePollClick() {
    console.log('[App] handlePollClick called!');
    
    const modal = document.getElementById('pollModal');
    console.log('[App] Poll modal element:', modal);
    
    if (!modal) {
      alert('Poll feature coming soon!');
      return;
    }
    
    // Show modal with animation
    console.log('[App] Showing poll modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    // Trigger animation
    requestAnimationFrame(() => {
      modal.style.opacity = '1';
      const modalContent = modal.querySelector('.bg-surface-dark');
      if (modalContent) {
        modalContent.style.transform = 'scale(1)';
        modalContent.style.opacity = '1';
      }
    });
    
    // Clear previous inputs
    document.getElementById('pollQuestion').value = '';
    const optionsContainer = document.getElementById('pollOptions');
    optionsContainer.innerHTML = `
      <input type="text" placeholder="Option 1" class="poll-option w-full px-4 py-2 bg-surface-lighter border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary"/>
      <input type="text" placeholder="Option 2" class="poll-option w-full px-4 py-2 bg-surface-lighter border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary"/>
    `;
    
    // Remove old event handlers by cloning buttons
    const closePollModal = document.getElementById('closePollModal');
    const newCloseBtn = closePollModal.cloneNode(true);
    closePollModal.parentNode.replaceChild(newCloseBtn, closePollModal);
    
    const cancelPoll = document.getElementById('cancelPoll');
    const newCancelBtn = cancelPoll.cloneNode(true);
    cancelPoll.parentNode.replaceChild(newCancelBtn, cancelPoll);
    
    const addPollOption = document.getElementById('addPollOption');
    const newAddBtn = addPollOption.cloneNode(true);
    addPollOption.parentNode.replaceChild(newAddBtn, addPollOption);
    
    const createPoll = document.getElementById('createPoll');
    const newCreateBtn = createPoll.cloneNode(true);
    createPoll.parentNode.replaceChild(newCreateBtn, createPoll);
    
    // Close modal handlers with animation
    const closeModal = () => {
      const modalContent = modal.querySelector('.bg-surface-dark');
      if (modalContent) {
        modalContent.style.transform = 'scale(0.92)';
        modalContent.style.opacity = '0';
      }
      modal.style.opacity = '0';
      setTimeout(() => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
      }, 400);
    };
    
    newCloseBtn.onclick = () => {
      console.log('[App] Closing poll modal (X button)');
      closeModal();
    };
    
    newCancelBtn.onclick = () => {
      console.log('[App] Closing poll modal (Cancel button)');
      closeModal();
    };
    
    // Add option handler
    newAddBtn.onclick = () => {
      const optionCount = optionsContainer.querySelectorAll('.poll-option').length + 1;
      console.log('[App] Adding poll option', optionCount);
      const newOption = document.createElement('input');
      newOption.type = 'text';
      newOption.placeholder = `Option ${optionCount}`;
      newOption.className = 'poll-option w-full px-4 py-2 bg-surface-lighter border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary';
      optionsContainer.appendChild(newOption);
    };
    
    // Create poll handler
    newCreateBtn.onclick = () => {
      const question = document.getElementById('pollQuestion').value.trim();
      const options = Array.from(document.querySelectorAll('.poll-option'))
        .map(input => input.value ? input.value.trim() : '')
        .filter(opt => opt.length > 0);
      
      console.log('[App] Creating poll:', { question, options });
      
      if (!question) {
        alert('Please enter a question');
        return;
      }
      
      if (options.length < 2) {
        alert('Please add at least 2 options');
        return;
      }
      
      // Send poll via socket
      console.log('[App] Sending poll to server');
      socketManager.sendPoll(question, options, false);
      
      // Close modal with animation
      closeModal();
    };
  }

  /**
   * Handle file attachment
   */
  async handleAttachmentClick() {
    console.log('[App] handleAttachmentClick called!');
    
    // Show attachment menu
    const menu = document.getElementById('attachmentMenu');
    console.log('[App] Attachment menu element:', menu);
    
    if (!menu) {
      console.warn('[App] Attachment menu not found, opening file picker directly');
      // Fallback to direct file picker
      this.openFilePicker();
      return;
    }
    
    // Position menu near attachment button
    const attachmentBtn = document.getElementById('attachmentBtn');
    console.log('[App] Positioning menu near button:', attachmentBtn);
    
    if (attachmentBtn) {
      const rect = attachmentBtn.getBoundingClientRect();
      console.log('[App] Button rect:', rect);
      menu.style.left = `${rect.left}px`;
      menu.style.bottom = `${window.innerHeight - rect.top + 10}px`;
    }
    
    // Show menu with animation
    console.log('[App] Showing attachment menu');
    menu.classList.remove('hidden');
    // Trigger animation
    requestAnimationFrame(() => {
      menu.style.opacity = '1';
      menu.style.transform = 'scale(1) translateY(0)';
    });
    
    // Setup menu item handlers with null checks
    // ## CODE REVIEW FIX: Added null checks for all menu items
    const attachImage = document.getElementById('attachImage');
    if (attachImage) {
      attachImage.onclick = () => {
        console.log('[App] Image selected');
        menu.style.opacity = '0';
        menu.style.transform = 'scale(0.9) translateY(8px)';
        setTimeout(() => menu.classList.add('hidden'), 350);
        this.openFilePicker('image/*');
      };
    }
    
    const attachFile = document.getElementById('attachFile');
    if (attachFile) {
      attachFile.onclick = () => {
        console.log('[App] File selected');
        menu.style.opacity = '0';
        menu.style.transform = 'scale(0.9) translateY(8px)';
        setTimeout(() => menu.classList.add('hidden'), 350);
        this.openFilePicker('.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar,.7z');
      };
    }
    
    const attachSticker = document.getElementById('attachSticker');
    if (attachSticker) {
      attachSticker.onclick = () => {
        console.log('[App] Sticker selected');
        menu.style.opacity = '0';
        menu.style.transform = 'scale(0.9) translateY(8px)';
        setTimeout(() => menu.classList.add('hidden'), 350);
        alert('Sticker feature coming soon! 🎨');
      };
    }
    
    const attachAudio = document.getElementById('attachAudio');
    if (attachAudio) {
      attachAudio.onclick = () => {
        console.log('[App] Audio selected');
        menu.style.opacity = '0';
        menu.style.transform = 'scale(0.9) translateY(8px)';
        setTimeout(() => menu.classList.add('hidden'), 350);
        this.openFilePicker('audio/*,.mp3');
      };
    }
    
    const startVoiceCall = document.getElementById('startVoiceCall');
    if (startVoiceCall) {
      startVoiceCall.onclick = () => {
        console.log('[App] Voice call selected');
        menu.style.opacity = '0';
        menu.style.transform = 'scale(0.9) translateY(8px)';
        setTimeout(() => menu.classList.add('hidden'), 350);
        alert('Voice call feature coming soon! 📞');
      };
    }
    
    // Close menu when clicking outside
    setTimeout(() => {
      document.addEventListener('click', function closeAttachmentMenu(e) {
        if (!menu.contains(e.target) && !e.target.closest('button[id="attachmentBtn"]')) {
          console.log('[App] Closing attachment menu (clicked outside)');
          menu.style.opacity = '0';
          menu.style.transform = 'scale(0.9) translateY(8px)';
          setTimeout(() => menu.classList.add('hidden'), 350);
          document.removeEventListener('click', closeAttachmentMenu);
        }
      });
    }, 100);
  }
  
  /**
   * Open file picker with specific accept types
   * ## CODE REVIEW FIX: Added file size validation (10MB limit) and better error handling
   */
  async openFilePicker(acceptTypes = 'image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar,.7z,.gif,.mp3,.wav,.ogg,audio/*') {
    // Check if user is in a room or DM
    const currentRoom = state.get('room');
    const roomId = currentRoom?.id;
    
    if (!roomId) {
      alert('Please join a room or start a DM first before uploading files');
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = acceptTypes;
    
    input.onchange = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Validate file size (10MB limit)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        alert(`File too large. Maximum size is 10MB. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB`);
        return;
      }

      try {
        // Show uploading message
        const uploadingMsg = {
          id: `uploading_${Date.now()}`,
          type: 'system',
          content: `Uploading ${file.name}...`,
          timestamp: new Date()
        };
        state.addMessage(uploadingMsg);

        // Determine if it's an image or file
        const isImage = file.type.startsWith('image/');
        const fieldName = isImage ? 'image' : 'file';
        const endpoint = isImage ? 'image' : 'file';

        // Upload file using backend API
        const formData = new FormData();
        formData.append(fieldName, file);
        formData.append('senderId', state.get('user.id') || 'anonymous');
        formData.append('senderNickname', state.get('user.nickname') || 'Anonymous');

        console.log('[App] Uploading file:', file.name, 'to', `/api/rooms/${roomId}/${endpoint}`);

        const response = await fetch(`/api/rooms/${roomId}/${endpoint}`, {
          method: 'POST',
          body: formData
        });

        // Remove uploading message
        state.removeMessage(uploadingMsg.id);

        if (response.ok) {
          const data = await response.json();
          console.log('[App] File uploaded successfully:', data);
          
          // Validate response data
          if (!data || !data.data) {
            throw new Error('Invalid response from server');
          }
          
          // Create and add the message to UI
          const message = {
            id: data.data.id,
            roomId: roomId,
            senderId: state.get('user.id'),
            senderNickname: state.get('user.nickname'),
            content: '',
            type: isImage ? 'image' : 'file',
            timestamp: data.data.timestamp || new Date(),
            imageUrl: data.data.imageUrl,
            fileUrl: data.data.fileUrl,
            fileName: data.data.fileName,
            fileSize: data.data.fileSize
          };
          
          console.log('[App] 📸 Adding image/file message to UI:', {
            type: message.type,
            imageUrl: message.imageUrl,
            fileUrl: message.fileUrl,
            fileName: message.fileName
          });
          
          // Add message to state (which will trigger UI update)
          state.addMessage(message);
          
          console.log('[App] ✅ Message added to state');
          
          // If in DM mode, send the image/file to the other user via socket
          const currentRoom = state.get('room');
          if (currentRoom && currentRoom.isDM) {
            const toUsername = currentRoom.dmUsername || currentRoom.name;
            console.log('[App] Sending image/file via DM to:', toUsername);
            
            // Send image/file info as a DM with marker format
            // The recipient will parse this and display the image/file properly
            const dmContent = isImage 
              ? `[Image: ${data.data.imageUrl}]`
              : `[File: ${data.data.fileUrl || data.data.fileName}]`;
            
            console.log('[App] 📤 Sending DM marker:', dmContent);
            
            // Send via socket - this will only go to the recipient, not back to us
            socketManager.send('send:dm', { toUsername, content: dmContent });
          }
          
          console.log('[App] ✅ File upload complete');
        } else {
          const error = await response.json();
          throw new Error(error.error?.message || 'Upload failed');
        }
      } catch (error) {
        console.error('[App] File upload error:', error);
        alert(`File upload failed: ${error.message}`);
        
        // Remove uploading message if it still exists
        const uploadingMsg = state.get('messages')?.find(m => m.id.startsWith('uploading_'));
        if (uploadingMsg) {
          state.removeMessage(uploadingMsg.id);
        }
      }
    };
    
    // Trigger file picker
    input.click();
  }

  /**
   * Handle voice message
   */
  handleVoiceClick() {
    alert('Voice message recording will be implemented with WebRTC integration.');
  }

  /**
   * Handle mute room
   */
  handleMuteClick() {
    const isMuted = state.get('room.isMuted') || false;
    state.setState({ room: { isMuted: !isMuted } });
    alert(isMuted ? 'Room unmuted' : 'Room muted');
  }

  /**
   * Handle add friend - Send room invite
   */
  async handleAddFriendClick() {
    const username = prompt('Enter username to invite:');
    if (!username || !username.trim()) return;
    
    const roomId = state.get('room.id');
    const roomCode = state.get('room.code');
    
    console.log('[App] 📤 SENDING INVITE');
    console.log('[App]   From:', state.get('user.username'), '(', state.get('user.nickname'), ')');
    console.log('[App]   To:', username.trim());
    console.log('[App]   Room ID:', roomId);
    console.log('[App]   Room Code:', roomCode);
    
    if (!roomId || !roomCode) {
      alert('You need to be in a room to invite users.');
      return;
    }
    
    try {
      // Search for user first
      console.log('[App] 🔍 Searching for user:', username.trim());
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(username.trim())}`);
      
      if (response.ok) {
        const result = await response.json();
        const users = result.data || result;
        
        console.log('[App] 📋 Search results:', users);
        
        if (!Array.isArray(users) || users.length === 0) {
          console.log('[App] ❌ User not found');
          alert(`User "${username}" not found.`);
          return;
        }
        
        const user = users[0];
        console.log('[App] ✅ User found:', user);
        console.log('[App]   Username:', user.username);
        console.log('[App]   Nickname:', user.nickname);
        console.log('[App]   ID:', user.id);
        
        // Send invite via socket for real-time delivery
        console.log('[App] 📨 Sending invite via socket...');
        socketManager.sendInvite(user.username, roomId, roomCode);
        
        // Show success message
        alert(`Invite sent to ${user.username}!\n\nThey will receive a notification to join your room.`);
        console.log('[App] ✅ Invite sent successfully');
      } else {
        console.log('[App] ❌ Search failed:', response.status);
        alert('Failed to search for user.');
      }
    } catch (error) {
      console.error('[App] ❌ Add friend error:', error);
      alert('Failed to send invite.');
    }
  }

  /**
   * Handle regenerate room code
   */
  async handleRegenerateRoomCode() {
    const roomId = state.get('room.id');
    if (!roomId) {
      alert('You need to be in a room first.');
      return;
    }
    
    if (!confirm('Regenerate room code?\n\nThe old code will no longer work. All members will need the new code to rejoin.')) {
      return;
    }
    
    try {
      // Call backend API to regenerate code
      const response = await fetch(`/api/rooms/${roomId}/regenerate-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        const newCode = result.data.code;
        
        // Update state
        state.setState({
          room: {
            ...state.get('room'),
            code: newCode
          }
        });
        
        // Update UI
        this.updateRoomCodeDisplay(newCode);
        
        // Show success message
        alert(`Room code regenerated!\n\nNew Code: ${newCode}\n\nShare this with members to invite them.`);
        
        // Add system message
        state.addMessage({
          id: `system_${Date.now()}`,
          type: 'system',
          content: `Room code regenerated: ${newCode}`,
          timestamp: new Date()
        });
      } else {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to regenerate code');
      }
    } catch (error) {
      console.error('[App] Regenerate code error:', error);
      alert(`Failed to regenerate room code: ${error.message}`);
    }
  }

  /**
   * Handle copy room code
   */
  async handleCopyRoomCode() {
    const roomCode = state.get('room.code');
    if (!roomCode) {
      alert('No room code available.');
      return;
    }
    
    try {
      await navigator.clipboard.writeText(roomCode);
      
      // Show success feedback
      const copyBtn = document.getElementById('copyRoomCodeBtn');
      if (copyBtn) {
        const originalHTML = copyBtn.innerHTML;
        copyBtn.innerHTML = '<span class="material-symbols-outlined text-[14px]">check</span> Copied!';
        setTimeout(() => {
          copyBtn.innerHTML = originalHTML;
        }, 2000);
      }
    } catch (error) {
      console.error('[App] Copy error:', error);
      // Fallback: show code in alert
      alert(`Room Code: ${roomCode}\n\nCopy this code to share with others.`);
    }
  }

  /**
   * Handle create new room
   */
  async handleCreateNewRoom() {
    try {
      console.log('[App] Creating new room...');

      // Show loading state
      const createBtn = document.getElementById('createNewRoomBtn') || document.getElementById('quickCreateRoomBtn');
      const originalHTML = createBtn ? createBtn.innerHTML : '';
      if (createBtn) {
        createBtn.disabled = true;
        createBtn.innerHTML = '<span class="material-symbols-outlined text-[18px] animate-spin">hourglass_empty</span> Creating...';
      }

      // Leave current room if in one
      const currentRoom = state.get('room');
      if (currentRoom && currentRoom.id) {
        console.log('[App] Leaving current room before creating new one');
        socketManager.leaveRoom();
        await new Promise((resolve) => setTimeout(resolve, 300));
      }

      // Create room via API
      const response = await api.createRoom(10);
      console.log('[App] Room created:', response);

      const roomCode = response.data.code;
      const roomId = response.data.id;
      console.log('[App] Room code:', roomCode);

      // Ensure socket is connected before joining
      if (!socketManager.socket || !socketManager.socket.connected) {
        console.log('[App] Socket not connected, connecting...');
        socketManager.connect();
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      // Join room via socket
      const nickname = state.get('user.nickname');
      console.log('[App] Joining room:', roomCode);
      socketManager.joinRoom(roomCode, nickname);

      // Show success message
      const message = `Room created!\n\nRoom Code: ${roomCode}\n\nShare this code with others to invite them.`;
      
      // Try to copy to clipboard
      try {
        await navigator.clipboard.writeText(roomCode);
        alert(message + '\n\n✓ Code copied to clipboard!');
      } catch (e) {
        alert(message);
      }

      // Restore button state
      if (createBtn) {
        createBtn.disabled = false;
        createBtn.innerHTML = originalHTML;
      }
    } catch (error) {
      console.error('[App] Create room error:', error);

      // Restore button state
      const createBtn = document.getElementById('createNewRoomBtn') || document.getElementById('quickCreateRoomBtn');
      if (createBtn) {
        createBtn.disabled = false;
        const isQuickBtn = createBtn.id === 'quickCreateRoomBtn';
        createBtn.innerHTML = isQuickBtn 
          ? 'Create Room'
          : '<span class="material-symbols-outlined text-[18px]">add_circle</span> Create New Room';
      }

      // Show error message
      const errorMsg =
        error.code === 'NETWORK_ERROR'
          ? 'Cannot connect to server. Make sure the server is running.'
          : error.message || 'Failed to create room';
      alert('Error: ' + errorMsg);
    }
  }

  /**
   * Update room UI state (show/hide buttons based on room status)
   * ## CODE REVIEW FIX: Already has proper null checks with optional chaining (?.)
   */
  updateRoomUIState(hasRoom) {
    // Room action buttons
    const createNewRoomBtn = document.getElementById('createNewRoomBtn');
    const regenerateCodeBtn = document.getElementById('regenerateCodeBtn');
    
    if (hasRoom) {
      createNewRoomBtn?.classList.add('hidden');
      regenerateCodeBtn?.classList.remove('hidden');
    } else {
      createNewRoomBtn?.classList.remove('hidden');
      regenerateCodeBtn?.classList.add('hidden');
    }
    
    // Room info display
    const noRoomState = document.getElementById('noRoomState');
    const roomCodeContainer = document.getElementById('roomCodeContainer');
    
    if (hasRoom) {
      noRoomState?.classList.add('hidden');
      roomCodeContainer?.classList.remove('hidden');
    } else {
      noRoomState?.classList.remove('hidden');
      roomCodeContainer?.classList.add('hidden');
    }
  }

  /**
   * Handle join another room
   */
  handleJoinAnotherRoom() {
    const roomCode = prompt('Enter room code to join:');
    if (roomCode && roomCode.trim()) {
      const nickname = state.get('user.nickname');
      if (nickname) {
        // Leave current room if in one
        const currentRoom = state.get('room');
        if (currentRoom && currentRoom.id) {
          console.log('[App] Leaving current room before joining new one');
          socketManager.leaveRoom();
        }
        
        // Clear current messages
        state.clearMessages();
        
        // Join new room
        socketManager.joinRoom(roomCode.trim(), nickname);
      } else {
        alert('Session error. Please refresh the page.');
      }
    }
  }

  /**
   * Setup socket event handlers
   * ## CODE REVIEW FIX: Added duplicate prevention flag
   */
  setupSocketHandlers() {
    // Prevent duplicate setup
    if (this.socketHandlersSetup) {
      console.log('[App] Socket handlers already set up, skipping...');
      return;
    }
    this.socketHandlersSetup = true;
    
    console.log('[App] Setting up socket handlers...');
    
    // Connection events
    socketManager.on('connection:established', () => {
      console.log('[App] Connected to server');
      state.setConnectionStatus('connected');
      
      // Register username immediately after connection for DMs and invites
      const username = state.get('user.username');
      const nickname = state.get('user.nickname');
      const userId = state.get('user.id');
      
      if (username && nickname) {
        console.log('[App] 🔐 Registering username with socket:', username);
        socketManager.registerUsername(username, nickname);
      }
      
      // Register user online status
      if (userId) {
        console.log('[App] 📡 Registering user online status:', userId);
        socketManager.socket.emit('user:setup', { userId });
      }
    });

    socketManager.on('connection:lost', () => {
      console.log('[App] Connection lost');
      state.setConnectionStatus('disconnected');
    });

    socketManager.on('connection:reconnected', () => {
      console.log('[App] Reconnected to server');
      state.setConnectionStatus('connected');
      
      // Re-register username after reconnection
      const username = state.get('user.username');
      const nickname = state.get('user.nickname');
      const userId = state.get('user.id');
      
      if (username && nickname) {
        console.log('[App] 🔐 Re-registering username with socket:', username);
        socketManager.registerUsername(username, nickname);
      }
      
      // Re-register user online status
      if (userId) {
        console.log('[App] 📡 Re-registering user online status:', userId);
        socketManager.socket.emit('user:setup', { userId });
      }
    });

    // User online/offline events
    socketManager.socket.on('user:online', (data) => {
      console.log('[App] 🟢 User came online:', data.userId);
      // Update UI if we're in a DM with this user
      const currentRoom = state.get('room');
      if (currentRoom && currentRoom.isDM) {
        // Refresh the DM list to update status
        this.renderDMList();
      }
    });
    
    socketManager.socket.on('user:offline', (data) => {
      console.log('[App] 🔴 User went offline:', data.userId);
      // Update UI if we're in a DM with this user
      const currentRoom = state.get('room');
      if (currentRoom && currentRoom.isDM) {
        // Refresh the DM list to update status
        this.renderDMList();
      }
    });

    // Room events
    socketManager.on('room:joined', (data) => {
      this.handleRoomJoined(data);
    });
    
    // Track previous participants for comparison
    let previousParticipants = [];
    
    // Room participants update
    socketManager.on('room:participants', (participants) => {
      const currentList = Array.isArray(participants) ? participants : [];
      const prevList = previousParticipants;
      
      // Find who joined (in current but not in previous)
      const prevNicknames = new Set(prevList.map(p => p.nickname?.toLowerCase()));
      const currentNicknames = new Set(currentList.map(p => p.nickname?.toLowerCase()));
      
      const joined = currentList.filter(p => !prevNicknames.has(p.nickname?.toLowerCase()));
      const left = prevList.filter(p => !currentNicknames.has(p.nickname?.toLowerCase()));
      
      // Log member status changes
      joined.forEach(p => {
        console.log(`%c🟢 MEMBER ONLINE: ${p.nickname}`, 'color: #00ff00; font-weight: bold');
      });
      
      left.forEach(p => {
        console.log(`%c🔴 MEMBER OFFLINE: ${p.nickname}`, 'color: #ff0000; font-weight: bold');
      });
      
      console.log(`[App] Room members: ${currentList.length} online`, currentList.map(p => p.nickname).join(', '));
      
      // Update previous list for next comparison
      previousParticipants = [...currentList];
      
      ui.updateRoomMembers(participants);
    });

    // Message events
    socketManager.on('messages:history', (messages) => {
      this.handleMessagesHistory(messages);
    });

    socketManager.on('message:new', (message) => {
      // Only add room messages when in a regular room (not DM)
      const currentRoom = state.get('room');
      if (currentRoom && !currentRoom.isDM) {
        state.addMessage(message);
        
        // Auto-mark as read immediately if message is from someone else
        // This simulates "message loaded in browser = message read"
        // Only for room messages, not DMs
        const currentUserId = state.get('user.id');
        if (message.senderId !== currentUserId && message.type !== 'system') {
          setTimeout(() => {
            console.log('[App] Auto-marking new message as read:', message.id);
            socketManager.markMessageRead(message.id);
          }, 500);
        }
      }
    });

    // Poll message event - when a new poll is created
    socketManager.on('message:poll', (message) => {
      console.log('[App] New poll received:', message);
      state.addMessage(message);
    });

    // Image message event
    socketManager.on('message:image', (message) => {
      console.log('[App] New image received:', message);
      state.addMessage(message);
    });

    // File message event
    socketManager.on('message:file', (message) => {
      console.log('[App] New file received:', message);
      state.addMessage(message);
    });

    socketManager.on('message:edited', (message) => {
      state.updateMessage(message.id, message);
    });

    socketManager.on('message:deleted', (data) => {
      state.removeMessage(data.messageId);
    });

    // Read receipt events
    socketManager.on('message:read', (data) => {
      this.handleMessageRead(data);
    });

    // DM read receipt events
    socketManager.on('dm:read', (data) => {
      this.handleDMRead(data);
    });

    // Poll events
    socketManager.on('poll:voted', (data) => {
      console.log('[App] Poll voted event received:', data);
      // Update the poll message with new vote data
      const messages = state.get('messages') || [];
      const pollMessage = messages.find(m => m.id === data.messageId);
      if (pollMessage && pollMessage.pollData) {
        console.log('[App] Found poll message, updating with new data');
        console.log('[App] Old poll data:', JSON.stringify(pollMessage.pollData));
        console.log('[App] New poll data:', JSON.stringify(data.pollData));
        // Update the poll data - pass only the updates, don't mutate original
        state.updateMessage(data.messageId, { pollData: data.pollData });
      } else {
        console.warn('[App] Poll message not found or no pollData:', data.messageId);
      }
    });

    socketManager.on('poll:closed', (data) => {
      // Update the poll message to show it's closed
      const messages = state.get('messages') || [];
      const pollMessage = messages.find(m => m.id === data.messageId);
      if (pollMessage && pollMessage.pollData) {
        pollMessage.pollData.isClosed = true;
        pollMessage.pollData.closedAt = data.closedAt;
        state.updateMessage(data.messageId, pollMessage);
      }
    });

    // DM received - auto-open chat with sender
    socketManager.on('dm:received', (data) => {
      console.log('[App] 💬 DM received:', data);
      this.handleDMReceived(data);
    });

    // DM sent confirmation - server confirmed message was sent
    socketManager.on('dm:sent', (data) => {
      console.log('[App] ✅ DM sent confirmation:', data);
      
      const message = data.message;
      if (!message) return;
      
      // Find and replace optimistic message with real server message
      const messages = state.get('messages') || [];
      const optimisticIndex = messages.findIndex(m => 
        m.senderId === message.senderId && 
        m.content === message.content &&
        m.id.startsWith('msg_') // Optimistic ID
      );
      
      if (optimisticIndex !== -1) {
        const oldId = messages[optimisticIndex].id;
        const newId = message.id;
        
        console.log('[App] Replacing optimistic message:', {
          oldId,
          newId
        });
        
        // Update message in state with real ID
        messages[optimisticIndex] = {
          id: newId,
          senderId: message.senderId,
          senderNickname: message.senderNickname || message.senderUsername,
          content: message.content,
          timestamp: message.timestamp || message.created_at,
          type: message.type || 'text',
          imageUrl: message.imageUrl,
          fileUrl: message.fileUrl,
          fileName: message.fileName,
          readBy: [] // Start with empty readBy array
        };
        
        // Update the message element's data-message-id attribute
        const messageEl = document.querySelector(`[data-message-id="${oldId}"]`);
        if (messageEl) {
          messageEl.dataset.messageId = newId;
          
          // Update checkmark data-message-id too
          const checkmark = messageEl.querySelector('.material-symbols-outlined[data-message-id]');
          if (checkmark) {
            checkmark.dataset.messageId = newId;
          }
          
          console.log('[App] Updated message element ID from', oldId, 'to', newId);
        }
        
        // Update state
        state.setMessages(messages);
      }
    });

    // DM history received - load messages into chat
    socketManager.on('dm:history', (data) => {
      console.log('[App] 📜 DM history received:', data);
      if (data.messages && Array.isArray(data.messages)) {
        // Get current room to check if we're still in the same DM
        const currentRoom = state.get('room');
        if (!currentRoom || !currentRoom.isDM) {
          console.log('[App] Not in DM anymore, ignoring history');
          return;
        }
        
        // Get existing message IDs to avoid duplicates
        const existingMessages = state.get('messages') || [];
        const existingIds = new Set(existingMessages.map(m => m.id));
        
        // Add only new messages to state
        data.messages.forEach(msg => {
          // Skip if message already exists
          if (existingIds.has(msg.id)) {
            return;
          }
          
          // Parse content for image/file markers
          let messageType = 'text';
          let imageUrl = null;
          let fileUrl = null;
          let fileName = null;
          let content = msg.content;
          
          // Check if it's an image message
          if (content && content.startsWith('[Image:') && content.endsWith(']')) {
            messageType = 'image';
            imageUrl = content.substring(8, content.length - 1).trim();
            content = '';
          }
          // Check if it's a file message
          else if (content && content.startsWith('[File:') && content.endsWith(']')) {
            messageType = 'file';
            const fileInfo = content.substring(7, content.length - 1).trim();
            fileName = fileInfo;
            fileUrl = fileInfo;
            content = '';
          }
          
          state.addMessage({
            id: msg.id,
            senderId: msg.senderId,
            senderNickname: msg.senderNickname,
            content: content,
            timestamp: msg.timestamp || new Date(),
            type: messageType,
            imageUrl: imageUrl,
            fileUrl: fileUrl,
            fileName: fileName
          });
        });
        
        // Update cached DM messages
        const allMessages = state.get('messages') || [];
        this.dmMessages.set(currentRoom.dmUsername, [...allMessages]);
        
        // Mark ALL messages from others as read immediately when history loads
        // This simulates "message loaded in browser = message read"
        setTimeout(() => this.markAllMessagesAsRead(), 500);
      }
    });

    // Username registered confirmation
    socketManager.on('username:registered', (data) => {
      console.log('');
      console.log('═══════════════════════════════════════════════════════');
      console.log('✅ USERNAME REGISTERED SUCCESSFULLY!');
      console.log('═══════════════════════════════════════════════════════');
      console.log('User ID:', data.user?.id);
      console.log('Username:', data.user?.username);
      console.log('Nickname:', data.user?.nickname);
      console.log('Full data:', JSON.stringify(data, null, 2));
      console.log('═══════════════════════════════════════════════════════');
      console.log('');
    });

    // Invite received - show notification
    socketManager.on('invite:received', (invite) => {
      console.log('');
      console.log('═══════════════════════════════════════════════════════');
      console.log('📨 INVITE RECEIVED EVENT TRIGGERED!');
      console.log('═══════════════════════════════════════════════════════');
      console.log('From:', invite.fromUsername);
      console.log('Room Code:', invite.roomCode);
      console.log('Room ID:', invite.roomId);
      console.log('Invite ID:', invite.id);
      console.log('Timestamp:', invite.timestamp);
      console.log('Full invite data:', JSON.stringify(invite, null, 2));
      console.log('═══════════════════════════════════════════════════════');
      console.log('');
      
      this.showInviteNotification(invite);
    });

    // Invite sent confirmation
    socketManager.on('invite:sent', (data) => {
      console.log('');
      console.log('═══════════════════════════════════════════════════════');
      console.log('✅ INVITE SENT CONFIRMATION RECEIVED!');
      console.log('═══════════════════════════════════════════════════════');
      console.log('To:', data.username);
      console.log('Offline:', data.offline || false);
      console.log('Full data:', JSON.stringify(data, null, 2));
      console.log('═══════════════════════════════════════════════════════');
      console.log('');
    });

    // Error events
    socketManager.on('error', (error) => {
      this.handleError(error);
      
      // If room not found, clear the saved session
      if (error.code === 'ROOM_NOT_FOUND') {
        console.log('[App] Room not found, clearing saved session');
        localStorage.removeItem('wave_session');
        
        // Show user-friendly message
        const message = 'The previous room no longer exists. Please join or create a new room.';
        state.addMessage({
          id: `system_${Date.now()}`,
          type: 'system',
          content: message,
          timestamp: new Date()
        });
      }
    });
  }

  /**
   * Setup state subscriptions
   */
  setupStateSubscriptions() {
    // Subscribe to screen changes
    state.subscribe('ui.screen', (screen) => {
      if (screen === 'login') {
        ui.showLogin();
      } else if (screen === 'chat') {
        ui.showChat();
      }
    });

    // Subscribe to user changes
    state.subscribe('user', (user) => {
      if (user.nickname) {
        ui.updateUserInfo(user.nickname);
      }
    });

    // Subscribe to room changes
    state.subscribe('room', (room) => {
      if (room.name) {
        ui.updateRoomName(room.name);
        ui.updateRoomsList([room]); // Show current room in sidebar
      }
    });

    // Subscribe to messages
    state.subscribe('messages', (messages, oldMessages) => {
      // Ensure messages is an array
      if (!Array.isArray(messages)) {
        console.warn('[App] Messages is not an array:', messages);
        return;
      }

      const oldMessagesArray = Array.isArray(oldMessages) ? oldMessages : [];
      const oldIds = new Set(oldMessagesArray.map(m => m.id));
      const newIds = new Set(messages.map(m => m.id));
      const oldMessagesMap = new Map(oldMessagesArray.map(m => [m.id, m]));

      // Find new messages
      const newMessages = messages.filter(m => !oldIds.has(m.id));

      // Find updated messages
      const updatedMessages = messages.filter(m => {
        if (!oldIds.has(m.id)) return false;
        const oldMsg = oldMessagesMap.get(m.id);
        return JSON.stringify(oldMsg) !== JSON.stringify(m);
      });

      // Find deleted messages
      const deletedMessageIds = oldMessagesArray
        .filter(m => !newIds.has(m.id))
        .map(m => m.id);

      // Render new messages
      newMessages.forEach(msg => {
        ui.renderMessage(msg, state.get('user.id'));
      });

      // Re-render updated messages
      updatedMessages.forEach(msg => {
        ui.removeMessage(msg.id);
        ui.renderMessage(msg, state.get('user.id'));
      });

      // Remove deleted messages
      deletedMessageIds.forEach(id => {
        ui.removeMessage(id);
      });
    });

    // Subscribe to editing state
    state.subscribe('ui.editingMessageId', (messageId) => {
      ui.setSendButtonEditMode(!!messageId);
    });

    // Subscribe to connection status
    state.subscribe('ui.connectionStatus', (status) => {
      ui.showConnectionStatus(status);
    });

    // Subscribe to errors
    state.subscribe('error', (error) => {
      if (error) {
        ui.showError(error.message || 'An error occurred');
      }
    });

    // Subscribe to room changes - show back button for DMs
    state.subscribe('room', (room) => {
      const backBtn = document.getElementById('backToRoomBtn');
      if (backBtn) {
        if (room && room.isDM) {
          backBtn.classList.remove('hidden');
        } else {
          backBtn.classList.add('hidden');
        }
      }
      
      // Update DM list when room changes
      this.renderDMList();
    });
  }





  /**
   * Update room code display in UI
   * ## CODE REVIEW FIX: Already has proper null checks with optional chaining
   */
  updateRoomCodeDisplay(code) {
    const roomCodeDisplay = document.getElementById('roomCodeDisplay');
    if (roomCodeDisplay) {
      roomCodeDisplay.textContent = code || '-';
    }
    
    // Update UI state based on whether we have a room
    this.updateRoomUIState(!!code);
  }

  /**
   * Handle room joined
   */
  handleRoomJoined(data) {
    console.log('[App] Joined room:', data);
    
    // Save current context messages before switching
    const currentRoom = state.get('room');
    if (currentRoom) {
      const currentMessages = state.get('messages') || [];
      if (currentRoom.isDM) {
        // Save current DM messages
        this.dmMessages.set(currentRoom.dmUsername, [...currentMessages]);
      } else {
        // Save current room messages
        this.roomMessages.set(currentRoom.id, [...currentMessages]);
      }
    }
    
    // Clear messages for UI
    state.clearMessages();
    
    // Log user connection info
    const finalUserId = data.userId || data.participantId;
    console.log(`%c👤 USER CONNECTED`, 'color: #00ff00; font-weight: bold; font-size: 14px');
    console.log(`%c   Nickname: ${data.nickname}`, 'color: #00ff00');
    console.log(`%c   User ID: ${finalUserId}`, 'color: #00ff00');
    console.log(`%c   Room: ${data.roomCode}`, 'color: #00ff00');

    // Update state with stable userId if provided, otherwise use participantId
    state.setUser({
      id: finalUserId,
      nickname: data.nickname,
      username: state.get('user.username')
    });

    // Use the actual room code from backend, not UUID substring
    const roomCode = data.roomCode || data.roomId.substring(0, 8);
    const room = {
      id: data.roomId,
      code: roomCode,
      name: `Room ${roomCode}`,
      isDM: false
    };
    state.setRoom(room);

    // Add room to rooms list
    this.rooms.set(roomCode, room);
    
    // Restore room messages if we have them cached
    const cachedMessages = this.roomMessages.get(data.roomId) || [];
    if (cachedMessages.length > 0) {
      console.log('[App] Restoring', cachedMessages.length, 'cached room messages');
      cachedMessages.forEach(msg => state.addMessage(msg));
    }
    
    // Immediately update the rooms list in sidebar
    ui.updateRoomsList([room]);
    ui.updateRoomName(room.name);
    
    // Update status to show it's a room
    this.updateRoomStatus('Active now');
    
    // Update room code display and UI state
    this.updateRoomCodeDisplay(roomCode);
    
    // Render updated chats list
    this.renderDMList();

    // Save session to localStorage
    this.saveSession();

    // Switch to chat screen
    state.setScreen('chat');

    // Add welcome message only if no cached messages
    if (cachedMessages.length === 0) {
      state.addMessage({
        id: `system_${Date.now()}`,
        type: 'system',
        content: `Welcome to the room, ${data.nickname}! Room code: ${roomCode}`,
        timestamp: new Date()
      });
    }

    // Start heartbeat to poll participants every 5 seconds
    this.startParticipantsHeartbeat();
  }

  /**
   * Start heartbeat to poll participants list every 5 seconds
   * ## CODE REVIEW FIX: Properly clear existing heartbeat to prevent conflicts
   */
  startParticipantsHeartbeat() {
    // Clear any existing heartbeat properly
    if (this.participantsHeartbeat) {
      clearInterval(this.participantsHeartbeat);
      this.participantsHeartbeat = null;
      console.log('[App] Cleared existing heartbeat');
    }

    // Request participants immediately
    socketManager.requestParticipants();

    // Then poll every 5 seconds
    this.participantsHeartbeat = setInterval(() => {
      if (socketManager.isConnected() && state.get('room.id')) {
        console.log('[App] Heartbeat: requesting participants...');
        socketManager.requestParticipants();
      }
    }, 5000);
  }

  /**
   * Stop participants heartbeat
   */
  stopParticipantsHeartbeat() {
    if (this.participantsHeartbeat) {
      clearInterval(this.participantsHeartbeat);
      this.participantsHeartbeat = null;
    }
  }

  /**
   * Handle messages history
   * ## CODE REVIEW FIX: Added validation for message objects
   */
  handleMessagesHistory(messages) {
    // Convert to array if it's an object
    const messagesArray = Array.isArray(messages) ? messages : Object.values(messages || {});
    
    // Validate that we have an array
    if (!Array.isArray(messagesArray)) {
      console.warn('[App] Invalid message history format:', messages);
      return;
    }
    
    // Validate each message object
    const validMessages = messagesArray.filter(msg => {
      if (!msg || typeof msg !== 'object') return false;
      if (!msg.id || !msg.content) return false;
      return true;
    });
    
    console.log('[App] Received message history:', validMessages.length);
    state.setMessages(validMessages);
    
    // Mark ALL messages from others as read immediately when history loads
    // This simulates "message loaded in browser = message read"
    setTimeout(() => this.markAllMessagesAsRead(), 500);
  }

  /**
   * Handle send message
   */
  async handleSendMessage() {
    const content = ui.getMessageInput();

    if (!content) {
      return;
    }

    const editingMessageId = state.get('ui.editingMessageId');

    if (editingMessageId) {
      // Edit existing message
      socketManager.editMessage(editingMessageId, content);
      this.handleCancelEdit();
    } else {
      // Check if in DM (room with isDM flag)
      const currentRoom = state.get('room');
      
      if (currentRoom && currentRoom.isDM) {
        // Send DM via socket
        await this.sendDirectMessage(content);
      } else {
        // Send room message via socket
        socketManager.sendMessage(content);
      }
      
      ui.clearMessageInput();
    }

    // Stop typing indicator
    socketManager.stopTyping();
  }

  /**
   * Send direct message via socket
   */
  async sendDirectMessage(content) {
    try {
      const currentRoom = state.get('room');
      const toUsername = currentRoom?.dmUsername || currentRoom?.name;

      if (!toUsername) {
        alert('No recipient selected');
        return;
      }

      console.log('[App] 💬 Sending message to:', toUsername);
      
      // Send via socket
      socketManager.sendDM(toUsername, content);
      
      // Add message to chat immediately (optimistic update)
      state.addMessage({
        id: `msg_${Date.now()}`,
        senderId: state.get('user.id'),
        senderNickname: state.get('user.nickname'),
        content: content,
        timestamp: new Date(),
        type: 'text'
      });
      
      console.log('[App] ✅ Message sent');
    } catch (error) {
      console.error('[App] Send message error:', error);
      alert(`Failed to send message: ${error.message}`);
    }
  }

  /**
   * Handle edit message
   */
  handleEditMessage(messageId, content) {
    state.setEditingMessage(messageId);
    ui.setMessageInput(content);
    ui.focusMessageInput();
    ui.selectMessageInput();
  }

  /**
   * Handle cancel edit
   */
  handleCancelEdit() {
    state.clearEditingMessage();
    ui.clearMessageInput();
  }

  /**
   * Handle delete message
   */
  handleDeleteMessage(messageId) {
    console.log('[App] ✅ handleDeleteMessage called for:', messageId);
    if (confirm('Delete this message?')) {
      console.log('[App] User confirmed deletion, sending to server');
      socketManager.deleteMessage(messageId);
    } else {
      console.log('[App] User cancelled deletion');
    }
  }

  /**
   * Handle report message
   */
  async handleReportMessage(messageId, message) {
    console.log('[App] Report message called for:', messageId, message);
    
    const reason = prompt('Why are you reporting this message?\n\nPlease provide details:');
    
    if (!reason || reason.trim() === '') {
      return;
    }
    
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/reports/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          messageId: messageId,
          reportedUserId: message.senderId,
          reason: reason.trim(),
          messageContent: message.content
        })
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit report');
      }
      
      alert('Thank you for your report. We will investigate this matter.');
    } catch (error) {
      console.error('Error reporting message:', error);
      alert('Failed to submit report: ' + error.message);
    }
  }

  /**
   * Handle typing
   */
  handleTyping() {
    // Clear existing timeout
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }

    // Send typing start
    if (!state.get('ui.isTyping')) {
      socketManager.startTyping();
      state.setState({ ui: { isTyping: true } });
    }

    // Set timeout to stop typing
    this.typingTimeout = setTimeout(() => {
      socketManager.stopTyping();
      state.setState({ ui: { isTyping: false } });
    }, this.typingDebounceMs);
  }

  /**
   * Handle error with user-friendly messages
   */
  handleError(error) {
    console.error('[App] Error:', error);
    
    // Map error codes to user-friendly messages
    const errorMessages = {
      'NOT_IN_ROOM': 'You need to join a room first',
      'USER_OFFLINE': 'This user is currently offline',
      'ROOM_NOT_FOUND': 'Room not found. Please check the room code',
      'INVALID_ROOM_CODE': 'Invalid room code format',
      'MESSAGE_TOO_LONG': 'Message is too long. Please shorten it',
      'FILE_TOO_LARGE': 'File is too large. Maximum size is 10MB',
      'UNAUTHORIZED': 'You are not authorized to perform this action',
      'CONNECTION_LOST': 'Connection lost. Reconnecting...',
      'RATE_LIMIT': 'Too many requests. Please slow down',
      'DM_OPEN_FAILED': 'Failed to open chat. Please try again',
      'NETWORK_ERROR': 'Network error. Please check your connection',
      'SERVER_ERROR': 'Server error. Please try again later',
      'INVALID_FILE_TYPE': 'Invalid file type. Please upload a supported file',
      'UPLOAD_FAILED': 'File upload failed. Please try again'
    };
    
    const userMessage = errorMessages[error.code] || error.message || 'An error occurred';
    
    // Show error to user
    this.showErrorToast(userMessage);
    
    state.setError({
      code: error.code,
      message: userMessage
    });
  }
  
  /**
   * Show error toast notification
   */
  showErrorToast(message) {
    // Escape HTML to prevent XSS
    const escapeHtml = (text) => {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    };
    
    const toast = document.createElement('div');
    toast.className = 'fixed top-20 right-4 bg-red-500/90 text-white px-4 py-3 rounded-lg shadow-xl z-50 max-w-sm animate-slide-up';
    toast.innerHTML = `
      <div class="flex items-center gap-3">
        <span class="material-symbols-outlined">error</span>
        <span class="text-sm">${escapeHtml(message)}</span>
        <button class="ml-2 hover:bg-white/20 rounded p-1 transition-colors" onclick="this.parentElement.parentElement.remove()">
          <span class="material-symbols-outlined text-[18px]">close</span>
        </button>
      </div>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      if (toast.parentElement) {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-20px)';
        setTimeout(() => toast.remove(), 300);
      }
    }, 4000);
  }

  /**
   * Handle message read receipt
   */
  handleMessageRead(data) {
    const { messageId, userId, nickname } = data;
    const currentUserId = state.get('user.id');
    
    console.log('[App] Message read:', { messageId, userId, nickname });
    
    // Only update UI for own messages
    const messages = state.get('messages') || [];
    const message = messages.find(m => m.id === messageId);
    
    if (message && message.senderId === currentUserId) {
      // Don't show read receipt if the reader is the sender (you read your own message)
      if (userId === currentUserId) {
        console.log('[App] Ignoring read receipt - sender read their own message');
        return;
      }
      
      // Update message read status in state
      if (!message.readBy) {
        message.readBy = [];
      }
      if (!message.readBy.find(r => r.id === userId)) {
        message.readBy.push({ id: userId, nickname, readAt: new Date() });
      }
      
      // Update the state to trigger re-render
      state.updateMessage(messageId, message);
      
      // Also directly update the checkmark in UI for immediate feedback
      const messageEl = document.querySelector(`[data-message-id="${messageId}"]`);
      if (messageEl) {
        const checkmark = messageEl.querySelector('.material-symbols-outlined[data-message-id]');
        if (checkmark) {
          checkmark.textContent = 'done_all';
          checkmark.classList.remove('text-slate-400');
          checkmark.classList.add('text-accent-cyan');
          checkmark.title = `Read by ${message.readBy.length} ${message.readBy.length === 1 ? 'person' : 'people'}`;
          console.log('[App] Updated checkmark for message:', messageId);
        }
      }
    }
  }

  /**
   * Handle DM read receipt
   */
  handleDMRead(data) {
    const { messageId, userId, nickname } = data;
    const currentUserId = state.get('user.id');
    
    console.log('[App] 📖 DM read event received:', { messageId, userId, nickname });
    
    // Only update UI for own messages
    const messages = state.get('messages') || [];
    console.log('[App] Total messages in state:', messages.length);
    console.log('[App] Looking for message ID:', messageId);
    
    const message = messages.find(m => m.id === messageId);
    
    if (!message) {
      console.error('[App] ❌ Message NOT FOUND in state!');
      console.log('[App] Available message IDs:', messages.map(m => m.id));
      return;
    }
    
    console.log('[App] ✅ Message found:', message);
    console.log('[App] Message senderId:', message.senderId, 'Current userId:', currentUserId);
    
    if (message.senderId === currentUserId) {
      // Don't show read receipt if the reader is the sender (you read your own message)
      if (userId === currentUserId) {
        console.log('[App] Ignoring DM read receipt - sender read their own message');
        return;
      }
      
      console.log('[App] This is OUR message, updating read status...');
      
      // Update message read status in state
      if (!message.readBy) {
        message.readBy = [];
      }
      if (!message.readBy.find(r => r.id === userId)) {
        message.readBy.push({ id: userId, nickname, readAt: new Date() });
      }
      
      console.log('[App] Updated readBy array:', message.readBy);
      
      // Update the state to trigger re-render
      state.updateMessage(messageId, message);
      
      // Also directly update the checkmark in UI for immediate feedback
      const messageEl = document.querySelector(`[data-message-id="${messageId}"]`);
      console.log('[App] Looking for message element with ID:', messageId);
      console.log('[App] Message element found:', !!messageEl);
      
      if (messageEl) {
        const checkmark = messageEl.querySelector('.material-symbols-outlined[data-message-id]');
        console.log('[App] Checkmark element found:', !!checkmark);
        
        if (checkmark) {
          console.log('[App] Current checkmark text:', checkmark.textContent);
          console.log('[App] Current checkmark classes:', checkmark.className);
          
          checkmark.textContent = 'done_all';
          checkmark.classList.remove('text-slate-400');
          checkmark.classList.add('text-accent-cyan');
          checkmark.title = `Read by ${nickname}`;
          
          console.log('[App] ✅ Updated checkmark text to:', checkmark.textContent);
          console.log('[App] ✅ Updated checkmark classes to:', checkmark.className);
        } else {
          console.error('[App] ❌ Checkmark element NOT FOUND inside message element!');
        }
      } else {
        console.error('[App] ❌ Message element NOT FOUND in DOM!');
      }
    } else {
      console.log('[App] Not our message, ignoring (senderId:', message.senderId, 'vs currentUserId:', currentUserId, ')');
    }
  }

  /**
   * Mark all messages from others as read
   * Called when messages are loaded - simulates "loaded = read"
   */
  markAllMessagesAsRead() {
    const currentUserId = state.get('user.id');
    const currentRoom = state.get('room');
    const messages = state.get('messages') || [];
    
    console.log('[App] 📖 markAllMessagesAsRead called');
    console.log('[App] Current user ID:', currentUserId);
    console.log('[App] Current room:', currentRoom);
    console.log('[App] Total messages:', messages.length);
    
    // Find messages from others that haven't been marked as read by us
    const unreadMessages = messages.filter(m => {
      const isFromOther = m.senderId !== currentUserId;
      const isNotSystem = m.type !== 'system';
      const notReadByMe = !m.readBy?.find(r => r.id === currentUserId);
      
      console.log(`[App] Message ${m.id}: fromOther=${isFromOther}, notSystem=${isNotSystem}, notRead=${notReadByMe}`);
      
      return isFromOther && isNotSystem && notReadByMe;
    });
    
    console.log('[App] Unread messages from others:', unreadMessages.length);
    
    if (unreadMessages.length === 0) {
      console.log('[App] No unread messages to mark');
      return;
    }

    const messageIds = unreadMessages.map(m => m.id);
    
    console.log('[App] Marking all loaded messages as read:', messageIds.length, messageIds);
    
    // Check if we're in a DM or room
    if (currentRoom && currentRoom.isDM) {
      // DM - use DM read receipt
      const otherUsername = currentRoom.dmUsername || currentRoom.name;
      console.log('[App] Calling markDMAllRead for user:', otherUsername);
      socketManager.markDMAllRead(messageIds, otherUsername);
    } else {
      // Room - use room read receipt
      console.log('[App] Calling markAllRead for room');
      socketManager.markAllRead(messageIds);
    }
  }

  /**
   * Mark visible messages as read
   */
  markVisibleMessagesAsRead() {
    const currentUserId = state.get('user.id');
    const messages = state.get('messages') || [];
    
    // Find messages from others that haven't been marked as read by us
    const unreadMessages = messages.filter(m => 
      m.senderId !== currentUserId && 
      m.type !== 'system' &&
      !m.readBy?.find(r => r.id === currentUserId)
    );
    
    if (unreadMessages.length === 0) return;

    // Use Intersection Observer to only mark messages that are actually visible
    const messagesContainer = document.getElementById('messages');
    if (!messagesContainer) return;

    const visibleMessageIds = [];
    
    unreadMessages.forEach(msg => {
      const messageEl = document.querySelector(`[data-message-id="${msg.id}"]`);
      if (messageEl) {
        const rect = messageEl.getBoundingClientRect();
        const containerRect = messagesContainer.getBoundingClientRect();
        
        // Check if message is visible in viewport
        const isVisible = (
          rect.top >= containerRect.top &&
          rect.bottom <= containerRect.bottom &&
          rect.top < window.innerHeight &&
          rect.bottom > 0
        );
        
        if (isVisible) {
          visibleMessageIds.push(msg.id);
        }
      }
    });
    
    if (visibleMessageIds.length > 0) {
      console.log('[App] Marking visible messages as read:', visibleMessageIds.length);
      socketManager.markAllRead(visibleMessageIds);
    }
  }

  /**
   * Show invite notification as a message in chat
   */
  showInviteNotification(invite) {
    console.log('');
    console.log('═══════════════════════════════════════════════════════');
    console.log('💬 [App.js] SHOWING INVITE IN CHAT');
    console.log('═══════════════════════════════════════════════════════');
    console.log('Creating invite message...');
    
    // Add invite as a special system message
    const inviteMessage = {
      id: invite.id,
      type: 'invite',
      fromUsername: invite.fromUsername,
      roomCode: invite.roomCode,
      roomId: invite.roomId,
      content: `${invite.fromUsername} invited you to join room ${invite.roomCode}`,
      timestamp: new Date(),
      inviteData: invite
    };
    
    console.log('Invite message object:', JSON.stringify(inviteMessage, null, 2));
    console.log('Adding to state...');
    
    state.addMessage(inviteMessage);
    
    console.log('✅ Invite message added to state');
    console.log('Current messages count:', state.get('messages')?.length || 0);
    console.log('═══════════════════════════════════════════════════════');
    console.log('');
    
    // Play notification sound
    this.playNotificationSound();
  }

  /**
   * Handle accept invite
   */
  async handleAcceptInvite(invite) {
    try {
      console.log('[App] ✅ ACCEPTING INVITE');
      console.log('[App]   From:', invite.fromUsername);
      console.log('[App]   Room Code:', invite.roomCode);
      
      // Leave current room if in one
      const currentRoom = state.get('room');
      if (currentRoom && currentRoom.id) {
        console.log('[App] 👋 Leaving current room:', currentRoom.code);
        socketManager.leaveRoom();
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
      
      // Clear messages
      console.log('[App] 🗑️ Clearing messages');
      state.clearMessages();
      
      // Join the room
      const nickname = state.get('user.nickname');
      console.log('[App] 🚪 Joining room:', invite.roomCode, 'as', nickname);
      socketManager.joinRoom(invite.roomCode, nickname);
      
      // Show success message
      state.addMessage({
        id: `system_${Date.now()}`,
        type: 'system',
        content: `Joined room from ${invite.fromUsername}'s invite!`,
        timestamp: new Date()
      });
      
      console.log('[App] ✅ Successfully joined room!');
    } catch (error) {
      console.error('[App] ❌ Accept invite error:', error);
      alert('Failed to join room');
    }
  }

  /**
   * Handle decline invite
   */
  handleDeclineInvite(invite) {
    console.log('[App] ❌ DECLINING INVITE');
    console.log('[App]   From:', invite.fromUsername);
    console.log('[App]   Room Code:', invite.roomCode);
    
    // Remove the invite message
    state.removeMessage(invite.id);
    
    // Show declined message
    state.addMessage({
      id: `system_${Date.now()}`,
      type: 'system',
      content: `You declined the invite from ${invite.fromUsername}`,
      timestamp: new Date()
    });
    
    console.log('[App] ✅ Invite declined');
  }

  /**
   * Cleanup
   * ## CODE REVIEW FIX: Added proper cleanup for heartbeat and event listeners
   */
  cleanup() {
    // Stop heartbeat
    this.stopParticipantsHeartbeat();
    
    // Disconnect socket
    socketManager.disconnect();
    
    // Reset state
    state.reset();
    
    // Clear DM conversations
    this.dmConversations.clear();
    
    // Reset setup flags
    this.chatButtonsSetup = false;
    this.socketHandlersSetup = false;
    
    console.log('[App] Cleanup complete');
  }

  /**
   * Leave current DM and return to last room (or show no room state)
   */
  exitDMMode() {
    // Clear current room/DM
    state.clearRoom();
    state.clearMessages();

    // Update UI
    ui.updateRoomName('No Room');
    this.updateRoomCodeDisplay(null);
    this.updateRoomUIState(false);

    // Update DM sidebar
    this.renderDMList();

    // Try to restore previous room from session
    const savedSession = localStorage.getItem('wave_session');
    if (savedSession) {
      try {
        const session = JSON.parse(savedSession);
        if (session.room && session.room.code && !session.room.isDM) {
          const nickname = state.get('user.nickname');
          if (nickname) {
            console.log('[App] Rejoining previous room:', session.room.code);
            socketManager.joinRoom(session.room.code, nickname);
            return;
          }
        }
      } catch (e) {
        console.warn('[App] Failed to restore room:', e);
      }
    }

    // Show "create room" state
    state.addMessage({
      id: `system_${Date.now()}`,
      type: 'system',
      content: 'Create or join a room to start chatting',
      timestamp: new Date()
    });
  }

  /**
   * Logout - clear session and return to login
   */
  async logout() {
    try {
      // Stop heartbeat
      this.stopParticipantsHeartbeat();
      
      // Call logout API if we have a token
      const authToken = localStorage.getItem('authToken');
      if (authToken) {
        try {
          await fetch('/api/auth/logout', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${authToken}`
            }
          });
        } catch (error) {
          console.error('[App] Logout API call failed:', error);
        }
      }
      
      // Clear all localStorage
      localStorage.removeItem('wave_session');
      localStorage.removeItem('authToken');
      localStorage.removeItem('userId');
      localStorage.removeItem('username');
      localStorage.removeItem('nickname');
      
      // Disconnect socket
      socketManager.disconnect();
      
      // Reset state
      state.reset();
      
      // Redirect to login page
      window.location.href = '/login.html';
    } catch (error) {
      console.error('[App] Logout error:', error);
      // Force redirect anyway
      window.location.href = '/login.html';
    }
  }

  /**
   * Tab Management
   */
  
  /**
   * Render combined chats list (DMs + Rooms together)
   */
  renderDMList() {
    const chatsList = document.getElementById('chatsList');
    if (!chatsList) return;
    
    chatsList.innerHTML = '';
    
    const currentRoom = state.get('room');
    
    // Render DMs first
    for (const username of this.dmConversations) {
      const cleanUsername = username.replace('@', '');
      const isActive = currentRoom && currentRoom.isDM && 
        currentRoom.name.replace('@', '').toLowerCase() === cleanUsername.toLowerCase();
      
      const unreadCount = this.unreadCounts.get(cleanUsername) || 0;
      
      const dmEl = document.createElement('button');
      dmEl.className = `w-full flex items-center gap-3 p-2 rounded-lg transition-colors relative ${
        isActive ? 'bg-primary/20 text-white' : 'text-slate-400 hover:bg-surface-lighter hover:text-white'
      }`;
      
      dmEl.innerHTML = `
        <div class="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
          <span class="material-symbols-outlined text-primary text-[16px]">person</span>
        </div>
        <span class="text-sm truncate flex-1">${cleanUsername}</span>
        ${unreadCount > 0 ? `
          <span class="bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            ${unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ` : ''}
      `;
      
      dmEl.addEventListener('click', () => this.handleStartChat(null, username));
      
      chatsList.appendChild(dmEl);
    }
    
    // Render rooms
    for (const [roomCode, room] of this.rooms) {
      const isActive = currentRoom && !currentRoom.isDM && 
        currentRoom.code === roomCode;
      
      const roomEl = document.createElement('button');
      roomEl.className = `w-full flex items-center gap-3 p-2 rounded-lg transition-colors ${
        isActive ? 'bg-primary/20 text-white' : 'text-slate-400 hover:bg-surface-lighter hover:text-white'
      }`;
      
      roomEl.innerHTML = `
        <div class="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
          <span class="material-symbols-outlined text-primary text-[16px]">group</span>
        </div>
        <span class="text-sm truncate">${room.name}</span>
      `;
      
      roomEl.addEventListener('click', () => {
        const nickname = state.get('user.nickname');
        if (nickname) {
          socketManager.joinRoom(roomCode, nickname);
        }
      });
      
      chatsList.appendChild(roomEl);
    }
    
    // Update right panel based on if in DM or room
    const roomInfoPanel = document.getElementById('roomInfoPanel');
    const roomMembersList = document.getElementById('roomMembersList');
    const roomNameRight = document.getElementById('roomNameRight');
    
    // Get the Room Members title (h3 with "Room Members" text)
    const roomMembersTitle = Array.from(roomInfoPanel?.querySelectorAll('h3') || [])
      .find(h3 => h3.textContent.includes('Room Members'));
    
    // Get the Room Info title (h3 with "Room Info" text)
    const roomInfoTitle = Array.from(roomInfoPanel?.querySelectorAll('h3') || [])
      .find(h3 => h3.textContent.includes('Room Info'));
    
    const roomInfoContainer = document.getElementById('roomInfoContainer');
    
    // Always ensure panel is visible if we have a room
    if (currentRoom && roomInfoPanel) {
      roomInfoPanel.style.display = '';
      roomInfoPanel.classList.remove('hidden');
      roomInfoPanel.classList.add('xl:flex');
    }
    
    if (currentRoom && currentRoom.isDM) {
      // In DM - hide everything except Room Members
      
      // Hide Room Settings section (notification toggle, create/regenerate buttons)
      const notificationToggle = roomInfoPanel?.querySelector('.mb-4.p-3.bg-surface-lighter');
      const roomActionContainer = document.getElementById('roomActionContainer');
      const roomSettingsTitle = roomInfoPanel?.querySelector('h3:first-of-type');
      
      if (notificationToggle) notificationToggle.style.display = 'none';
      if (roomActionContainer) roomActionContainer.style.display = 'none';
      if (roomSettingsTitle) roomSettingsTitle.style.display = 'none';
      
      // Hide Room Info section completely (title + container)
      if (roomInfoTitle) roomInfoTitle.style.display = 'none';
      if (roomInfoContainer) roomInfoContainer.style.display = 'none';
      
      // Update panel title
      if (roomNameRight) {
        roomNameRight.textContent = currentRoom.name;
      }
      
      // Show 2 members (you + other person)
      if (roomMembersList) {
        const myNickname = state.get('user.nickname') || 'You';
        const otherPerson = currentRoom.name;
        
        // Check if other person is online by requesting from server
        this.checkUserOnlineStatus(otherPerson).then(isOnline => {
          const statusText = isOnline ? 'Online' : 'Offline';
          const statusColor = isOnline ? 'bg-green-500' : 'bg-gray-500';
          
          roomMembersList.innerHTML = `
            <div class="flex items-center gap-3 p-2 rounded-lg bg-surface-lighter">
              <div class="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <span class="material-symbols-outlined text-primary text-[16px]">person</span>
              </div>
              <div class="flex-1">
                <div class="text-sm font-medium text-white">${myNickname}</div>
                <div class="text-xs text-slate-400">You</div>
              </div>
              <div class="w-2 h-2 bg-green-500 rounded-full"></div>
            </div>
            <div class="flex items-center gap-3 p-2 rounded-lg bg-surface-lighter">
              <div class="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <span class="material-symbols-outlined text-primary text-[16px]">person</span>
              </div>
              <div class="flex-1">
                <div class="text-sm font-medium text-white">${otherPerson}</div>
                <div class="text-xs text-slate-400">${statusText}</div>
              </div>
              <div class="w-2 h-2 ${statusColor} rounded-full"></div>
            </div>
          `;
        });
      }
    } else if (currentRoom) {
      // In room - show all sections
      
      // Show Room Settings section
      const notificationToggle = roomInfoPanel?.querySelector('.mb-4.p-3.bg-surface-lighter');
      const roomActionContainer = document.getElementById('roomActionContainer');
      const roomSettingsTitle = roomInfoPanel?.querySelector('h3:first-of-type');
      
      if (notificationToggle) notificationToggle.style.display = 'block';
      if (roomActionContainer) roomActionContainer.style.display = 'block';
      if (roomSettingsTitle) roomSettingsTitle.style.display = 'block';
      
      // Show Room Info section
      if (roomInfoTitle) roomInfoTitle.style.display = 'block';
      if (roomInfoContainer) roomInfoContainer.style.display = 'block';
    }
  }
}


// Initialize app when DOM is ready
let app;

function initializeApp() {
  app = new App();
  window.app = app; // Make available globally
  app.init();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (app) {
    app.cleanup();
  }
});
