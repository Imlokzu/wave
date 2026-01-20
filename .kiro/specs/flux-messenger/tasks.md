# Implementation Plan

- [x] 1. Set up project structure and dependencies


  - Initialize Node.js project with TypeScript configuration
  - Install dependencies: express, socket.io, uuid, cors, axios (for AI API), @supabase/supabase-js, multer (for file uploads)
  - Install dev dependencies: jest, fast-check, @types packages, ts-node
  - Create folder structure: src/{models, managers, routes, socket, services, utils, config}
  - Set up TypeScript compiler configuration
  - Create .env file with Supabase credentials and AI service URL
  - _Requirements: 9.1, 9.2_

- [x] 2. Implement core data models and types


  - Define TypeScript interfaces for Room, Participant, Message, and MessageType
  - Add image-related fields to Message interface (imageData, imageType)
  - Add AI message type to MessageType enum
  - Create type definitions for API requests and responses
  - Define configuration interface with default values including AI settings
  - _Requirements: 1.1, 2.1, 3.1, 10.1, 11.1_

- [x] 3. Implement In-Memory Storage





  - [x] 3.1 Create InMemoryStorage class


    - Use Map structures for rooms and messages
    - Implement all CRUD operations for rooms and messages
    - Store image URLs (not image data)
    - _Requirements: 8.3_
  
  - [x] 3.2 Write property test for storage operations



    - **Property 25: Storage disabled mode**
    - **Validates: Requirements 8.3**

- [x] 4. Implement Room Manager


  - [x] 4.1 Create RoomManager class with room lifecycle methods


    - Implement createRoom with unique code generation
    - Implement getRoom, getRoomByCode methods
    - Implement participant management (add, remove)
    - Implement lock/unlock functionality
    - _Requirements: 2.1, 2.2, 2.3, 7.1, 7.3_
  
  - [x] 4.2 Write property test for room code uniqueness


    - **Property 4: Room code uniqueness**
    - **Validates: Requirements 2.1**
  
  - [x] 4.3 Write property test for capacity enforcement

    - **Property 5: Capacity enforcement**
    - **Validates: Requirements 2.2, 2.4**
  
  - [x] 4.4 Write property test for participant removal

    - **Property 6: Leave removes participant**
    - **Validates: Requirements 2.3**
  
  - [x] 4.5 Write property test for room info accuracy

    - **Property 7: Room info accuracy**
    - **Validates: Requirements 2.5**
  
  - [x] 4.6 Write property test for lock state

    - **Property 21: Lock sets read-only state**
    - **Validates: Requirements 7.1**
  
  - [x] 4.7 Write property test for lock-unlock round trip

    - **Property 22: Lock-unlock round trip**
    - **Validates: Requirements 7.3**

- [x] 5. Implement Message Manager


  - [x] 5.1 Create MessageManager class with message operations


    - Implement createMessage with unique ID and timestamp generation
    - Implement createImageMessage for image messages with URL
    - Implement getMessages with expiration filtering
    - Implement clearMessages with safety banner preservation
    - Implement injectFakeMessage with spoofSource parameter (Google, Wikipedia, etc.)
    - Implement scheduleExpiration with cleanup logic for messages
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 5.1, 5.3, 6.1, 6.3, 8.1, 10.4, 12.3, 12.4_
  
  - [x] 5.2 Write property test for message ID uniqueness

    - **Property 10: Message ID uniqueness**
    - **Validates: Requirements 3.3**
  

  - [x] 5.3 Write property test for non-expired message delivery

    - **Property 9: Non-expired message delivery**
    - **Validates: Requirements 3.2**

  
  - [x] 5.4 Write property test for message expiration cleanup

    - **Property 11: Message expiration cleanup**

    - **Validates: Requirements 3.4, 8.1**
  
  - [x] 5.5 Write property test for clear all deletes messages

    - **Property 15: Clear all deletes messages**
    - **Validates: Requirements 5.1**
  

  - [x] 5.6 Write property test for safety banner preservation

    - **Property 16: Safety banner preservation**
    - **Validates: Requirements 5.3**

  
  - [x] 5.7 Write property test for fake message non-persistence

    - **Property 19: Fake message non-persistence**

    - **Validates: Requirements 6.3**
  
  - [x] 5.8 Write property test for fake message ephemerality

    - **Property 20: Fake message ephemerality**
    - **Validates: Requirements 6.4**
  

  - [x] 5.9 Write property test for global expiration application

    - **Property 24: Global expiration application**
    - **Validates: Requirements 8.2**
  
  - [x] 5.10 Write property test for silent expiration

    - **Property 26: Silent expiration**
    - **Validates: Requirements 8.4**
  
  - [x] 5.11 Write property test for image format validation

    - **Property 29: Image format validation**
    - **Validates: Requirements 10.1**
  
  - [x] 5.12 Write property test for image size limit

    - **Property 30: Image size limit enforcement**
    - **Validates: Requirements 10.2**
  
  - [x] 5.13 Write property test for image message broadcast

    - **Property 32: Image message broadcast**
    - **Validates: Requirements 10.4, 10.5**
  
  - [x] 5.14 Write property test for image expiration cleanup

    - **Property 33: Image expiration cleanup**
    - **Validates: Requirements 10.6**

- [x] 6. Implement Image Upload Service



  - [x] 6.1 Create ImageUploadService class


    - Implement Supabase storage client initialization
    - Implement uploadToSupabase method with file validation
    - Implement uploadToBBImg method (API details TBD)
    - Implement validateImage for format and size checks
    - Handle upload errors gracefully
    - _Requirements: 10.1, 10.2, 10.3_
  
  - [x] 6.2 Write property test for image upload to Supabase


    - **Property 31: Image upload to Supabase**
    - **Validates: Requirements 10.3**

- [x] 7. Implement AI Service Integration



  - [x] 7.1 Create AIService class for free AI API

    - Implement connection to Ollama (local) or Hugging Face API
    - Implement sendMessage method to forward prompts
    - Implement isAvailable method to check service status
    - Handle API errors gracefully
    - _Requirements: 11.1, 11.4, 11.5_
  
  - [x] 7.2 Write property test for AI message forwarding


    - **Property 34: AI message forwarding**
    - **Validates: Requirements 11.1**
  
  - [x] 7.3 Write property test for AI response broadcast

    - **Property 35: AI response broadcast**
    - **Validates: Requirements 11.2, 11.3**
  

  - [x] 7.4 Write property test for AI unavailable handling
    - **Property 36: AI unavailable handling**
    - **Validates: Requirements 11.4**

- [x] 8. Checkpoint - Ensure all tests pass



  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Implement REST API routes


  - [x] 9.1 Create Express router with room endpoints


    - POST /api/rooms - Create room
    - GET /api/rooms/:code - Get room info
    - POST /api/rooms/:code/join - Join room
    - POST /api/rooms/:id/leave - Leave room
    - POST /api/rooms/:id/lock - Lock room
    - POST /api/rooms/:id/unlock - Unlock room
    - _Requirements: 2.1, 2.2, 2.3, 7.1, 7.3, 9.1_
  
  - [x] 9.2 Create message and image endpoints


    - GET /api/rooms/:id/messages - Get messages
    - POST /api/rooms/:id/clear - Clear messages
    - POST /api/rooms/:id/fake - Inject fake message
    - POST /api/rooms/:id/image - Upload and send image
    - _Requirements: 3.2, 5.1, 6.1, 9.1, 10.1, 10.2_
  
  - [x] 9.3 Create quick action endpoints


    - POST /api/rooms/:id/panic - Panic button (local clear + disconnect)
    - POST /api/rooms/:id/spoof - Spoof button (inject fake)
    - _Requirements: 12.1, 12.3_
  
  - [x] 9.4 Add request validation middleware


    - Validate required fields
    - Validate nickname format (non-empty)
    - Validate room code format
    - Validate image format and size
    - _Requirements: 1.3, 9.3, 10.1, 10.2_
  
  - [x] 9.5 Add error handling middleware

    - Catch and format errors
    - Return structured error responses
    - Log errors appropriately
    - _Requirements: 9.3_
  
  - [x] 9.6 Write property test for empty nickname rejection

    - **Property 2: Empty nickname join rejection**
    - **Validates: Requirements 1.3**
  
  - [x] 9.7 Write property test for structured error responses

    - **Property 27: Structured error responses**
    - **Validates: Requirements 9.3**

- [x] 10. Implement WebSocket handlers




  - [x] 10.1 Set up Socket.IO server with connection handling

    - Initialize Socket.IO with Express server
    - Handle connection and disconnection events
    - Track socket-to-user mappings
    - _Requirements: 3.1, 9.4_
  
  - [x] 10.2 Implement join:room event handler

    - Validate nickname and room code
    - Add participant to room
    - Join Socket.IO room for broadcasting
    - Emit room:joined confirmation
    - Broadcast room:user:joined to others
    - Send safety banner message
    - _Requirements: 1.1, 1.2, 1.4, 4.1_
  
  - [x] 10.3 Implement send:message event handler

    - Validate user is in room
    - Check room lock status and moderator permissions
    - Create and broadcast message
    - Schedule message expiration
    - _Requirements: 3.1, 3.4, 3.5_
  
  - [x] 10.4 Implement send:image event handler

    - Validate user is in room
    - Validate image format and size
    - Create image message with Base64 data
    - Broadcast image message to all participants
    - Schedule image expiration
    - _Requirements: 10.1, 10.2, 10.3, 10.4_
  
  - [x] 10.5 Implement send:ai:message event handler


    - Validate user is in room
    - Forward message to AI service
    - Broadcast AI response with type='ai'
    - Handle AI service unavailability
    - _Requirements: 11.1, 11.2, 11.3, 11.4_
  
  - [x] 10.6 Implement leave:room event handler

    - Remove participant from room
    - Leave Socket.IO room
    - Broadcast room:user:left to others
    - _Requirements: 2.3_
  
  - [x] 10.7 Implement clear:chat:local and clear:chat:all handlers

    - Handle local clear (emit to single client)
    - Handle global clear (delete messages and broadcast)
    - _Requirements: 5.1, 5.2_
  
  - [x] 10.8 Implement action:panic event handler

    - Clear messages locally for user
    - Disconnect user from room
    - Execute within 1 second
    - Do not broadcast to other users
    - _Requirements: 12.1, 12.4, 12.5_
  

  - [x] 10.9 Implement action:spoof event handler

    - Inject fake message into room
    - Broadcast to all participants
    - _Requirements: 12.3_
  
  - [x] 10.10 Write property test for valid join success

    - **Property 1: Valid join with nickname succeeds**
    - **Validates: Requirements 1.1, 1.2**
  
  - [x] 10.11 Write property test for join broadcasts system message

    - **Property 3: Join broadcasts system message**
    - **Validates: Requirements 1.4**
  
  - [x] 10.12 Write property test for message broadcast completeness

    - **Property 8: Message broadcast completeness**
    - **Validates: Requirements 3.1**
  
  - [x] 10.13 Write property test for locked room message rejection

    - **Property 12: Locked room message rejection**
    - **Validates: Requirements 3.5, 7.2**
  
  - [x] 10.14 Write property test for safety banner presence

    - **Property 13: Safety banner presence**
    - **Validates: Requirements 4.1, 4.2**
  
  - [x] 10.15 Write property test for system message type marking

    - **Property 14: System message type marking**
    - **Validates: Requirements 4.3**
  
  - [x] 10.16 Write property test for clear generates confirmation

    - **Property 17: Clear generates confirmation**
    - **Validates: Requirements 5.4**
  
  - [x] 10.17 Write property test for fake message broadcast and type

    - **Property 18: Fake message broadcast and type**
    - **Validates: Requirements 6.1, 6.2**
  

  - [x] 10.18 Write property test for lock state change broadcasts

    - **Property 23: Lock state change broadcasts**
    - **Validates: Requirements 7.4**
  
  - [x] 10.19 Write property test for message authorization requirement

    - **Property 28: Message authorization requirement**
    - **Validates: Requirements 9.4**
  
  - [x] 10.20 Write property test for panic button immediate action

    - **Property 36: Panic button immediate action**
    - **Validates: Requirements 12.1, 12.4**
  
  - [x] 10.21 Write property test for panic button silent execution

    - **Property 37: Panic button silent execution**
    - **Validates: Requirements 12.5**
  
  - [x] 10.22 Write property test for clear button global effect

    - **Property 38: Clear button global effect**
    - **Validates: Requirements 12.2**
  
  - [x] 10.23 Write property test for spoof button fake injection

    - **Property 39: Spoof button fake injection**
    - **Validates: Requirements 12.3**
  


  - [x] 10.24 Write property test for spoof source identification



    - **Property 40: Spoof source identification**
    - **Validates: Requirements 12.3, 12.4**

- [x] 11. Create main server entry point



  - Initialize Express app with middleware (cors, json parser)
  - Mount REST API routes
  - Initialize Socket.IO with WebSocket handlers
  - Load configuration from environment variables
  - Start server on configured port
  - _Requirements: 9.1_

- [x] 12. Add utility functions and helpers



  - Create room code generator (6-character alphanumeric)
  - Create UUID generator wrapper
  - Create timestamp utilities
  - Create validation helpers (image format, size, nickname)
  - Create spoof source name generator (Google, Wikipedia, etc.)
  - _Requirements: 2.1, 3.3, 10.1, 10.2, 12.3, 12.4_




- [x] 13. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 14. Implement message editing and deletion




  - [x] 14.1 Add edit and delete methods to MessageManager
    - Implement editMessage with ownership validation
    - Implement deleteMessage with moderator override
    - Add 48-hour edit time limit check
    - Update message timestamps (editedAt, deletedAt)

    - _Requirements: 13.1, 13.3, 13.5, 14.1, 14.3, 14.4_
  
  - [x] 14.2 Write property test for message edit updates content

    - **Property 41: Message edit updates content**
    - **Validates: Requirements 13.1**
  

  - [x] 14.3 Write property test for edit authorization
    - **Property 43: Edit authorization**
    - **Validates: Requirements 13.3**

  
  - [x] 14.4 Write property test for edit time limit
    - **Property 45: Edit time limit enforcement**

    - **Validates: Requirements 13.5**
  



  - [x] 14.5 Write property test for message deletion
    - **Property 46: Message deletion removes from storage**
    - **Validates: Requirements 14.1**
  
  - [x] 14.6 Write property test for delete authorization
    - **Property 48: Delete authorization with moderator override**

    - **Validates: Requirements 14.3, 14.4**

- [x] 15. Implement reactions system

  - [x] 15.1 Add reaction methods to MessageManager
    - Implement addReaction with emoji validation
    - Implement removeReaction

    - Store reactions in Map<emoji, Set<userId>>
    - Handle reaction grouping and counting



    - _Requirements: 15.1, 15.2, 15.3_
  
  - [x] 15.2 Write property test for reaction addition
    - **Property 50: Reaction addition and storage**
    - **Validates: Requirements 15.1**
  

  - [x] 15.3 Write property test for reaction removal
    - **Property 51: Reaction removal round trip**
    - **Validates: Requirements 15.2**

  
  - [x] 15.4 Write property test for reaction grouping
    - **Property 52: Reaction grouping and counting**

    - **Validates: Requirements 15.3**

- [x] 16. Implement message pinning

  - [x] 16.1 Add pin/unpin methods to MessageManager
    - Implement pinMessage with moderator check




    - Implement unpinMessage with moderator check
    - Add getPinnedMessages to RoomManager
    - Sort pinned messages by pinnedAt timestamp
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5_
  

  - [x] 16.2 Write property test for pin authorization
    - **Property 55: Pin message authorization and marking**
    - **Validates: Requirements 16.1**

  
  - [x] 16.3 Write property test for pinned message retrieval
    - **Property 56: Pinned message retrieval**

    - **Validates: Requirements 16.2**
  



  - [x] 16.4 Write property test for unpin round trip
    - **Property 57: Unpin round trip**
    - **Validates: Requirements 16.3**
  
  - [x] 16.5 Write property test for pin authorization enforcement
    - **Property 59: Pin authorization enforcement**

    - **Validates: Requirements 16.5**

- [x] 17. Implement typing indicators

  - [x] 17.1 Add typing indicator methods to RoomManager
    - Implement setTyping to track active typers
    - Implement clearTyping to remove indicators

    - Add automatic 3-second timeout
    - Store typing state with timestamps
    - _Requirements: 17.1, 17.2, 17.3_

  
  - [x] 17.2 Write property test for typing indicator broadcast




    - **Property 60: Typing indicator broadcast**
    - **Validates: Requirements 17.1**
  
  - [x] 17.3 Write property test for typing indicator timeout
    - **Property 61: Typing indicator timeout**

    - **Validates: Requirements 17.2**
  
  - [x] 17.4 Write property test for typing cleared on send
    - **Property 62: Typing indicator cleared on send**
    - **Validates: Requirements 17.3**


- [x] 18. Implement polls system
  - [x] 18.1 Add poll methods to MessageManager

    - Implement createPollMessage with PollData
    - Implement votePoll with duplicate prevention
    - Implement closePoll with creator validation

    - Store votes in Set<userId> per option
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5_




  
  - [x] 18.2 Write property test for poll creation
    - **Property 65: Poll creation and broadcast**
    - **Validates: Requirements 18.1**
  
  - [x] 18.3 Write property test for poll vote recording

    - **Property 66: Poll vote recording**
    - **Validates: Requirements 18.2**
  

  - [x] 18.4 Write property test for poll vote uniqueness
    - **Property 68: Poll vote uniqueness**
    - **Validates: Requirements 18.4**

  
  - [x] 18.5 Write property test for poll closure
    - **Property 69: Poll closure state**
    - **Validates: Requirements 18.5**



- [x] 19. Implement file upload system
  - [x] 19.1 Extend ImageUploadService for general files
    - Add file format validation (PDF, DOC, DOCX, TXT, ZIP, GIF)
    - Add 10MB file size limit


    - Implement uploadFile method for Supabase
    - Store file metadata (name, size, type)
    - _Requirements: 19.1, 19.2, 19.3, 19.4_
  
  - [x] 19.2 Add createFileMessage to MessageManager
    - Create file messages with metadata
    - Store fileUrl, fileName, fileSize
    - Handle GIF files as special case
    - _Requirements: 19.1, 19.4, 19.5_
  
  - [x] 19.3 Write property test for file format validation
    - **Property 71: Document file format validation**
    - **Validates: Requirements 19.2**
  
  - [x] 19.4 Write property test for file size limit
    - **Property 72: File size limit enforcement**
    - **Validates: Requirements 19.3**


  
  - [x] 19.5 Write property test for file metadata storage
    - **Property 73: File message metadata storage**
    - **Validates: Requirements 19.4**

- [x] 20. Implement room code regeneration
  - [x] 20.1 Add regenerateRoomCode to RoomManager
    - Generate new unique room code
    - Invalidate old room code
    - Maintain all participants and messages
    - Broadcast update to all participants
    - _Requirements: 22.1, 22.2, 22.3, 22.5_
  
  - [x] 20.2 Write property test for code regeneration uniqueness
    - **Property 76: Room code regeneration uniqueness**
    - **Validates: Requirements 22.1**
  
  - [x] 20.3 Write property test for old code invalidation
    - **Property 77: Old room code invalidation**
    - **Validates: Requirements 22.2**
  
  - [x] 20.4 Write property test for regeneration preserves data
    - **Property 80: Regeneration preserves room data**
    - **Validates: Requirements 22.5**

- [x] 21. Extend REST API routes for new features


  - [x] 21.1 Add message operation endpoints

    - PUT /api/messages/:id - Edit message
    - DELETE /api/messages/:id - Delete message
    - POST /api/messages/:id/pin - Pin message
    - DELETE /api/messages/:id/pin - Unpin message
    - POST /api/messages/:id/react - Add reaction
    - DELETE /api/messages/:id/react - Remove reaction
    - _Requirements: 13.1, 14.1, 15.1, 16.1_
  

  - [x] 21.2 Add poll endpoints
    - POST /api/rooms/:id/poll - Create poll
    - POST /api/messages/:id/vote - Vote in poll
    - POST /api/messages/:id/close - Close poll
    - _Requirements: 18.1, 18.2, 18.5_

  
  - [x] 21.3 Add file upload endpoint
    - POST /api/rooms/:id/file - Upload file
    - Validate file format and size
    - Upload to Supabase storage

    - _Requirements: 19.1, 19.2, 19.3_
  



  - [x] 21.4 Add room management endpoints
    - POST /api/rooms/:id/regenerate - Regenerate code
    - GET /api/rooms/:id/pinned - Get pinned messages
    - _Requirements: 16.2, 22.1_


- [ ] 22. Extend WebSocket handlers for new features
  - [x] 22.1 Implement message editing handlers
    - Handle edit:message event
    - Validate ownership and time limit
    - Broadcast message:edited event

    - _Requirements: 13.1, 13.2, 13.3, 13.5_
  
  - [x] 22.2 Implement message deletion handlers
    - Handle delete:message event
    - Validate ownership or moderator status

    - Broadcast message:deleted event
    - _Requirements: 14.1, 14.3, 14.4_
  
  - [x] 22.3 Implement reaction handlers
    - Handle add:reaction event
    - Handle remove:reaction event

    - Broadcast reaction:added and reaction:removed events
    - _Requirements: 15.1, 15.2_
  
  - [x] 22.4 Implement pin/unpin handlers
    - Handle pin:message event
    - Handle unpin:message event
    - Validate moderator status

    - Broadcast message:pinned and message:unpinned events
    - _Requirements: 16.1, 16.3, 16.5_
  
  - [x] 22.5 Implement typing indicator handlers
    - Handle typing:start event
    - Handle typing:stop event

    - Broadcast typing:update event
    - Implement 3-second auto-clear
    - Clear on message send
    - _Requirements: 17.1, 17.2, 17.3_
  
  - [x] 22.6 Implement poll handlers

    - Handle send:poll event
    - Handle vote:poll event
    - Handle close:poll event

    - Broadcast poll:voted and poll:closed events
    - _Requirements: 18.1, 18.2, 18.5_


  

  - [x] 22.7 Implement file upload handler
    - Handle send:file event
    - Validate file format and size
    - Upload to Supabase
    - Broadcast message:file event
    - _Requirements: 19.1, 19.2, 19.3_
  
  - [ ] 22.8 Write property test for edit broadcast
    - **Property 42: Edit broadcast completeness**
    - **Validates: Requirements 13.2**
  
  - [ ] 22.9 Write property test for code regeneration broadcast
    - **Property 78: Code regeneration broadcast**
    - **Validates: Requirements 22.3**

- [x] 23. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 24. Update frontend UI for new features



  - [x] 24.1 Add message editing UI

    - Add edit button to own messages
    - Show edit modal/inline editor
    - Display edited indicator
    - Handle edit time limit
    - _Requirements: 13.1, 13.4, 13.5_
  

  - [ ] 24.2 Add message deletion UI
    - Add delete button to own messages
    - Show confirmation dialog
    - Display deleted message tombstone
    - _Requirements: 14.1, 14.2, 14.5_

  
  - [ ] 24.3 Add reactions UI
    - Add reaction picker button
    - Display reaction counts
    - Show user list on click
    - Group same reactions

    - _Requirements: 15.1, 15.3, 15.4, 15.5_
  
  - [ ] 24.4 Add pinned messages UI
    - Add pin button for moderators
    - Show pinned messages section at top
    - Display chronologically

    - Add unpin button
    - _Requirements: 16.1, 16.2, 16.3, 16.4_
  
  - [ ] 24.5 Add typing indicators UI
    - Display typing users below chat
    - Show "User is typing..." text

    - Handle multiple typers
    - Auto-hide after timeout
    - _Requirements: 17.1, 17.4, 17.5_
  
  - [ ] 24.6 Add polls UI
    - Add poll creation button
    - Show poll creation modal

    - Display poll with vote buttons
    - Show vote counts and percentages
    - Display closed state
    - _Requirements: 18.1, 18.3, 18.5_
  
  - [ ] 24.7 Add file upload UI
    - Extend attachment button for files

    - Show file picker with format filter
    - Display file messages with download link
    - Show file icon, name, and size
    - Handle GIFs inline
    - _Requirements: 19.1, 19.2, 19.5_
  
  - [x] 24.8 Add theme customization UI

    - Create theme settings panel
    - Add color pickers for accent and bubbles
    - Add font size slider
    - Add theme presets (dark, light, custom)
    - Persist settings to localStorage
    - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5_

  
  - [ ] 24.9 Add notification controls UI
    - Add notification toggle in settings
    - Request browser permissions
    - Show notification preview
    - Add mention detection
    - _Requirements: 21.1, 21.2, 21.3, 21.4_
  
  - [ ] 24.10 Add room code regeneration UI
    - Add regenerate button for moderators


    - Show confirmation dialog
    - Display new code
    - Update invite link
    - _Requirements: 22.1, 22.3_

- [x] 25. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 26. Create example configuration and documentation
  - Create .env.example with Supabase credentials, AI service URL, and BBImg API key
  - Create README.md with API documentation
  - Document REST endpoints with examples
  - Document WebSocket events with examples
  - Include setup instructions for Supabase, Ollama/Hugging Face API, and BBImg
  - Include quick action button usage examples (Panic, Clear, Spoof)
  - Document spoof feature for educational use
  - Document all new Telegram-like features
  - _Requirements: 9.1, 9.2, 11.5, 12.3, 13-22_

- [ ] 27. Test and verify delete button functionality
  - [ ] 27.1 Restart development server to load all changes
    - Stop current server if running
    - Run `npm run dev`
    - Verify server starts without errors
    - Confirm all services show as "Enabled"
  
  - [ ] 27.2 Test delete button visibility and interaction
    - Hard refresh browser (Ctrl+Shift+R)
    - Open browser console (F12)
    - Send a text message
    - Hover over YOUR message (right side)
    - Verify delete button appears on LEFT side
    - Check console for: `[UI] Created action buttons for message:`
  
  - [ ] 27.3 Test delete button for all message types
    - Test text message deletion
    - Test image message deletion
    - Test file (PDF/ZIP) message deletion
    - Test audio (MP3) message deletion
    - Test poll message deletion
    - For each: verify console logs show full flow
    - For each: confirm message disappears after deletion

- [ ] 28. Test and verify poll voting functionality
  - [ ] 28.1 Test poll creation and voting
    - Create a poll with 2-3 options
    - Vote on an option
    - Check console for: `[App] Poll voted event received:`
    - Verify "✓ You voted" indicator appears
    - Verify vote percentages display correctly
  
  - [ ] 28.2 Test poll voting restrictions
    - Try voting again on same poll
    - Verify error message: "You have already voted"
    - Verify poll state doesn't change
    - Check console logs for vote rejection
  
  - [ ] 28.3 Test poll real-time updates
    - Open two browser windows/tabs
    - Create poll in first window
    - Vote in second window
    - Verify first window updates immediately
    - Verify vote counts sync across both windows

- [ ] 29. Debug and fix any remaining issues
  - [ ] 29.1 Review console logs for errors
    - Check for any red error messages
    - Verify all expected logs appear
    - Document any missing or unexpected logs
  
  - [ ] 29.2 Test edge cases
    - Test delete button on very old messages
    - Test poll voting with multiple users
    - Test delete button with slow network
    - Test poll updates with connection issues
  
  - [ ] 29.3 Document findings and create bug reports
    - List any issues found during testing
    - Include console output for each issue
    - Provide steps to reproduce
    - Suggest potential fixes if applicable
