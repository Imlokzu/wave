/**
 * Unit Tests for MobileChatList Component
 * Requirements: 1.1, 1.5, 2.5, 10.2
 */

// Mock DOM environment
function setupDOM() {
    const container = document.createElement('div');
    container.id = 'test-chat-list';
    document.body.appendChild(container);
    return container;
}

function teardownDOM() {
    const container = document.getElementById('test-chat-list');
    if (container) {
        document.body.removeChild(container);
    }
}

// Mock Socket Manager
class MockSocketManager {
    constructor() {
        this.handlers = {};
    }
    
    on(event, handler) {
        if (!this.handlers[event]) {
            this.handlers[event] = [];
        }
        this.handlers[event].push(handler);
    }
    
    emit(event, data) {
        console.log('[MockSocket] Emit:', event, data);
    }
    
    send(event, data) {
        console.log('[MockSocket] Send:', event, data);
    }
    
    trigger(event, data) {
        if (this.handlers[event]) {
            this.handlers[event].forEach(handler => handler(data));
        }
    }
}

// Mock API Client
class MockAPIClient {
    async request(endpoint, options) {
        return { success: true };
    }
}

// Test Suite
describe('MobileChatList', () => {
    let chatList;
    let mockSocket;
    let mockApi;
    let container;
    
    beforeEach(() => {
        // Setup
        container = setupDOM();
        mockSocket = new MockSocketManager();
        mockApi = new MockAPIClient();
        
        // Mock localStorage
        localStorage.setItem('username', 'testuser');
        localStorage.setItem('userId', 'test-user-id');
        
        // Create instance
        chatList = new MobileChatList('test-chat-list', mockSocket, mockApi);
    });
    
    afterEach(() => {
        // Cleanup
        if (chatList) {
            chatList.destroy();
        }
        teardownDOM();
        localStorage.clear();
    });
    
    describe('Constructor', () => {
        test('should initialize with required parameters', () => {
            expect(chatList).toBeDefined();
            expect(chatList.socketManager).toBe(mockSocket);
            expect(chatList.apiClient).toBe(mockApi);
        });
        
        test('should throw error if socketManager is missing', () => {
            expect(() => {
                new MobileChatList('test-chat-list', null, mockApi);
            }).toThrow('socketManager is required');
        });
        
        test('should throw error if apiClient is missing', () => {
            expect(() => {
                new MobileChatList('test-chat-list', mockSocket, null);
            }).toThrow('apiClient is required');
        });
        
        test('should initialize with default state', () => {
            expect(chatList.state.conversations).toEqual([]);
            expect(chatList.state.rooms).toEqual([]);
            expect(chatList.state.activeTab).toBe('dms');
            expect(chatList.state.searchQuery).toBe('');
            expect(chatList.state.unreadCounts).toEqual({});
        });
    });
    
    describe('Tab Switching', () => {
        test('should switch to DMs tab', () => {
            chatList.setState({ activeTab: 'rooms' });
            chatList.onTabSwitch('dms');
            expect(chatList.state.activeTab).toBe('dms');
        });
        
        test('should switch to Rooms tab', () => {
            chatList.onTabSwitch('rooms');
            expect(chatList.state.activeTab).toBe('rooms');
        });
        
        test('should clear search query when switching tabs', () => {
            chatList.setState({ searchQuery: 'test' });
            chatList.onTabSwitch('rooms');
            expect(chatList.state.searchQuery).toBe('');
        });
        
        test('should not switch to invalid tab', () => {
            const originalTab = chatList.state.activeTab;
            chatList.onTabSwitch('invalid');
            expect(chatList.state.activeTab).toBe(originalTab);
        });
    });
    
    describe('Search Filtering', () => {
        beforeEach(() => {
            // Add test data
            chatList.state.conversations = [
                { id: 'dm-1', name: 'Alice', otherUsername: 'alice' },
                { id: 'dm-2', name: 'Bob', otherUsername: 'bob' },
                { id: 'dm-3', name: 'Charlie', otherUsername: 'charlie' }
            ];
            chatList.state.rooms = [
                { id: 'room-1', name: 'General', code: 'GEN123' },
                { id: 'room-2', name: 'Random', code: 'RND456' }
            ];
        });
        
        test('should return all conversations when query is empty', () => {
            chatList.setState({ activeTab: 'dms' });
            const filtered = chatList.filterConversations('');
            expect(filtered.length).toBe(3);
        });
        
        test('should filter DMs by name', () => {
            chatList.setState({ activeTab: 'dms' });
            const filtered = chatList.filterConversations('alice');
            expect(filtered.length).toBe(1);
            expect(filtered[0].name).toBe('Alice');
        });
        
        test('should filter DMs by username (case-insensitive)', () => {
            chatList.setState({ activeTab: 'dms' });
            const filtered = chatList.filterConversations('BOB');
            expect(filtered.length).toBe(1);
            expect(filtered[0].otherUsername).toBe('bob');
        });
        
        test('should filter rooms by name', () => {
            chatList.setState({ activeTab: 'rooms' });
            const filtered = chatList.filterConversations('general');
            expect(filtered.length).toBe(1);
            expect(filtered[0].name).toBe('General');
        });
        
        test('should filter rooms by code', () => {
            chatList.setState({ activeTab: 'rooms' });
            const filtered = chatList.filterConversations('RND');
            expect(filtered.length).toBe(1);
            expect(filtered[0].code).toBe('RND456');
        });
        
        test('should return empty array when no matches found', () => {
            chatList.setState({ activeTab: 'dms' });
            const filtered = chatList.filterConversations('nonexistent');
            expect(filtered.length).toBe(0);
        });
    });
    
    describe('Unread Count Management', () => {
        test('should update unread count for conversation', () => {
            chatList.state.conversations = [
                { id: 'dm-1', name: 'Alice', unreadCount: 0 }
            ];
            
            chatList.updateUnreadCount('dm-1', 5);
            
            expect(chatList.state.unreadCounts['dm-1']).toBe(5);
            expect(chatList.state.conversations[0].unreadCount).toBe(5);
        });
        
        test('should update unread count for room', () => {
            chatList.state.rooms = [
                { id: 'room-1', name: 'General', unreadCount: 0 }
            ];
            
            chatList.updateUnreadCount('room-1', 3);
            
            expect(chatList.state.unreadCounts['room-1']).toBe(3);
            expect(chatList.state.rooms[0].unreadCount).toBe(3);
        });
        
        test('should clear unread count when set to 0', () => {
            chatList.state.conversations = [
                { id: 'dm-1', name: 'Alice', unreadCount: 5 }
            ];
            
            chatList.updateUnreadCount('dm-1', 0);
            
            expect(chatList.state.conversations[0].unreadCount).toBe(0);
        });
    });
    
    describe('Real-time Updates', () => {
        test('should handle new DM message', () => {
            const dmData = {
                fromUsername: 'alice',
                toUsername: 'testuser',
                message: {
                    id: 'msg-1',
                    content: 'Hello!',
                    timestamp: new Date().toISOString(),
                    senderId: 'alice-id'
                }
            };
            
            mockSocket.trigger('dm:received', dmData);
            
            expect(chatList.state.conversations.length).toBe(1);
            expect(chatList.state.conversations[0].otherUsername).toBe('alice');
            expect(chatList.state.conversations[0].unreadCount).toBe(1);
        });
        
        test('should update existing DM conversation', () => {
            // Add initial conversation
            chatList.state.conversations = [
                {
                    id: 'dm-alice',
                    otherUsername: 'alice',
                    name: 'alice',
                    unreadCount: 0
                }
            ];
            
            const dmData = {
                fromUsername: 'alice',
                toUsername: 'testuser',
                message: {
                    id: 'msg-2',
                    content: 'New message',
                    timestamp: new Date().toISOString(),
                    senderId: 'alice-id'
                }
            };
            
            mockSocket.trigger('dm:received', dmData);
            
            expect(chatList.state.conversations.length).toBe(1);
            expect(chatList.state.conversations[0].unreadCount).toBe(1);
            expect(chatList.state.conversations[0].lastMessage.content).toBe('New message');
        });
        
        test('should handle room joined event', () => {
            const roomData = {
                roomId: 'room-123',
                roomCode: 'ABC123',
                roomName: 'Test Room'
            };
            
            mockSocket.trigger('room:joined', roomData);
            
            expect(chatList.state.rooms.length).toBe(1);
            expect(chatList.state.rooms[0].id).toBe('room-123');
            expect(chatList.state.rooms[0].code).toBe('ABC123');
        });
        
        test('should not duplicate rooms on multiple join events', () => {
            const roomData = {
                roomId: 'room-123',
                roomCode: 'ABC123',
                roomName: 'Test Room'
            };
            
            mockSocket.trigger('room:joined', roomData);
            mockSocket.trigger('room:joined', roomData);
            
            expect(chatList.state.rooms.length).toBe(1);
        });
        
        test('should handle room left event', () => {
            chatList.state.rooms = [
                { id: 'room-123', name: 'Test Room' }
            ];
            
            mockSocket.trigger('room:user:left', { roomId: 'room-123' });
            
            expect(chatList.state.rooms.length).toBe(0);
        });
    });
    
    describe('Chat Selection', () => {
        test('should emit chat:selected event', (done) => {
            container.addEventListener('chat:selected', (e) => {
                expect(e.detail.chatId).toBe('dm-1');
                done();
            });
            
            chatList.onChatSelect('dm-1');
        });
        
        test('should clear unread count on selection', () => {
            chatList.state.conversations = [
                { id: 'dm-1', name: 'Alice', unreadCount: 5 }
            ];
            
            chatList.onChatSelect('dm-1');
            
            expect(chatList.state.conversations[0].unreadCount).toBe(0);
        });
    });
    
    describe('Rendering', () => {
        test('should render without errors', () => {
            expect(() => chatList.render()).not.toThrow();
        });
        
        test('should render header with tabs', () => {
            chatList.render();
            const header = container.querySelector('.mobile-chat-list-header');
            expect(header).toBeTruthy();
        });
        
        test('should render search bar', () => {
            chatList.render();
            const searchBar = container.querySelector('.mobile-chat-search');
            expect(searchBar).toBeTruthy();
        });
        
        test('should render empty state for DMs', () => {
            chatList.setState({ activeTab: 'dms', conversations: [] });
            chatList.render();
            const listItems = container.querySelector('.mobile-chat-list-items');
            expect(listItems.textContent).toContain('No direct messages yet');
        });
        
        test('should render empty state for Rooms', () => {
            chatList.setState({ activeTab: 'rooms', rooms: [] });
            chatList.render();
            const listItems = container.querySelector('.mobile-chat-list-items');
            expect(listItems.textContent).toContain('No rooms joined yet');
        });
        
        test('should render conversation items', () => {
            chatList.state.conversations = [
                { 
                    id: 'dm-1', 
                    name: 'Alice', 
                    otherUsername: 'alice',
                    timestamp: new Date(),
                    unreadCount: 0
                }
            ];
            chatList.setState({ activeTab: 'dms' });
            chatList.render();
            
            const items = container.querySelectorAll('.mobile-chat-item');
            expect(items.length).toBe(1);
        });
        
        test('should display unread badge when count > 0', () => {
            chatList.state.conversations = [
                { 
                    id: 'dm-1', 
                    name: 'Alice', 
                    otherUsername: 'alice',
                    timestamp: new Date(),
                    unreadCount: 3
                }
            ];
            chatList.setState({ activeTab: 'dms' });
            chatList.render();
            
            const badge = container.querySelector('.mobile-chat-unread-badge');
            expect(badge).toBeTruthy();
            expect(badge.textContent).toBe('3');
        });
    });
    
    describe('Load Conversations', () => {
        test('should load conversations from localStorage', async () => {
            const testConversations = [
                { id: 'dm-1', name: 'Alice' }
            ];
            localStorage.setItem('dm_conversations', JSON.stringify(testConversations));
            
            await chatList.loadConversations();
            
            expect(chatList.state.conversations).toEqual(testConversations);
        });
        
        test('should load rooms from localStorage', async () => {
            const testRooms = [
                { id: 'room-1', name: 'General' }
            ];
            localStorage.setItem('joined_rooms', JSON.stringify(testRooms));
            
            await chatList.loadConversations();
            
            expect(chatList.state.rooms).toEqual(testRooms);
        });
        
        test('should handle missing localStorage data', async () => {
            localStorage.clear();
            
            await chatList.loadConversations();
            
            expect(chatList.state.conversations).toEqual([]);
            expect(chatList.state.rooms).toEqual([]);
        });
    });
});

// Run tests if in test environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MockSocketManager, MockAPIClient };
}
