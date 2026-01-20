# Chat Application Architecture

## Overview

This chat application follows clean architecture principles with clear separation of concerns. The frontend is organized into modular, testable components that communicate through well-defined interfaces.

## Architecture Layers

```
┌─────────────────────────────────────────┐
│            chat.html (View)             │
│         Presentation Layer Only         │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│          app.js (Controller)            │
│     Application Logic & Coordination    │
└─────────────────────────────────────────┘
         ↓          ↓          ↓
┌────────────┐ ┌──────────┐ ┌──────────┐
│   ui.js    │ │ state.js │ │socket.js │
│ DOM Manager│ │  State   │ │ WebSocket│
└────────────┘ └──────────┘ └──────────┘
                    ↓             ↓
              ┌──────────┐  ┌──────────┐
              │ api.js   │  │  Server  │
              │HTTP Client│  │ Socket.IO│
              └──────────┘  └──────────┘
                    ↓             ↓
              ┌─────────────────────┐
              │   Backend Server    │
              │  (Node.js/Express)  │
              └─────────────────────┘
```

## Module Responsibilities

### 1. api.js - HTTP API Client
**Purpose**: Centralized HTTP communication with backend REST API

**Responsibilities**:
- Make HTTP requests to backend endpoints
- Handle request/response formatting
- Centralized error handling
- Retry logic for failed requests

**Key Methods**:
- `createRoom()` - Create new chat room
- `getRoomInfo()` - Get room details
- `getMessages()` - Fetch message history
- `uploadImage()` - Upload image files
- `uploadVoice()` - Upload voice messages
- `editMessage()` - Edit existing message
- `deleteMessage()` - Delete message

**Usage**:
```javascript
try {
  const response = await api.createRoom(10);
  console.log('Room created:', response.data.code);
} catch (error) {
  console.error('Failed:', error.message);
}
```

### 2. socket.js - WebSocket Manager
**Purpose**: Manage real-time bidirectional communication

**Responsibilities**:
- Establish and maintain WebSocket connection
- Handle reconnection logic
- Queue messages when disconnected
- Forward events to application
- Manage connection state

**Key Methods**:
- `connect()` - Initialize connection
- `joinRoom()` - Join chat room
- `sendMessage()` - Send text message
- `editMessage()` - Edit message
- `deleteMessage()` - Delete message
- `startTyping()` / `stopTyping()` - Typing indicators
- `on()` / `off()` - Event subscription

**Events**:
- Connection: `connection:established`, `connection:lost`, `connection:reconnected`
- Room: `room:joined`, `room:user:joined`, `room:user:left`
- Messages: `message:new`, `message:edited`, `message:deleted`
- Typing: `typing:update`

**Usage**:
```javascript
socketManager.on('message:new', (message) => {
  console.log('New message:', message);
});

socketManager.sendMessage('Hello world!');
```

### 3. state.js - State Manager
**Purpose**: Centralized application state with reactive updates

**Responsibilities**:
- Store application state
- Notify subscribers of changes
- Provide state access methods
- Maintain state consistency

**State Structure**:
```javascript
{
  user: {
    id, username, nickname, isAuthenticated
  },
  room: {
    id, code, name, isLocked, participantCount
  },
  messages: [],
  ui: {
    screen, isTyping, typingUsers, editingMessageId, connectionStatus
  },
  error: null
}
```

**Key Methods**:
- `getState()` - Get entire state
- `get(path)` - Get specific value
- `setState(updates)` - Update state
- `subscribe(path, callback)` - Subscribe to changes
- `setUser()`, `setRoom()`, `addMessage()` - Convenience methods

**Usage**:
```javascript
// Subscribe to changes
state.subscribe('messages', (messages) => {
  console.log('Messages updated:', messages.length);
});

// Update state
state.addMessage(newMessage);
```

### 4. ui.js - UI Manager
**Purpose**: Handle all DOM manipulation and rendering

**Responsibilities**:
- Render messages to DOM
- Update UI elements
- Handle DOM events (delegated to controller)
- Manage UI state (editing, loading, etc.)
- Scroll management

**Key Methods**:
- `init()` - Initialize DOM references
- `showLogin()` / `showChat()` - Screen transitions
- `renderMessage()` - Render single message
- `updateMessage()` - Update existing message
- `removeMessage()` - Remove message from DOM
- `showError()` - Display error message
- `setSendButtonEditMode()` - Toggle edit mode

**Usage**:
```javascript
ui.renderMessage(message, currentUserId);
ui.showError('Connection failed');
ui.setSendButtonEditMode(true);
```

### 5. app.js - Application Controller
**Purpose**: Coordinate all modules and implement business logic

**Responsibilities**:
- Initialize all modules
- Handle user actions
- Coordinate between modules
- Implement business logic
- Error handling

**Key Methods**:
- `init()` - Initialize application
- `handleLogin()` - Process login
- `handleSendMessage()` - Send message
- `handleEditMessage()` - Edit message
- `handleDeleteMessage()` - Delete message
- `handleTyping()` - Typing indicator logic

**Flow Example**:
```
User clicks send button
  → app.handleSendMessage()
    → socketManager.sendMessage()
      → Server processes
        → socket event 'message:new'
          → state.addMessage()
            → state subscribers notified
              → ui.renderMessage()
```

## Data Flow

### Sending a Message
1. User types in input and clicks send
2. `app.handleSendMessage()` called
3. Get content from `ui.getMessageInput()`
4. Call `socketManager.sendMessage(content)`
5. Socket sends to server
6. Server broadcasts to all clients
7. Socket receives `message:new` event
8. `state.addMessage()` updates state
9. State subscribers notified
10. `ui.renderMessage()` adds to DOM

### Editing a Message
1. User hovers over own message, clicks edit
2. `ui.onEditClick()` → `app.handleEditMessage()`
3. `state.setEditingMessage(messageId)`
4. `ui.setMessageInput(content)` and `ui.setSendButtonEditMode(true)`
5. User edits and clicks send
6. `app.handleSendMessage()` detects edit mode
7. `socketManager.editMessage(messageId, content)`
8. Server processes and broadcasts
9. Socket receives `message:edited`
10. `state.updateMessage()` updates state
11. `ui.updateMessage()` re-renders

### Connection Loss & Recovery
1. Network disconnects
2. Socket emits `connection:lost`
3. `state.setConnectionStatus('disconnected')`
4. UI shows offline indicator
5. Messages queued in `socketManager.messageQueue`
6. Network reconnects
7. Socket emits `connection:reconnected`
8. `socketManager.flushMessageQueue()` sends queued messages
9. `state.setConnectionStatus('connected')`
10. UI shows online indicator

## Error Handling

### API Errors
```javascript
try {
  await api.createRoom();
} catch (error) {
  if (error instanceof APIError) {
    // Handle specific error codes
    if (error.code === 'ROOM_FULL') {
      ui.showError('Room is full');
    }
  }
}
```

### Socket Errors
```javascript
socketManager.on('error', (error) => {
  state.setError(error);
  ui.showError(error.message);
});
```

### State Errors
```javascript
state.subscribe('error', (error) => {
  if (error) {
    ui.showError(error.message);
  }
});
```

## Performance Considerations

### Message Rendering
- Messages rendered incrementally as they arrive
- No full re-render of message list
- Efficient DOM updates using `data-message-id` attributes

### Typing Indicators
- Debounced to prevent excessive socket events
- 300ms delay before sending "stopped typing"

### Connection Management
- Automatic reconnection with exponential backoff
- Message queueing during disconnection
- Duplicate message prevention using message IDs

### Memory Management
- Event listeners properly cleaned up
- Timers cleared on component unmount
- State reset on logout

## Testing Strategy

### Unit Tests
Each module can be tested independently:

```javascript
// Test API client
const mockFetch = jest.fn();
global.fetch = mockFetch;
await api.createRoom();
expect(mockFetch).toHaveBeenCalledWith('/api/rooms', ...);

// Test state manager
state.addMessage(message);
expect(state.get('messages')).toContain(message);

// Test UI manager
ui.renderMessage(message, userId);
expect(document.querySelector('[data-message-id]')).toBeTruthy();
```

### Integration Tests
Test module interactions:

```javascript
// Test message flow
socketManager.emit('message:new', message);
expect(state.get('messages')).toContain(message);
expect(ui.messageContainer.children.length).toBe(1);
```

## Extension Points

### Adding New Message Types
1. Update `Message` type in backend
2. Add rendering logic in `ui.createMessageElement()`
3. Add socket event handler in `socket.js`
4. Add state update in `app.js`

### Adding New Features
1. Add API method in `api.js` (if needed)
2. Add socket event in `socket.js` (if needed)
3. Add state properties in `state.js`
4. Add UI rendering in `ui.js`
5. Add coordination logic in `app.js`

### Adding Persistence
Replace in-memory state with:
- LocalStorage for offline support
- IndexedDB for large datasets
- Supabase real-time for cloud sync

## Security Considerations

### Frontend
- No secrets in client code
- All user input sanitized before rendering
- XSS prevention through proper DOM manipulation
- CSRF tokens for state-changing operations

### Backend Communication
- All API calls authenticated
- Socket connections validated
- Rate limiting on message sending
- File upload size limits enforced

## Future Improvements

1. **Virtual Scrolling**: For rooms with thousands of messages
2. **Message Pagination**: Load older messages on scroll
3. **Offline Support**: Queue messages when offline
4. **Service Worker**: For push notifications
5. **E2E Encryption**: For private messages
6. **Voice/Video Calls**: Integration with WebRTC
7. **File Sharing**: Drag-and-drop file uploads
8. **Rich Text**: Markdown or WYSIWYG editor
9. **Search**: Full-text message search
10. **Themes**: User-customizable themes

## Debugging

### Enable Debug Logging
```javascript
// In browser console
localStorage.setItem('debug', 'app:*,socket:*,api:*');
```

### Inspect State
```javascript
// In browser console
console.log(state.getState());
```

### Monitor Socket Events
```javascript
// In browser console
socketManager.socket.onAny((event, ...args) => {
  console.log('Socket event:', event, args);
});
```

### Check API Calls
```javascript
// In browser console
api.healthCheck().then(console.log);
```
