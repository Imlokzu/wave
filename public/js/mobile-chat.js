/**
 * Mobile Chat Application
 * Main functionality for mobile chat interface
 */

class MobileChat {
    constructor() {
        this.initElements();
        this.initState();
        this.bindEvents();
        this.checkAuth();
    }

    initElements() {
        this.loginScreen = document.getElementById('loginScreen');
        this.mobileContainer = document.getElementById('mobileContainer');
        
        // Chat elements
        this.messageInput = document.getElementById('messageInput');
        this.sendBtn = document.getElementById('sendBtn');
        this.messagesContainer = document.getElementById('messagesContainer');
        this.messagesList = document.getElementById('messagesList');
        this.welcomeMessage = document.getElementById('welcomeMessage');
        this.scrollToBottomBtn = document.getElementById('scrollToBottomBtn');
        this.unreadBadge = document.getElementById('unreadBadge');
        
        // Header elements
        this.currentRoomName = document.getElementById('currentRoomName');
        this.currentRoomStatus = document.getElementById('currentRoomStatus');
        
        // Panel elements
        this.leftRoomName = document.getElementById('leftRoomName');
        this.leftRoomStatus = document.getElementById('leftRoomStatus');
        this.leftRoomMembers = document.getElementById('leftRoomMembers');
        this.chatsList = document.getElementById('chatsList');
        
        // Buttons
        this.createRoomBtn = document.getElementById('createRoomBtn');
        this.newChatBtn = document.getElementById('newChatBtn');
        this.joinRoomBtn = document.getElementById('joinRoomBtn');
        this.attachBtn = document.getElementById('attachBtn');
        this.emojiBtn = document.getElementById('emojiBtn');
        this.voiceBtn = document.getElementById('voiceBtn');
        this.searchBtn = document.getElementById('searchBtn');
        
        // Typing indicator
        this.typingIndicator = document.getElementById('typingIndicator');
        this.typingText = document.getElementById('typingText');
    }

    initState() {
        this.currentRoom = null;
        this.currentUser = null;
        this.messages = [];
        this.isTyping = false;
        this.typingTimer = null;
        this.unreadCount = 0;
        this.isScrolledToBottom = true;
        
        // Sample data for demo
        this.sampleRooms = [
            {
                id: 'general',
                name: 'General Room',
                type: 'room',
                members: ['Alice', 'Bob', 'Charlie'],
                lastMessage: 'Hey everyone! 👋',
                timestamp: Date.now() - 120000,
                unread: 3
            },
            {
                id: 'alice-dm',
                name: 'Alice',
                type: 'dm',
                members: ['Alice'],
                lastMessage: 'Sure, let\'s meet tomorrow',
                timestamp: Date.now() - 300000,
                unread: 0
            }
        ];
        
        this.sampleMessages = [
            {
                id: 1,
                roomId: 'general',
                userId: 'alice',
                username: 'Alice',
                content: 'Hey everyone! 👋',
                timestamp: Date.now() - 300000,
                type: 'text'
            },
            {
                id: 2,
                roomId: 'general',
                userId: 'bob',
                username: 'Bob',
                content: 'Hello Alice! How\'s everyone doing?',
                timestamp: Date.now() - 240000,
                type: 'text'
            },
            {
                id: 3,
                roomId: 'general',
                userId: 'current',
                username: 'You',
                content: 'Great! Just working on some new features',
                timestamp: Date.now() - 120000,
                type: 'text'
            }
        ];
    }

    bindEvents() {
        // Message input events
        this.messageInput.addEventListener('input', this.handleTyping.bind(this));
        this.messageInput.addEventListener('keypress', this.handleKeyPress.bind(this));
        this.sendBtn.addEventListener('click', this.sendMessage.bind(this));
        
        // Scroll events
        this.messagesContainer.addEventListener('scroll', this.handleScroll.bind(this));
        this.scrollToBottomBtn.addEventListener('click', this.scrollToBottom.bind(this));
        
        // Button events
        this.createRoomBtn.addEventListener('click', this.handleCreateRoom.bind(this));
        this.newChatBtn.addEventListener('click', this.handleNewChat.bind(this));
        this.joinRoomBtn.addEventListener('click', this.handleJoinRoom.bind(this));
        this.attachBtn.addEventListener('click', this.handleAttachment.bind(this));
        this.emojiBtn.addEventListener('click', this.handleEmoji.bind(this));
        this.voiceBtn.addEventListener('click', this.handleVoice.bind(this));
        this.searchBtn.addEventListener('click', this.handleSearch.bind(this));
        
        // Panel events
        document.addEventListener('panelChange', this.handlePanelChange.bind(this));
        document.addEventListener('pullRefresh', this.handlePullRefresh.bind(this));
        
        // Chat list click events
        this.chatsList.addEventListener('click', this.handleChatSelect.bind(this));
        
        // Visibility change to handle app state
        document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    }

    async checkAuth() {
        try {
            // Simulate auth check
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // Mock user data
            this.currentUser = {
                id: 'current',
                username: 'You',
                avatar: '/default-avatar.png'
            };
            
            this.showChat();
            this.loadInitialData();
        } catch (error) {
            console.error('Auth failed:', error);
            // Handle auth failure
        }
    }

    showChat() {
        this.loginScreen.classList.add('hidden');
        this.mobileContainer.classList.remove('hidden');
    }

    loadInitialData() {
        // Load chats list
        this.renderChatsList();
        
        // Show welcome screen initially
        this.showWelcome();
    }

    renderChatsList() {
        this.chatsList.innerHTML = '';
        
        this.sampleRooms.forEach(room => {
            const chatElement = this.createChatListItem(room);
            this.chatsList.appendChild(chatElement);
        });
    }

    createChatListItem(room) {
        const div = document.createElement('div');
        div.className = 'p-3 bg-surface-lighter rounded-xl cursor-pointer hover:bg-slate-700 transition-colors';
        div.dataset.roomId = room.id;
        
        const timeAgo = this.formatTimeAgo(room.timestamp);
        const unreadBadge = room.unread > 0 ? 
            `<div class="bg-primary text-white text-xs font-bold px-2 py-1 rounded-full">${room.unread}</div>` : '';
        
        const iconClass = room.type === 'room' ? 'group' : 'person';
        const iconColor = room.type === 'room' ? 'from-primary to-blue-400' : 'from-green-400 to-green-600';
        
        div.innerHTML = `
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-gradient-to-tr ${iconColor} flex items-center justify-center">
                    <span class="material-symbols-outlined text-white text-[18px]">${iconClass}</span>
                </div>
                <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between">
                        <h4 class="text-sm font-medium text-white truncate">${room.name}</h4>
                        <span class="text-xs text-slate-400">${timeAgo}</span>
                    </div>
                    <p class="text-xs text-slate-400 truncate">${room.lastMessage}</p>
                </div>
                ${unreadBadge}
            </div>
        `;
        
        return div;
    }

    handleChatSelect(e) {
        const chatItem = e.target.closest('[data-room-id]');
        if (!chatItem) return;
        
        const roomId = chatItem.dataset.roomId;
        const room = this.sampleRooms.find(r => r.id === roomId);
        
        if (room) {
            this.joinRoom(room);
            // Close right panel after selection
            window.mobileChatSwipe?.showPanel('main');
        }
    }

    joinRoom(room) {
        this.currentRoom = room;
        
        // Update header
        this.currentRoomName.textContent = room.name;
        this.currentRoomStatus.textContent = room.type === 'room' ? 
            `${room.members.length} members` : 'Direct Message';
        
        // Update left panel
        this.leftRoomName.textContent = room.name;
        this.leftRoomStatus.textContent = room.type === 'room' ? 
            `${room.members.length} members online` : 'Direct Message';
        
        // Load messages
        this.loadMessages(room.id);
        
        // Update room members in left panel
        this.renderRoomMembers(room.members);
        
        // Hide welcome message and show messages
        this.welcomeMessage.classList.add('hidden');
        this.messagesList.classList.remove('hidden');
        
        // Mark as read
        room.unread = 0;
        this.renderChatsList();
        
        // Focus message input
        this.messageInput.focus();
    }

    loadMessages(roomId) {
        const roomMessages = this.sampleMessages.filter(msg => msg.roomId === roomId);
        this.messages = roomMessages;
        this.renderMessages();
        this.scrollToBottom();
    }

    renderMessages() {
        this.messagesList.innerHTML = '';
        
        this.messages.forEach(message => {
            const messageElement = this.createMessageElement(message);
            this.messagesList.appendChild(messageElement);
        });
    }

    createMessageElement(message) {
        const div = document.createElement('div');
        const isOwn = message.userId === 'current';
        const timeStr = this.formatTime(message.timestamp);
        
        div.className = `flex ${isOwn ? 'justify-end' : 'justify-start'} mb-3`;
        
        div.innerHTML = `
            <div class="message-bubble ${isOwn ? 'own' : 'other'} px-4 py-2 rounded-2xl max-w-[85%]">
                ${!isOwn ? `<div class="text-xs font-medium text-primary mb-1">${message.username}</div>` : ''}
                <div class="text-sm text-white">${this.escapeHtml(message.content)}</div>
                <div class="text-xs ${isOwn ? 'text-blue-200' : 'text-slate-400'} mt-1">${timeStr}</div>
            </div>
        `;
        
        return div;
    }

    renderRoomMembers(members) {
        this.leftRoomMembers.innerHTML = '';
        
        members.forEach(member => {
            const memberElement = document.createElement('div');
            memberElement.className = 'flex items-center gap-3 p-2 rounded-lg hover:bg-surface-hover transition-colors';
            
            memberElement.innerHTML = `
                <div class="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <span class="material-symbols-outlined text-primary text-[16px]">person</span>
                </div>
                <div class="flex-1">
                    <div class="text-sm font-medium text-white">${member}</div>
                    <div class="text-xs text-green-400">online</div>
                </div>
                <div class="w-2 h-2 bg-green-400 rounded-full"></div>
            `;
            
            this.leftRoomMembers.appendChild(memberElement);
        });
    }

    showWelcome() {
        this.welcomeMessage.classList.remove('hidden');
        this.messagesList.classList.add('hidden');
        this.currentRoomName.textContent = 'Select a chat';
        this.currentRoomStatus.textContent = '';
    }

    handleTyping() {
        if (!this.currentRoom) return;
        
        clearTimeout(this.typingTimer);
        
        if (!this.isTyping) {
            this.isTyping = true;
            this.sendTypingStatus(true);
        }
        
        this.typingTimer = setTimeout(() => {
            this.isTyping = false;
            this.sendTypingStatus(false);
        }, 2000);
    }

    handleKeyPress(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            this.sendMessage();
        }
    }

    sendMessage() {
        const content = this.messageInput.value.trim();
        if (!content || !this.currentRoom) return;
        
        const message = {
            id: Date.now(),
            roomId: this.currentRoom.id,
            userId: 'current',
            username: 'You',
            content: content,
            timestamp: Date.now(),
            type: 'text'
        };
        
        // Add to messages
        this.messages.push(message);
        this.sampleMessages.push(message);
        
        // Update room's last message
        this.currentRoom.lastMessage = content;
        this.currentRoom.timestamp = message.timestamp;
        
        // Clear input
        this.messageInput.value = '';
        
        // Re-render
        this.renderMessages();
        this.renderChatsList();
        this.scrollToBottom();
        
        // Simulate API call
        this.simulateMessageSent(message);
        
        // Add haptic feedback if available
        if (navigator.vibrate) {
            navigator.vibrate(50);
        }
    }

    simulateMessageSent(message) {
        // Simulate response after delay
        setTimeout(() => {
            if (Math.random() > 0.7) { // 30% chance of response
                this.simulateIncomingMessage();
            }
        }, 2000 + Math.random() * 3000);
    }

    simulateIncomingMessage() {
        if (!this.currentRoom) return;
        
        const responses = [
            'That sounds great!',
            'I agree 👍',
            'Thanks for sharing',
            'Interesting point',
            'Let me think about that',
            'Good idea!',
            '😄'
        ];
        
        const senders = this.currentRoom.members.filter(m => m !== 'You');
        const sender = senders[Math.floor(Math.random() * senders.length)] || 'Bot';
        
        const message = {
            id: Date.now() + Math.random(),
            roomId: this.currentRoom.id,
            userId: 'other',
            username: sender,
            content: responses[Math.floor(Math.random() * responses.length)],
            timestamp: Date.now(),
            type: 'text'
        };
        
        this.messages.push(message);
        this.sampleMessages.push(message);
        
        // Update UI
        this.renderMessages();
        
        // Show notification if not at bottom
        if (!this.isScrolledToBottom) {
            this.unreadCount++;
            this.updateUnreadBadge();
        } else {
            this.scrollToBottom();
        }
        
        // Show typing indicator briefly before message
        this.showTypingIndicator(sender);
        setTimeout(() => {
            this.hideTypingIndicator();
        }, 1000);
        
        // Add notification sound/vibration
        if (navigator.vibrate) {
            navigator.vibrate([200, 100, 200]);
        }
    }

    handleScroll() {
        const container = this.messagesContainer;
        const threshold = 100;
        
        this.isScrolledToBottom = 
            container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
        
        // Show/hide scroll to bottom button
        if (this.isScrolledToBottom && this.unreadCount > 0) {
            this.unreadCount = 0;
            this.updateUnreadBadge();
        }
        
        this.updateScrollButton();
    }

    updateScrollButton() {
        if (this.isScrolledToBottom && this.unreadCount === 0) {
            this.scrollToBottomBtn.classList.add('hidden');
        } else {
            this.scrollToBottomBtn.classList.remove('hidden');
        }
    }

    updateUnreadBadge() {
        if (this.unreadCount > 0) {
            this.unreadBadge.textContent = this.unreadCount;
            this.unreadBadge.classList.remove('hidden');
        } else {
            this.unreadBadge.classList.add('hidden');
        }
    }

    scrollToBottom() {
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
        this.isScrolledToBottom = true;
        this.updateScrollButton();
    }

    showTypingIndicator(username) {
        this.typingText.textContent = `${username} is typing...`;
        this.typingIndicator.classList.remove('hidden');
    }

    hideTypingIndicator() {
        this.typingIndicator.classList.add('hidden');
    }

    sendTypingStatus(isTyping) {
        // In a real app, this would send to the server
        console.log('Typing status:', isTyping);
    }

    // Event handlers for buttons
    handleCreateRoom() {
        this.showCreateRoomModal();
    }

    handleNewChat() {
        this.showNewChatModal();
    }

    handleJoinRoom() {
        this.showJoinRoomModal();
    }

    handleAttachment() {
        this.showAttachmentMenu();
    }

    handleEmoji() {
        this.showEmojiPicker();
    }

    handleVoice() {
        this.startVoiceRecording();
    }

    handleSearch() {
        this.showSearchModal();
    }

    handlePanelChange(e) {
        const { panel } = e.detail;
        console.log('Panel changed to:', panel);
        
        // Handle panel-specific logic
        if (panel === 'main') {
            // Focus message input when returning to main
            setTimeout(() => {
                if (this.currentRoom) {
                    this.messageInput.focus();
                }
            }, 300);
        }
    }

    handlePullRefresh() {
        console.log('Refreshing messages...');
        
        // Simulate refresh
        setTimeout(() => {
            if (this.currentRoom) {
                this.loadMessages(this.currentRoom.id);
            }
            
            // Show brief success message
            this.showToast('Messages refreshed');
        }, 1000);
    }

    handleVisibilityChange() {
        if (!document.hidden) {
            // App became visible - refresh if needed
            console.log('App became visible');
        }
    }

    // Utility methods
    formatTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    formatTimeAgo(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;
        
        if (diff < 60000) return 'now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
        return `${Math.floor(diff / 86400000)}d`;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showToast(message) {
        // Simple toast implementation
        const toast = document.createElement('div');
        toast.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 bg-surface-dark text-white px-4 py-2 rounded-lg shadow-lg z-50 transition-opacity';
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, 2000);
    }

    // Modal methods (placeholders)
    showCreateRoomModal() {
        console.log('Show create room modal');
    }

    showNewChatModal() {
        console.log('Show new chat modal');
    }

    showJoinRoomModal() {
        console.log('Show join room modal');
    }

    showAttachmentMenu() {
        console.log('Show attachment menu');
    }

    showEmojiPicker() {
        console.log('Show emoji picker');
    }

    showSearchModal() {
        console.log('Show search modal');
    }

    startVoiceRecording() {
        console.log('Start voice recording');
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.mobileChat = new MobileChat();
});

// Export for use in other modules
window.MobileChat = MobileChat;