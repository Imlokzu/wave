/**
 * Flux Messenger Chat - Design Version
 * Connects the design HTML to the backend
 */

// Socket.IO connection
const socket = io();

// State
let currentRoom = null;
let currentUser = {
    nickname: localStorage.getItem('nickname') || 'Guest',
    username: localStorage.getItem('username') || 'Guest'
};

// DOM Elements
const messagesFeed = document.querySelector('.flex-1.overflow-y-auto.px-6');
const messageInput = document.querySelector('textarea');
const sendButton = document.querySelector('button:has(.material-symbols-outlined:contains("send"))');
const roomNameEl = document.querySelector('h1.text-lg');

// Initialize
async function init() {
    console.log('[Flux Chat] Initializing...');
    
    // Check if user has nickname
    if (!currentUser.nickname || currentUser.nickname === 'Guest') {
        window.location.href = '/design/login.html';
        return;
    }

    // Connect socket
    socket.on('connect', () => {
        console.log('[Flux Chat] Connected to server');
        
        // Register username
        socket.emit('register:username', {
            username: currentUser.username,
            nickname: currentUser.nickname
        });
    });

    // Check if should create or join room
    const urlParams = new URLSearchParams(window.location.search);
    const shouldCreate = urlParams.get('create') === 'true';
    const pendingRoomCode = localStorage.getItem('pendingRoomCode');

    if (shouldCreate) {
        // Create new room
        createRoom();
    } else if (pendingRoomCode) {
        // Join existing room
        joinRoom(pendingRoomCode);
        localStorage.removeItem('pendingRoomCode');
    }

    // Setup event listeners
    setupEventListeners();
    setupSocketListeners();
}

// Create new room
function createRoom() {
    console.log('[Flux Chat] Creating new room...');
    socket.emit('create:room', { nickname: currentUser.nickname });
}

// Join existing room
function joinRoom(roomCode) {
    console.log('[Flux Chat] Joining room:', roomCode);
    socket.emit('join:room', {
        roomCode: roomCode,
        nickname: currentUser.nickname
    });
}

// Setup event listeners
function setupEventListeners() {
    // Send message on button click
    const sendBtn = document.querySelector('button:has(span:contains("send"))');
    if (sendBtn) {
        sendBtn.addEventListener('click', sendMessage);
    }

    // Send message on Enter (Shift+Enter for new line)
    if (messageInput) {
        messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });

        // Auto-resize textarea
        messageInput.addEventListener('input', () => {
            messageInput.style.height = 'auto';
            messageInput.style.height = messageInput.scrollHeight + 'px';
        });
    }
}

// Setup socket listeners
function setupSocketListeners() {
    // Room joined
    socket.on('room:joined', (data) => {
        console.log('[Flux Chat] Joined room:', data);
        currentRoom = {
            id: data.roomId,
            code: data.roomCode
        };
        
        // Update UI
        if (roomNameEl) {
            roomNameEl.innerHTML = `
                Room ${data.roomCode}
                <span class="material-symbols-outlined text-primary text-sm">verified</span>
            `;
        }

        // Add system message
        addSystemMessage(`Welcome to the room! Room code: ${data.roomCode}`);
    });

    // Message received
    socket.on('message:received', (data) => {
        console.log('[Flux Chat] Message received:', data);
        addMessage(data);
    });

    // User joined
    socket.on('room:user:joined', (data) => {
        addSystemMessage(`${data.nickname} joined the room`);
    });

    // User left
    socket.on('room:user:left', (data) => {
        addSystemMessage(`${data.nickname} left the room`);
    });

    // Error
    socket.on('error', (error) => {
        console.error('[Flux Chat] Error:', error);
        alert(error.message || 'An error occurred');
    });
}

// Send message
function sendMessage() {
    if (!messageInput) return;
    
    const content = messageInput.value.trim();
    if (!content) return;

    if (!currentRoom) {
        alert('Please join a room first');
        return;
    }

    console.log('[Flux Chat] Sending message:', content);
    
    socket.emit('send:message', {
        roomId: currentRoom.id,
        content: content,
        nickname: currentUser.nickname
    });

    // Clear input
    messageInput.value = '';
    messageInput.style.height = 'auto';
}

// Add message to UI
function addMessage(data) {
    if (!messagesFeed) return;

    const isOwnMessage = data.senderNickname === currentUser.nickname;
    const time = new Date(data.timestamp).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit'
    });

    const messageHTML = isOwnMessage ? `
        <!-- Message: Self -->
        <div class="flex flex-row-reverse gap-4 max-w-3xl ml-auto">
            <div class="w-10 h-10 rounded-full bg-primary flex items-center justify-center shrink-0 mt-1">
                <span class="material-symbols-outlined text-white">person</span>
            </div>
            <div class="flex flex-col gap-1 items-end">
                <div class="flex items-baseline gap-2 flex-row-reverse">
                    <span class="text-sm font-bold text-white">You</span>
                    <span class="text-xs text-text-dim/50">${time}</span>
                </div>
                <div class="relative max-w-[85%] md:max-w-[60%] rounded-2xl rounded-tr-none px-5 py-3 bg-primary text-background-dark shadow-md shadow-primary/10">
                    <p class="text-[15px] font-medium leading-relaxed">${escapeHtml(data.content)}</p>
                </div>
            </div>
        </div>
    ` : `
        <!-- Message: Other -->
        <div class="flex gap-4 max-w-3xl">
            <div class="w-10 h-10 rounded-full bg-secondary-dark flex items-center justify-center shrink-0 mt-1">
                <span class="material-symbols-outlined text-primary">person</span>
            </div>
            <div class="flex flex-col gap-1">
                <div class="flex items-baseline gap-2">
                    <span class="text-sm font-bold text-white">${escapeHtml(data.senderNickname)}</span>
                    <span class="text-xs text-text-dim/50">${time}</span>
                </div>
                <div class="relative max-w-[85%] md:max-w-[60%] rounded-2xl rounded-tl-none px-5 py-3 bg-secondary-dark border border-accent-light/10 text-text-light shadow-md">
                    <p class="text-[15px] font-normal leading-relaxed">${escapeHtml(data.content)}</p>
                </div>
            </div>
        </div>
    `;

    // Remove typing indicator if exists
    const typingIndicator = messagesFeed.querySelector('.opacity-0.animate-\\[fadeIn');
    if (typingIndicator) {
        typingIndicator.remove();
    }

    // Add message
    messagesFeed.insertAdjacentHTML('beforeend', messageHTML);
    
    // Scroll to bottom
    messagesFeed.scrollTop = messagesFeed.scrollHeight;
}

// Add system message
function addSystemMessage(content) {
    if (!messagesFeed) return;

    const messageHTML = `
        <div class="flex justify-center w-full my-4">
            <div class="px-4 py-1 rounded-full bg-accent-light/10 border border-accent-light/20 backdrop-blur-sm">
                <p class="text-text-dim text-xs font-medium flex items-center gap-2">
                    <span class="material-symbols-outlined text-[14px]">info</span>
                    ${escapeHtml(content)}
                </p>
            </div>
        </div>
    `;

    messagesFeed.insertAdjacentHTML('beforeend', messageHTML);
    messagesFeed.scrollTop = messagesFeed.scrollHeight;
}

// Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
