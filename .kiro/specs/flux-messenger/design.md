# Design Document

## Overview

Flux is a lightweight, ephemeral messaging backend built with Node.js, Express, and Socket.IO. The architecture prioritizes simplicity and safety for small group communication without traditional authentication. The system uses an in-memory store with optional SQLite persistence, automatic message expiration, and real-time WebSocket communication.

## Architecture

### High-Level Architecture

```
┌─────────────┐
│   Client    │
│  (Browser)  │
└──────┬──────┘
       │
       │ HTTP/REST + WebSocket
       │
┌──────▼──────────────────────┐
│   Express Server            │
│   - REST API Routes         │
│   - Socket.IO Handler       │
└──────┬──────────────────────┘
       │
       ├─────────┬─────────────┐
       │         │             │
┌──────▼─────┐ ┌▼──────────┐ ┌▼─────────────┐
│   Room     │ │  Message  │ │   Storage    │
│  Manager   │ │  Manager  │ │   Layer      │
└────────────┘ └───────────┘ └──────────────┘
                                     │
                          ┌──────────┴──────────┐
                          │                     │
                    ┌─────▼─────┐      ┌───────▼──────┐
                    │  In-Memory│      │   SQLite     │
                    │   Store   │      │  (Optional)  │
                    └───────────┘      └──────────────┘
```

### Technology Stack

- **Runtime**: Node.js (v18+)
- **Web Framework**: Express.js
- **WebSocket**: Socket.IO (for real-time bidirectional communication)
- **Storage**: In-memory Map structures only (no database required)
- **Image Storage**: Supabase Storage for image uploads
- **Image Hosting**: BBImg API for additional image hosting (API details TBD)
- **AI Integration**: Free AI API (e.g., Hugging Face Inference API, or local Ollama)
- **Message Expiration**: Node.js timers with cleanup intervals

## Components and Interfaces

### 1. Room Manager

Manages room lifecycle, participant tracking, and room state.

```typescript
interface Room {
  id: string;
  code: string;
  createdAt: Date;
  maxUsers: number;
  participants: Map<string, Participant>;
  isLocked: boolean;
  moderators: Set<string>;
}

interface Participant {
  id: string;
  nickname: string;
  joinedAt: Date;
  socketId: string;
}

class RoomManager {
  createRoom(maxUsers: number): Room
  getRoom(roomId: string): Room | null
  getRoomByCode(code: string): Room | null
  addParticipant(roomId: string, participant: Participant): boolean
  removeParticipant(roomId: string, participantId: string): void
  lockRoom(roomId: string): void
  unlockRoom(roomId: string): void
  isRoomFull(roomId: string): boolean
  regenerateRoomCode(roomId: string, userId: string): string | null
  getPinnedMessages(roomId: string): Message[]
  getTypingUsers(roomId: string): TypingIndicator[]
  setTyping(roomId: string, userId: string, nickname: string): void
  clearTyping(roomId: string, userId: string): void
}
```

### 2. Message Manager

Handles message creation, storage, expiration, and retrieval.

```typescript
interface Message {
  id: string;
  roomId: string;
  senderId: string;
  senderNickname: string;
  content: string;
  type: 'normal' | 'system' | 'fake' | 'image' | 'ai' | 'poll' | 'file';
  timestamp: Date;
  expiresAt: Date | null;
  imageUrl?: string; // Supabase or BBImg URL for image messages
  fileUrl?: string; // URL for file uploads
  fileName?: string; // Original filename
  fileSize?: number; // File size in bytes
  spoofSource?: string; // For fake messages: 'Google', 'Wikipedia', etc.
  isEdited?: boolean; // Whether message has been edited
  editedAt?: Date; // Timestamp of last edit
  isDeleted?: boolean; // Whether message has been deleted
  deletedAt?: Date; // Timestamp of deletion
  isPinned?: boolean; // Whether message is pinned
  pinnedAt?: Date; // Timestamp when pinned
  reactions?: Map<string, Set<string>>; // emoji -> Set of user IDs
  pollData?: PollData; // Poll-specific data
}

interface PollData {
  question: string;
  options: PollOption[];
  allowMultiple: boolean;
  isClosed: boolean;
  closedAt?: Date;
}

interface PollOption {
  id: string;
  text: string;
  votes: Set<string>; // Set of user IDs who voted
}

interface Reaction {
  messageId: string;
  emoji: string;
  userId: string;
  timestamp: Date;
}

interface TypingIndicator {
  userId: string;
  nickname: string;
  roomId: string;
  timestamp: Date;
}

class MessageManager {
  createMessage(roomId: string, senderId: string, content: string, type: MessageType): Message
  createImageMessage(roomId: string, senderId: string, imageUrl: string): Message
  createFileMessage(roomId: string, senderId: string, fileUrl: string, fileName: string, fileSize: number): Message
  createPollMessage(roomId: string, senderId: string, pollData: PollData): Message
  getMessages(roomId: string): Message[]
  clearMessages(roomId: string, preserveSystem: boolean): void
  scheduleExpiration(message: Message): void
  injectFakeMessage(roomId: string, content: string, spoofSource: string): Message
  editMessage(messageId: string, newContent: string, userId: string): Message | null
  deleteMessage(messageId: string, userId: string, isModerator: boolean): boolean
  pinMessage(messageId: string, userId: string, isModerator: boolean): boolean
  unpinMessage(messageId: string, userId: string, isModerator: boolean): boolean
  addReaction(messageId: string, emoji: string, userId: string): boolean
  removeReaction(messageId: string, emoji: string, userId: string): boolean
  votePoll(messageId: string, optionId: string, userId: string): boolean
  closePoll(messageId: string, userId: string): boolean
}

### 4. Image Upload Service

Handles image uploads to Supabase and BBImg.

```typescript
interface ImageUploadService {
  uploadToSupabase(file: Buffer, filename: string): Promise<string>
  uploadToBBImg(file: Buffer): Promise<string>
  validateImage(file: Buffer, mimeType: string): boolean
}

class ImageUploader implements ImageUploadService {
  // Integration with Supabase Storage
  // Integration with BBImg API (details TBD)
}
```

### 5. AI Service Integration

Handles communication with free AI API for chat responses.

```typescript
interface AIService {
  sendMessage(prompt: string): Promise<string>
  isAvailable(): Promise<boolean>
}

class AIServiceAdapter implements AIService {
  // Integration with free AI API (Hugging Face or Ollama)
  // No authentication required
}
```

### 3. Storage Layer

Abstracts storage operations with in-memory and optional SQLite implementations.

```typescript
interface StorageAdapter {
  saveMessage(message: Message): Promise<void>
  getMessages(roomId: string): Promise<Message[]>
  deleteMessage(messageId: string): Promise<void>
  clearRoomMessages(roomId: string): Promise<void>
  saveRoom(room: Room): Promise<void>
  getRoom(roomId: string): Promise<Room | null>
}

class InMemoryStorage implements StorageAdapter {
  // Fast, ephemeral storage using Map structures
}

class SQLiteStorage implements StorageAdapter {
  // Optional persistent storage
}
```

### 4. REST API Routes

```typescript
// Room operations
POST   /api/rooms              - Create a new room
GET    /api/rooms/:code        - Get room info by code
POST   /api/rooms/:code/join   - Join a room
POST   /api/rooms/:id/leave    - Leave a room
POST   /api/rooms/:id/lock     - Lock room (moderator only)
POST   /api/rooms/:id/unlock   - Unlock room (moderator only)
POST   /api/rooms/:id/regenerate - Regenerate room code (moderator only)
GET    /api/rooms/:id/pinned   - Get pinned messages

// Message operations
GET    /api/rooms/:id/messages - Get room messages
POST   /api/rooms/:id/clear    - Clear all messages
POST   /api/rooms/:id/fake     - Inject fake message (demo mode)
POST   /api/rooms/:id/image    - Upload and send image message
POST   /api/rooms/:id/file     - Upload and send file message
POST   /api/rooms/:id/poll     - Create a poll
PUT    /api/messages/:id       - Edit a message
DELETE /api/messages/:id       - Delete a message
POST   /api/messages/:id/pin   - Pin a message (moderator only)
DELETE /api/messages/:id/pin   - Unpin a message (moderator only)
POST   /api/messages/:id/react - Add reaction to message
DELETE /api/messages/:id/react - Remove reaction from message
POST   /api/messages/:id/vote  - Vote in a poll
POST   /api/messages/:id/close - Close a poll

// Quick actions
POST   /api/rooms/:id/panic    - Panic button (local clear + disconnect)
POST   /api/rooms/:id/spoof    - Spoof button (inject fake message)
```

### 5. WebSocket Events

```typescript
// Client -> Server
'join:room'           - Join a room with nickname
'send:message'        - Send a message to room
'send:image'          - Send an image message
'send:file'           - Send a file message
'send:poll'           - Create a poll
'send:ai:message'     - Send message to AI bot
'edit:message'        - Edit a message
'delete:message'      - Delete a message
'pin:message'         - Pin a message
'unpin:message'       - Unpin a message
'add:reaction'        - Add emoji reaction to message
'remove:reaction'     - Remove emoji reaction
'vote:poll'           - Vote in a poll
'close:poll'          - Close a poll
'typing:start'        - User started typing
'typing:stop'         - User stopped typing
'leave:room'          - Leave current room
'clear:chat:local'    - Request local chat clear
'clear:chat:all'      - Clear chat for everyone
'action:panic'        - Panic button (clear + disconnect)
'action:spoof'        - Spoof button (fake message)

// Server -> Client
'room:joined'         - Confirmation of room join
'room:user:joined'    - Another user joined
'room:user:left'      - User left the room
'message:new'         - New message received
'message:edited'      - Message was edited
'message:deleted'     - Message was deleted
'message:pinned'      - Message was pinned
'message:unpinned'    - Message was unpinned
'message:image'       - New image message received
'message:file'        - New file message received
'message:poll'        - New poll message received
'message:ai'          - AI response received
'message:system'      - System message
'reaction:added'      - Reaction added to message
'reaction:removed'    - Reaction removed from message
'poll:voted'          - Poll vote updated
'poll:closed'         - Poll was closed
'typing:update'       - Typing indicators updated
'chat:cleared'        - Chat was cleared
'chat:cleared:local'  - Local chat cleared (panic)
'room:locked'         - Room locked notification
'room:unlocked'       - Room unlocked notification
'room:code:regenerated' - Room code was regenerated
'error'               - Error occurred
```

## Data Models

### Room Model

```typescript
{
  id: "uuid-v4",
  code: "ABC123",
  createdAt: "2025-12-17T10:00:00Z",
  maxUsers: 10,
  participants: Map<userId, Participant>,
  isLocked: false,
  moderators: Set<userId>
}
```

### Message Model

```typescript
{
  id: "uuid-v4",
  roomId: "room-uuid",
  senderId: "user-uuid",
  senderNickname: "Alice",
  content: "Hello everyone!",
  type: "normal",
  timestamp: "2025-12-17T10:05:00Z",
  expiresAt: "2025-12-17T10:35:00Z"
}
```

### Participant Model

```typescript
{
  id: "uuid-v4",
  nickname: "Alice",
  joinedAt: "2025-12-17T10:00:00Z",
  socketId: "socket-io-id"
}
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Valid join with nickname succeeds
*For any* room and any non-empty nickname, when a user attempts to join with that nickname, the user should be added to the room's participant list.
**Validates: Requirements 1.1, 1.2**

### Property 2: Empty nickname join rejection
*For any* string composed entirely of whitespace characters, when a user attempts to join a room with that nickname, the join request should be rejected and the room's participant list should remain unchanged.
**Validates: Requirements 1.3**

### Property 3: Join broadcasts system message
*For any* room and any valid user join, a system message indicating the user has joined should be created and marked with type='system'.
**Validates: Requirements 1.4**

### Property 4: Room code uniqueness
*For any* set of created rooms, each room should have a unique room code that differs from all other room codes.
**Validates: Requirements 2.1**

### Property 5: Capacity enforcement
*For any* room with maximum capacity N, after N users have joined, any additional join attempt should be rejected.
**Validates: Requirements 2.2, 2.4**

### Property 6: Leave removes participant
*For any* room and any participant in that room, when the participant leaves, they should no longer appear in the room's participant list and a system message should be generated.
**Validates: Requirements 2.3**

### Property 7: Room info accuracy
*For any* room, when querying room information, the returned participant count should equal the actual number of participants in the room.
**Validates: Requirements 2.5**

### Property 8: Message broadcast completeness
*For any* room with N participants, when a message is sent to that room, all N participants should receive the message.
**Validates: Requirements 3.1**

### Property 9: Non-expired message delivery
*For any* room, when a user joins, they should receive only messages where the current time is before the message's expiration time.
**Validates: Requirements 3.2**

### Property 10: Message ID uniqueness
*For any* set of created messages, each message should have a unique identifier that differs from all other message identifiers.
**Validates: Requirements 3.3**

### Property 11: Message expiration cleanup
*For any* message with an expiration time, after the expiration time has passed, the message should no longer exist in storage.
**Validates: Requirements 3.4, 8.1**

### Property 12: Locked room message rejection
*For any* locked room and any non-moderator user, when that user attempts to send a message, the message should be rejected.
**Validates: Requirements 3.5, 7.2**

### Property 13: Safety banner presence
*For any* newly created room, the room should contain a system message warning against sharing personal information.
**Validates: Requirements 4.1, 4.2**

### Property 14: System message type marking
*For any* system-generated message (join, leave, lock, unlock, clear), the message should have type='system'.
**Validates: Requirements 4.3**

### Property 15: Clear all deletes messages
*For any* room with messages, when clear chat for everyone is triggered, all non-system messages should be deleted from the room.
**Validates: Requirements 5.1**

### Property 16: Safety banner preservation
*For any* room, when messages are cleared for everyone, the safety banner system message should remain in the room.
**Validates: Requirements 5.3**

### Property 17: Clear generates confirmation
*For any* room, when a clear chat action completes, a system message confirming the action should be created.
**Validates: Requirements 5.4**

### Property 18: Fake message broadcast and type
*For any* fake message injected into a room, the message should be broadcast to all participants and marked with type='fake'.
**Validates: Requirements 6.1, 6.2**

### Property 19: Fake message non-persistence
*For any* fake message, when querying persistent storage, the fake message should not be present.
**Validates: Requirements 6.3**

### Property 20: Fake message ephemerality
*For any* room, when a user disconnects and reconnects, previously sent fake messages should not be included in the delivered message history.
**Validates: Requirements 6.4**

### Property 21: Lock sets read-only state
*For any* room, when a moderator locks the room, the room's isLocked property should be set to true.
**Validates: Requirements 7.1**

### Property 22: Lock-unlock round trip
*For any* room, when a moderator locks then immediately unlocks the room, non-moderator users should be able to send messages again.
**Validates: Requirements 7.3**

### Property 23: Lock state change broadcasts
*For any* room, when the lock state changes (lock or unlock), a system message should be broadcast to all participants.
**Validates: Requirements 7.4**

### Property 24: Global expiration application
*For any* system-level expiration configuration, all newly created messages should have an expiration time matching the configured duration.
**Validates: Requirements 8.2**

### Property 25: Storage disabled mode
*For any* system with storage disabled, when messages are created, they should only exist in memory and not be written to persistent storage.
**Validates: Requirements 8.3**

### Property 26: Silent expiration
*For any* message that expires, no deletion event should be broadcast to room participants.
**Validates: Requirements 8.4**

### Property 27: Structured error responses
*For any* API error condition, the error response should contain a structured object with an error message field.
**Validates: Requirements 9.3**

### Property 28: Message authorization requirement
*For any* WebSocket client, when attempting to send a message without first joining a room, the operation should be rejected.
**Validates: Requirements 9.4**

### Property 29: Image format validation
*For any* uploaded image, the system should accept only JPEG, PNG, GIF, and WebP formats and reject all other file types.
**Validates: Requirements 10.1**

### Property 30: Image size limit enforcement
*For any* uploaded image, when the file size exceeds the maximum limit, the upload should be rejected.
**Validates: Requirements 10.2**

### Property 31: Image upload to Supabase
*For any* uploaded image, the image should be uploaded to Supabase storage and return a valid public URL.
**Validates: Requirements 10.3**

### Property 32: Image message broadcast
*For any* image message created, the message should be broadcast to all room participants with type='image' and contain the image URL.
**Validates: Requirements 10.4, 10.5**

### Property 33: Image expiration cleanup
*For any* image message with an expiration time, after expiration, the message reference should be removed from storage.
**Validates: Requirements 10.6**

### Property 34: AI message forwarding
*For any* message mentioning the AI bot, the message content should be forwarded to the AI service.
**Validates: Requirements 11.1**

### Property 35: AI response broadcast
*For any* AI service response, the response should be broadcast as a message with type='ai' and a distinct AI sender identifier.
**Validates: Requirements 11.2, 11.3**

### Property 36: AI unavailable handling
*For any* AI service request when the service is unavailable, a system message indicating the AI is offline should be sent.
**Validates: Requirements 11.4**

### Property 37: Panic button immediate action
*For any* user triggering the panic button, all messages should be cleared locally for that user and they should be disconnected within one second.
**Validates: Requirements 12.1, 12.5**

### Property 38: Panic button silent execution
*For any* panic button trigger, no notification should be broadcast to other room participants.
**Validates: Requirements 12.6**

### Property 39: Clear button global effect
*For any* user triggering the clear button, all messages in the room should be deleted for all participants.
**Validates: Requirements 12.2**

### Property 40: Spoof source identification
*For any* spoofed message, the message should be marked with type='fake' and include a recognizable spoofSource field (e.g., 'Google', 'Wikipedia').
**Validates: Requirements 12.3, 12.4**

### Property 41: Message edit updates content
*For any* message owned by a user, when that user edits the message, the content should be updated and the isEdited flag should be set to true.
**Validates: Requirements 13.1**

### Property 42: Edit broadcast completeness
*For any* room with N participants, when a message is edited, all N participants should receive the updated message.
**Validates: Requirements 13.2**

### Property 43: Edit authorization
*For any* message, when a user who is not the message owner attempts to edit it, the edit should be rejected.
**Validates: Requirements 13.3**

### Property 44: Edit indicator presence
*For any* edited message, the message object should contain both isEdited=true and an editedAt timestamp.
**Validates: Requirements 13.4**

### Property 45: Edit time limit enforcement
*For any* message older than 48 hours, edit attempts should be rejected.
**Validates: Requirements 13.5**

### Property 46: Message deletion removes from storage
*For any* message owned by a user, when that user deletes the message, it should be marked as deleted and the deletion should be broadcast.
**Validates: Requirements 14.1**

### Property 47: Deleted message placeholder
*For any* deleted message, the isDeleted flag should be set to true.
**Validates: Requirements 14.2**

### Property 48: Delete authorization with moderator override
*For any* message, when a non-owner non-moderator attempts to delete it, the deletion should be rejected; when a moderator attempts deletion, it should succeed.
**Validates: Requirements 14.3, 14.4**

### Property 49: Deleted message tombstone
*For any* deleted message, the message should have isDeleted=true and deletedAt timestamp.
**Validates: Requirements 14.5**

### Property 50: Reaction addition and storage
*For any* message and any emoji, when a user adds a reaction, the reaction should be stored in the message's reactions map and broadcast to all participants.
**Validates: Requirements 15.1**

### Property 51: Reaction removal round trip
*For any* message with a reaction, when the same user removes that reaction, the reaction should no longer exist in the message's reactions map.
**Validates: Requirements 15.2**

### Property 52: Reaction grouping and counting
*For any* message, when multiple users react with the same emoji, the reactions map should contain one entry for that emoji with multiple user IDs.
**Validates: Requirements 15.3**

### Property 53: Reaction display completeness
*For any* message with reactions, all unique emojis should be present in the reactions map with accurate user ID sets.
**Validates: Requirements 15.4**

### Property 54: Reaction user list accuracy
*For any* reaction on a message, the set of user IDs should match exactly the users who added that reaction.
**Validates: Requirements 15.5**

### Property 55: Pin message authorization and marking
*For any* message, when a moderator pins it, the message should have isPinned=true and pinnedAt timestamp.
**Validates: Requirements 16.1**

### Property 56: Pinned message retrieval
*For any* room, when querying pinned messages, only messages with isPinned=true should be returned.
**Validates: Requirements 16.2**

### Property 57: Unpin round trip
*For any* pinned message, when a moderator unpins it, the message should have isPinned=false.
**Validates: Requirements 16.3**

### Property 58: Pinned message chronological order
*For any* room with multiple pinned messages, the pinned messages should be ordered by pinnedAt timestamp.
**Validates: Requirements 16.4**

### Property 59: Pin authorization enforcement
*For any* message, when a non-moderator attempts to pin it, the operation should be rejected.
**Validates: Requirements 16.5**

### Property 60: Typing indicator broadcast
*For any* user in a room, when they start typing, a typing indicator should be broadcast to all other participants.
**Validates: Requirements 17.1**

### Property 61: Typing indicator timeout
*For any* typing indicator, after 3 seconds of inactivity, the indicator should be removed.
**Validates: Requirements 17.2**

### Property 62: Typing indicator cleared on send
*For any* user with an active typing indicator, when they send a message, their typing indicator should be immediately removed.
**Validates: Requirements 17.3**

### Property 63: Multiple typing indicators
*For any* room, when multiple users are typing, all their typing indicators should be present simultaneously.
**Validates: Requirements 17.4**

### Property 64: Typing indicator nickname display
*For any* typing indicator, it should contain the user's nickname.
**Validates: Requirements 17.5**

### Property 65: Poll creation and broadcast
*For any* poll message, when created, it should be broadcast to all room participants with type='poll'.
**Validates: Requirements 18.1**

### Property 66: Poll vote recording
*For any* poll option, when a user votes for it, the user's ID should be added to that option's votes set.
**Validates: Requirements 18.2**

### Property 67: Poll data completeness
*For any* poll message, the pollData should contain question, options array, and vote counts for each option.
**Validates: Requirements 18.3**

### Property 68: Poll vote uniqueness
*For any* poll, when a user attempts to vote multiple times, only their most recent vote should be recorded (or rejected if allowMultiple=false).
**Validates: Requirements 18.4**

### Property 69: Poll closure state
*For any* poll, when the creator closes it, the isClosed flag should be set to true and closedAt timestamp should be set.
**Validates: Requirements 18.5**

### Property 70: GIF file acceptance
*For any* uploaded GIF file, the system should accept it and create a message with type='image' or 'file'.
**Validates: Requirements 19.1**

### Property 71: Document file format validation
*For any* uploaded file, the system should accept PDF, DOC, DOCX, TXT, and ZIP formats and reject other formats.
**Validates: Requirements 19.2**

### Property 72: File size limit enforcement
*For any* uploaded file, when the size exceeds 10MB, the upload should be rejected.
**Validates: Requirements 19.3**

### Property 73: File message metadata storage
*For any* file message, it should contain fileUrl, fileName, and fileSize fields.
**Validates: Requirements 19.4**

### Property 74: File message display information
*For any* file message, the message object should contain all necessary fields for displaying download link and file information.
**Validates: Requirements 19.5**

### Property 75: Mention notification detection
*For any* message containing a user mention (e.g., @username), the system should identify the mentioned user.
**Validates: Requirements 21.4**

### Property 76: Room code regeneration uniqueness
*For any* room, when the code is regenerated, the new code should be unique and different from the old code.
**Validates: Requirements 22.1**

### Property 77: Old room code invalidation
*For any* room with a regenerated code, attempts to join using the old code should be rejected.
**Validates: Requirements 22.2**

### Property 78: Code regeneration broadcast
*For any* room with N participants, when the code is regenerated, all N participants should receive the update notification.
**Validates: Requirements 22.3**

### Property 79: Old code rejection after regeneration
*For any* regenerated room code, the old code should no longer resolve to the room.
**Validates: Requirements 22.4**

### Property 80: Regeneration preserves room data
*For any* room, when the code is regenerated, all existing participants and messages should remain unchanged.
**Validates: Requirements 22.5**

## Error Handling

### Error Categories

1. **Validation Errors** (400)
   - Empty nickname
   - Invalid room code format
   - Missing required fields

2. **Authorization Errors** (403)
   - Non-moderator attempting to lock/unlock room
   - Sending messages without joining room
   - Sending messages to locked room as non-moderator

3. **Resource Errors** (404)
   - Room not found
   - Message not found

4. **Capacity Errors** (409)
   - Room at maximum capacity
   - Duplicate nickname in room

5. **Server Errors** (500)
   - Storage failures
   - Unexpected exceptions

### Error Response Format

```typescript
{
  error: {
    code: string;
    message: string;
    details?: any;
  }
}
```

### Error Handling Strategy

- All errors should be caught and logged
- Client-facing errors should be sanitized (no stack traces)
- WebSocket errors should emit 'error' events to the client
- REST API errors should return appropriate HTTP status codes
- Critical errors should trigger graceful degradation (e.g., fall back to in-memory only)

## Testing Strategy

### Unit Testing

The system will use **Jest** as the testing framework for unit tests. Unit tests will cover:

- **Room Manager**: Room creation, participant management, capacity checks
- **Message Manager**: Message creation, expiration scheduling, fake message handling
- **Storage Layer**: CRUD operations for both in-memory and SQLite adapters
- **API Routes**: Request validation, response formatting, error handling
- **WebSocket Handlers**: Event handling, room broadcasting, connection management

Example unit tests:
- Creating a room returns a valid room object with unique code
- Adding a participant to a full room returns false
- Clearing messages preserves system messages
- Fake messages are marked with type='fake'

### Property-Based Testing

The system will use **fast-check** as the property-based testing library for JavaScript/TypeScript. Property-based tests will verify universal properties across randomly generated inputs.

**Configuration**: Each property-based test will run a minimum of 100 iterations to ensure thorough coverage of the input space.

**Tagging**: Each property-based test will include a comment explicitly referencing the correctness property from this design document using the format: `**Feature: flux-messenger, Property {number}: {property_text}**`

Property-based tests will cover:

- **Join Operations**: Testing with various nickname formats, room states, and capacity scenarios
- **Message Operations**: Testing with different message types, content, and expiration times
- **Room State Transitions**: Testing lock/unlock sequences, participant additions/removals
- **Message Expiration**: Testing with various expiration durations and timing scenarios
- **Fake Message Handling**: Testing injection, broadcasting, and non-persistence
- **Capacity Enforcement**: Testing with various room sizes and join patterns
- **Error Handling**: Testing with invalid inputs and edge cases

Example property-based tests:
- For any non-empty nickname and valid room, join should succeed (Property 1)
- For any whitespace-only nickname, join should be rejected (Property 2)
- For any room with N participants, broadcasting should reach all N (Property 8)
- For any message set, all message IDs should be unique (Property 10)

### Integration Testing

Integration tests will verify:
- REST API endpoints with real HTTP requests
- WebSocket event flows with real Socket.IO connections
- End-to-end message flows from send to receive
- Storage layer integration with both in-memory and SQLite

### Test Execution Strategy

1. Run unit tests first (fast feedback)
2. Run property-based tests (comprehensive coverage)
3. Run integration tests (full system validation)
4. All tests must pass before deployment

## Implementation Notes

### Message Expiration Implementation

Use a combination of:
1. **Lazy deletion**: Check expiration on retrieval
2. **Active cleanup**: Background interval (every 60 seconds) to remove expired messages
3. **Scheduled deletion**: Use `setTimeout` for individual message expiration

### Room Code Generation

- Use 6-character alphanumeric codes (uppercase)
- Check for uniqueness before returning
- Collision probability is low but handle gracefully

### WebSocket Connection Management

- Track socket-to-user mapping
- Handle disconnections gracefully (remove from participant list after timeout)
- Implement reconnection logic (allow rejoining with same user ID)

### Safety Considerations

- Rate limiting on message sending (prevent spam)
- Content length limits (prevent abuse)
- Room code complexity (prevent guessing)
- No PII storage (nicknames only, no emails/passwords)
- Automatic message expiration (default 30 minutes)

### Performance Considerations

- In-memory storage for active rooms (fast access)
- Lazy loading of message history
- Efficient broadcast using Socket.IO rooms
- Cleanup of empty rooms after inactivity
- Connection pooling for SQLite (if used)

### Configuration Options

```typescript
{
  messageExpirationMinutes: 30,
  maxRoomSize: 50,
  cleanupIntervalSeconds: 60,
  maxMessageLength: 2000,
  maxImageSizeMB: 5,
  rateLimitMessagesPerMinute: 30,
  aiServiceUrl: 'http://localhost:11434', // Ollama local or Hugging Face API
  aiModel: 'llama2', // or 'gpt2' for Hugging Face
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_KEY,
  supabaseBucket: 'flux-images',
  bbimgApiKey: process.env.BBIMG_API_KEY // TBD
}
```
