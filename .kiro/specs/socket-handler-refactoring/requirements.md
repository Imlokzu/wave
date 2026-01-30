# Requirements Document: Socket Handler Refactoring

## Introduction

This specification defines the requirements for refactoring the Wave Messenger socket handler code (`backend/src/socket/socketHandler.ts`) to improve code quality, maintainability, and consistency. The current implementation has grown to over 2400 lines with significant code duplication, inconsistent patterns, and complex conditional logic that makes the codebase difficult to maintain and extend.

The refactoring will extract common patterns into reusable utilities, standardize authorization and error handling, and improve the overall structure while maintaining complete backward compatibility with existing socket events and data structures.

## Glossary

- **Socket_Handler**: The main module that sets up Socket.IO event listeners and handles real-time communication
- **Authorization_Context**: The validation of whether a user has permission to perform an action (room context, user context, or both)
- **Broadcasting_Utility**: A helper function that sends events to appropriate recipients (room members or DM participants)
- **Error_Emission**: The standardized process of sending error events to socket clients
- **Socket_Data**: The data structure stored in `socketToUser` map containing userId, roomId, nickname, username, and roomUserId
- **Room_Context**: A state where the user is connected to a chat room (has valid roomId in socket data)
- **User_Context**: A state where the user is registered with a username (has valid userId and username in socket data)
- **DM_Context**: Direct message context where messages are sent between registered users
- **Event_Handler**: A function that processes a specific Socket.IO event (e.g., 'send:message', 'edit:message')

## Requirements

### Requirement 1: Authorization Middleware

**User Story:** As a developer, I want reusable authorization functions, so that I can consistently validate user permissions across all socket handlers.

#### Acceptance Criteria

1. THE Authorization_Middleware SHALL provide a function to validate room context
2. WHEN validating room context, THE Authorization_Middleware SHALL verify socketData exists AND socketData.roomId is defined
3. THE Authorization_Middleware SHALL provide a function to validate user context
4. WHEN validating user context, THE Authorization_Middleware SHALL verify socketData exists AND socketData.userId is defined AND socketData.username is defined
5. THE Authorization_Middleware SHALL provide a function to validate either room or user context
6. WHEN validating either context, THE Authorization_Middleware SHALL return success if room context OR user context is valid
7. WHEN authorization fails, THE Authorization_Middleware SHALL emit an appropriate error event to the socket
8. THE Authorization_Middleware SHALL return a typed result indicating success or failure

### Requirement 2: Broadcasting Utilities

**User Story:** As a developer, I want standardized broadcasting functions, so that I can consistently send events to rooms or DM participants without duplicating logic.

#### Acceptance Criteria

1. THE Broadcasting_Utility SHALL provide a function to broadcast events to all users in a room
2. WHEN broadcasting to a room, THE Broadcasting_Utility SHALL use Socket.IO's room broadcasting mechanism
3. THE Broadcasting_Utility SHALL provide a function to broadcast DM events to specific users
4. WHEN broadcasting DMs, THE Broadcasting_Utility SHALL find all socket connections for the target user
5. THE Broadcasting_Utility SHALL support multi-session delivery (sending to all active sessions of a user)
6. THE Broadcasting_Utility SHALL provide a smart routing function that broadcasts to room OR DM based on context
7. WHEN smart routing, THE Broadcasting_Utility SHALL check if socketData has roomId for room broadcast, otherwise use DM broadcast
8. THE Broadcasting_Utility SHALL accept the Socket.IO server instance, socket data, event name, and payload as parameters

### Requirement 3: Error Handling Standardization

**User Story:** As a developer, I want consistent error handling across all socket handlers, so that clients receive uniform error responses and debugging is easier.

#### Acceptance Criteria

1. THE Error_Handler SHALL define a standard set of error codes used across all handlers
2. THE Error_Handler SHALL provide an error emission function that sends errors to sockets
3. WHEN emitting errors, THE Error_Handler SHALL include error code and descriptive message
4. THE Error_Handler SHALL use consistent error codes for similar failure scenarios
5. THE Error_Handler SHALL replace inconsistent error codes (NOT_IN_ROOM vs NOT_AUTHORIZED) with standardized codes
6. THE Error_Handler SHALL log errors with consistent formatting for debugging
7. THE Error_Handler SHALL support optional error context data for detailed debugging

### Requirement 4: Socket Data Extraction

**User Story:** As a developer, I want a utility to safely extract and validate socket data, so that I don't repeat null checks and type assertions in every handler.

#### Acceptance Criteria

1. THE Socket_Data_Utility SHALL provide a function to extract socket data from the socketToUser map
2. WHEN extracting socket data, THE Socket_Data_Utility SHALL return typed socket data or null
3. THE Socket_Data_Utility SHALL provide a function to extract and validate required fields
4. WHEN validating required fields, THE Socket_Data_Utility SHALL check that specified fields are defined and non-empty
5. THE Socket_Data_Utility SHALL return validation results with typed socket data on success
6. THE Socket_Data_Utility SHALL emit appropriate errors when validation fails
7. THE Socket_Data_Utility SHALL support extracting userId, roomId, nickname, username, and roomUserId fields

### Requirement 5: Message Operation Utilities

**User Story:** As a developer, I want helper functions for common message operations, so that I can reduce duplication in edit, delete, and reaction handlers.

#### Acceptance Criteria

1. THE Message_Utility SHALL provide a function to handle message editing for both rooms and DMs
2. WHEN editing messages, THE Message_Utility SHALL validate user authorization
3. WHEN editing room messages, THE Message_Utility SHALL broadcast the edit to all room members
4. WHEN editing DM messages, THE Message_Utility SHALL emit the edit only to the sender
5. THE Message_Utility SHALL provide a function to handle message deletion for both rooms and DMs
6. WHEN deleting messages, THE Message_Utility SHALL check moderator permissions for room messages
7. WHEN deleting messages with attachments, THE Message_Utility SHALL trigger file deletion from storage
8. THE Message_Utility SHALL provide a function to handle reactions (add and remove)
9. WHEN handling reactions, THE Message_Utility SHALL validate room context and broadcast to room members

### Requirement 6: Handler Function Length Reduction

**User Story:** As a developer, I want shorter, more focused handler functions, so that the code is easier to read, test, and maintain.

#### Acceptance Criteria

1. WHEN refactoring is complete, THE Socket_Handler SHALL have no handler function exceeding 50 lines
2. THE Socket_Handler SHALL extract complex logic into separate utility functions
3. THE Socket_Handler SHALL use authorization middleware instead of inline authorization checks
4. THE Socket_Handler SHALL use broadcasting utilities instead of inline broadcasting logic
5. THE Socket_Handler SHALL use message utilities for common message operations
6. THE Socket_Handler SHALL maintain clear separation between validation, business logic, and I/O operations

### Requirement 7: Code Duplication Reduction

**User Story:** As a developer, I want minimal code duplication, so that bug fixes and enhancements only need to be made in one place.

#### Acceptance Criteria

1. WHEN refactoring is complete, THE Socket_Handler SHALL have less than 10% code duplication in handler functions
2. THE Socket_Handler SHALL eliminate duplicated authorization logic across handlers
3. THE Socket_Handler SHALL eliminate duplicated broadcasting logic across handlers
4. THE Socket_Handler SHALL eliminate duplicated error handling patterns across handlers
5. THE Socket_Handler SHALL eliminate duplicated socket data extraction patterns across handlers

### Requirement 8: Backward Compatibility

**User Story:** As a system operator, I want the refactored code to maintain complete backward compatibility, so that existing clients continue to work without changes.

#### Acceptance Criteria

1. THE Socket_Handler SHALL maintain all existing Socket.IO event names
2. THE Socket_Handler SHALL maintain all existing event data structures
3. THE Socket_Handler SHALL maintain all existing error codes visible to clients
4. THE Socket_Handler SHALL maintain all existing event emission patterns
5. THE Socket_Handler SHALL maintain integration with existing managers (RoomManager, MessageManager, DMManager, UserManager)
6. THE Socket_Handler SHALL maintain all existing functionality without behavioral changes

### Requirement 9: Type Safety

**User Story:** As a developer, I want strong TypeScript typing throughout the refactored code, so that I catch errors at compile time and have better IDE support.

#### Acceptance Criteria

1. THE Socket_Handler SHALL define TypeScript interfaces for all utility function parameters
2. THE Socket_Handler SHALL define TypeScript interfaces for all utility function return types
3. THE Socket_Handler SHALL use TypeScript generics where appropriate for reusable utilities
4. THE Socket_Handler SHALL eliminate use of `any` type except where interfacing with untyped libraries
5. THE Socket_Handler SHALL define types for all socket event data payloads
6. THE Socket_Handler SHALL use strict null checking for all socket data access

### Requirement 10: Testing Improvements

**User Story:** As a developer, I want the refactored code to be easily testable, so that I can write unit tests for individual utilities and integration tests for handlers.

#### Acceptance Criteria

1. THE Socket_Handler SHALL extract utilities into separate modules that can be tested independently
2. THE Socket_Handler SHALL design utilities to accept dependencies as parameters (dependency injection)
3. THE Socket_Handler SHALL separate pure logic from I/O operations where possible
4. THE Socket_Handler SHALL design authorization utilities to be testable without Socket.IO instances
5. THE Socket_Handler SHALL design broadcasting utilities to be testable with mock Socket.IO instances
6. THE Socket_Handler SHALL design message utilities to be testable with mock managers
