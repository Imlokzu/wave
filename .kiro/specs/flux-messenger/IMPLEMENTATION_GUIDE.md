# Flux Messenger - Implementation Guide

## Overview

This guide provides a roadmap for implementing the complete Flux Messenger system with Telegram-like features. The implementation is divided into phases for systematic development.

## Current Status

✅ **Completed:**
- Project structure and dependencies (Task 1)
- Core data models and types (Task 2)
- In-memory storage (Task 3)
- Room Manager with property tests (Task 4)
- Message Manager with property tests (Task 5)
- Image Upload Service (Task 6)
- REST API routes (Task 9)
- Main server entry point (Task 11)
- Utility functions (Task 12)

⏳ **In Progress:**
- AI Service Integration (Task 7)
- WebSocket handlers (Task 10)

🔜 **Upcoming:**
- Message editing & deletion (Task 14)
- Reactions system (Task 15)
- Message pinning (Task 16)
- Typing indicators (Task 17)
- Polls system (Task 18)
- File uploads (Task 19)
- Room code regeneration (Task 20)
- Extended REST API (Task 21)
- Extended WebSocket handlers (Task 22)
- Frontend UI updates (Task 24)

## Implementation Phases

### Phase 1: Core Messaging (COMPLETED)
- ✅ Basic room creation and joining
- ✅ Real-time message sending
- ✅ Image uploads
- ✅ Message expiration
- ✅ Fake messages (spoof feature)

### Phase 2: AI Integration (IN PROGRESS)
- ⏳ AI service connection
- ⏳ AI message handling
- ⏳ AI availability checking

### Phase 3: Advanced Messaging Features (NEXT)
- 🔜 Message editing with 48-hour limit
- 🔜 Message deletion with moderator override
- 🔜 Emoji reactions with grouping
- 🔜 Message pinning for moderators
- 🔜 Typing indicators with auto-timeout

### Phase 4: Interactive Features
- 🔜 Poll creation and voting
- 🔜 File uploads (PDF, DOC, TXT, ZIP)
- 🔜 GIF support
- 🔜 Room code regeneration

### Phase 5: User Experience
- 🔜 Theme customization
- 🔜 Notification controls
- 🔜 Mention detection
- 🔜 Enhanced UI components

## Key Features

### 1. Message Editing
- Users can edit their own messages within 48 hours
- Edited messages show an "edited" indicator
- Edit history is tracked with timestamps
- Property tests ensure authorization and time limits

### 2. Message Deletion
- Users can delete their own messages
- Moderators can delete any message
- Deleted messages show tombstone placeholders
- Property tests verify authorization rules

### 3. Reactions
- Users can react with emojis to any message
- Reactions are grouped by emoji type
- Click on reaction count to see who reacted
- Property tests ensure proper storage and grouping

### 4. Message Pinning
- Moderators can pin important messages
- Pinned messages appear in dedicated section
- Multiple pins shown chronologically
- Property tests verify moderator-only access

### 5. Typing Indicators
- Real-time "user is typing..." notifications
- Auto-clear after 3 seconds of inactivity
- Cleared immediately when message sent
- Property tests ensure proper timeout behavior

### 6. Polls
- Create polls with multiple options
- Users vote once per poll
- Real-time vote count updates
- Poll creator can close voting
- Property tests verify vote uniqueness

### 7. File Uploads
- Support for PDF, DOC, DOCX, TXT, ZIP files
- 10MB file size limit
- GIFs displayed inline
- File metadata stored (name, size, type)
- Property tests validate format and size limits

### 8. Room Code Regeneration
- Moderators can regenerate invite links
- Old codes become invalid
- Existing participants and messages preserved
- Property tests ensure data integrity

## Testing Strategy

### Property-Based Testing
- Using **fast-check** library
- Minimum 100 iterations per test
- 80 total correctness properties
- Tests cover all core functionality

### Test Coverage
- ✅ Room management (7 properties)
- ✅ Message operations (14 properties)
- ✅ Image handling (5 properties)
- ✅ Fake messages (3 properties)
- ✅ Room locking (3 properties)
- ✅ Message expiration (4 properties)
- 🔜 Message editing (5 properties)
- 🔜 Message deletion (4 properties)
- 🔜 Reactions (5 properties)
- 🔜 Pinning (5 properties)
- 🔜 Typing indicators (5 properties)
- 🔜 Polls (5 properties)
- 🔜 File uploads (5 properties)
- 🔜 Code regeneration (5 properties)

## Architecture

### Backend Stack
- **Runtime:** Node.js v18+
- **Framework:** Express.js
- **WebSocket:** Socket.IO
- **Storage:** In-memory (with optional Supabase)
- **Testing:** Jest + fast-check
- **Language:** TypeScript

### Frontend Stack
- **Framework:** Vanilla JavaScript
- **Styling:** Tailwind CSS
- **Icons:** Material Symbols
- **Fonts:** Spline Sans
- **Theme:** Dark + Green + White

### External Services
- **Image Storage:** Supabase Storage + ImgBB
- **File Storage:** Supabase Storage
- **AI Service:** Ollama (local) or Hugging Face API

## API Endpoints

### Room Operations
```
POST   /api/rooms              - Create room
GET    /api/rooms/:code        - Get room info
POST   /api/rooms/:code/join   - Join room
POST   /api/rooms/:id/leave    - Leave room
POST   /api/rooms/:id/lock     - Lock room
POST   /api/rooms/:id/unlock   - Unlock room
POST   /api/rooms/:id/regenerate - Regenerate code
GET    /api/rooms/:id/pinned   - Get pinned messages
```

### Message Operations
```
GET    /api/rooms/:id/messages - Get messages
POST   /api/rooms/:id/clear    - Clear all messages
POST   /api/rooms/:id/image    - Upload image
POST   /api/rooms/:id/file     - Upload file
POST   /api/rooms/:id/poll     - Create poll
PUT    /api/messages/:id       - Edit message
DELETE /api/messages/:id       - Delete message
POST   /api/messages/:id/pin   - Pin message
DELETE /api/messages/:id/pin   - Unpin message
POST   /api/messages/:id/react - Add reaction
DELETE /api/messages/:id/react - Remove reaction
POST   /api/messages/:id/vote  - Vote in poll
POST   /api/messages/:id/close - Close poll
```

### Quick Actions
```
POST   /api/rooms/:id/panic    - Panic button
POST   /api/rooms/:id/spoof    - Spoof button
POST   /api/rooms/:id/fake     - Inject fake message
```

## WebSocket Events

### Client → Server
```
join:room, send:message, send:image, send:file, send:poll
edit:message, delete:message, pin:message, unpin:message
add:reaction, remove:reaction, vote:poll, close:poll
typing:start, typing:stop, leave:room
clear:chat:local, clear:chat:all
action:panic, action:spoof
```

### Server → Client
```
room:joined, room:user:joined, room:user:left
message:new, message:edited, message:deleted
message:pinned, message:unpinned
message:image, message:file, message:poll
reaction:added, reaction:removed
poll:voted, poll:closed
typing:update, chat:cleared
room:locked, room:unlocked, room:code:regenerated
error
```

## Next Steps

1. **Complete AI Integration (Task 7)**
   - Implement AIService class
   - Add property tests for AI features
   - Test with Ollama or Hugging Face

2. **Finish WebSocket Handlers (Task 10)**
   - Complete all event handlers
   - Add remaining property tests
   - Test real-time communication

3. **Implement Advanced Features (Tasks 14-20)**
   - Follow task order for systematic development
   - Write property tests alongside implementation
   - Ensure all tests pass before moving forward

4. **Update Frontend UI (Task 24)**
   - Add UI components for all new features
   - Implement theme customization
   - Add notification controls

5. **Final Testing & Documentation (Tasks 25-26)**
   - Run complete test suite
   - Update documentation
   - Create deployment guide

## Development Tips

### Running Tests
```bash
npm test                    # Run all tests
npm test -- --watch        # Watch mode
npm test MessageManager    # Test specific file
```

### Starting Development Server
```bash
npm run dev                # Start with hot reload
npm run build             # Build for production
npm start                 # Start production server
```

### Environment Setup
```bash
cp .env.example .env      # Copy environment template
# Edit .env with your credentials
```

## Resources

- **Requirements:** `.kiro/specs/flux-messenger/requirements.md`
- **Design:** `.kiro/specs/flux-messenger/design.md`
- **Tasks:** `.kiro/specs/flux-messenger/tasks.md`
- **Deployment:** `DEPLOYMENT.md`
- **Features:** `FEATURES_IMPLEMENTATION.md`
- **Quick Start:** `QUICK_START.md`

## Support

For questions or issues during implementation:
1. Review the design document for architecture details
2. Check property tests for expected behavior
3. Refer to requirements for acceptance criteria
4. Consult the task list for implementation order

---

**Last Updated:** December 17, 2025
**Status:** Phase 2 (AI Integration) in progress
**Next Milestone:** Complete WebSocket handlers and begin advanced messaging features
