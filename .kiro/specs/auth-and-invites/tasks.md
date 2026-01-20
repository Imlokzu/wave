# Authentication and Friend Invites - Implementation Tasks

## Phase 1: Authentication Backend

- [x] 1. Update User model and database schema


  - Add `password_hash` field to User interface
  - Create sessions table migration
  - Update UserManager to handle password hashing
  - _Requirements: 1.2, 7.1, 7.3_




- [ ] 2. Implement AuthService
  - Create `src/services/AuthService.ts`
  - Implement `hashPassword()` using bcrypt
  - Implement `verifyPassword()` for login
  - Implement `createSession()` with UUID tokens


  - Implement `validateSession()` for auth checks
  - Implement `destroySession()` for logout
  - _Requirements: 1.2, 2.2, 7.1, 7.2, 8.1_

- [ ] 3. Create authentication API routes
  - Create `POST /api/auth/signup` endpoint


  - Create `POST /api/auth/login` endpoint
  - Create `POST /api/auth/logout` endpoint
  - Create `GET /api/auth/session` endpoint for validation
  - Add password strength validation (min 8 chars)
  - _Requirements: 1.1, 1.2, 2.1, 2.2, 7.5_

- [ ] 4. Implement authentication middleware
  - Create `requireAuth` middleware to protect routes
  - Add session validation to middleware
  - Return 401 for invalid/expired sessions
  - _Requirements: 2.5, 8.2, 8.5_

## Phase 2: Friend System Backend

- [ ] 5. Create friend database tables
  - Create `friend_invites` table migration
  - Create `friends` table migration
  - Add indexes for performance
  - Add constraints (unique invites, no self-invites)
  - _Requirements: 4.2, 9.1_

- [ ] 6. Implement FriendManager
  - Create `src/managers/FriendManager.ts`
  - Implement `sendInvite()` with duplicate check
  - Implement `getPendingInvites()` for notification badge
  - Implement `acceptInvite()` to create friendship
  - Implement `declineInvite()` to remove invite
  - Implement `getFriends()` with online status
  - Implement `areFriends()` check
  - Implement `inviteExists()` check
  - _Requirements: 4.1, 4.2, 4.4, 5.4, 5.5, 9.1_

- [ ] 7. Create friend API routes
  - Create `POST /api/friends/invite` endpoint
  - Create `GET /api/friends/invites` endpoint
  - Create `POST /api/friends/accept/:id` endpoint
  - Create `POST /api/friends/decline/:id` endpoint
  - Create `GET /api/friends/list` endpoint
  - Add authentication to all endpoints
  - _Requirements: 4.1, 4.2, 5.1, 5.4, 5.5, 9.1_

- [ ] 8. Add friend socket events
  - Add `friend:invite` event handler
  - Add `friend:accept` event handler
  - Add `friend:decline` event handler


  - Emit `friend:invite:received` to target user
  - Emit `friend:invite:accepted` to sender
  - Emit `friend:invite:declined` to sender
  - Emit `friend:online` / `friend:offline` status updates
  - _Requirements: 5.1, 5.4, 5.5, 9.4, 9.5_

## Phase 3: Authentication Frontend




- [ ] 9. Create login page
  - Create `public/login.html` with WAVE styling
  - Add username input field
  - Add password input field with show/hide toggle
  - Add login button
  - Add link to signup page
  - Add error message display area
  - _Requirements: 2.1, 2.3_

- [ ] 10. Create signup page
  - Create `public/signup.html` with WAVE styling
  - Add username input with real-time availability check
  - Add nickname input field
  - Add password input with strength indicator
  - Add confirm password field with match validation
  - Add signup button
  - Add link to login page
  - Add error message display area
  - _Requirements: 1.1, 1.3, 1.5_

- [ ] 11. Implement login functionality
  - Create `handleLogin()` in app.js
  - Call `/api/auth/login` endpoint
  - Store session token in localStorage
  - Redirect to chat on success
  - Display error messages on failure
  - _Requirements: 2.2, 2.3, 2.4_

- [ ] 12. Implement signup functionality
  - Create `handleSignup()` in app.js
  - Validate password strength client-side
  - Check username availability before submit
  - Call `/api/auth/signup` endpoint
  - Auto-login after successful signup
  - Redirect to chat interface
  - _Requirements: 1.2, 1.3, 1.4, 1.5_

- [ ] 13. Implement session management
  - Add session token to API requests
  - Create `validateSession()` on app init
  - Restore user state from valid session
  - Redirect to login if session invalid
  - Implement logout functionality
  - Clear session on logout
  - _Requirements: 2.5, 8.1, 8.2, 8.3, 8.4_

- [ ] 14. Make room code optional
  - Update login flow to skip room code requirement
  - Allow direct access to chat after login
  - Add "Join Room" button in chat interface
  - Show modal for room code entry when needed
  - _Requirements: 3.1, 3.2, 3.3_

## Phase 4: Friend System Frontend

- [ ] 15. Create notification badge component
  - Add red circle badge to top-right of chat UI
  - Display pending invite count
  - Hide badge when count is 0
  - Show "9+" for counts over 9
  - Add click handler to open invite modal
  - Add animation for new invites
  - _Requirements: 5.1, 10.1, 10.2, 10.5_

- [ ] 16. Create invite modal
  - Create modal component in chat.html
  - Display list of pending invites
  - Show sender username, nickname, timestamp
  - Add Accept and Decline buttons for each invite
  - Show "No pending invites" when empty
  - Close modal after action
  - _Requirements: 5.2, 5.3, 6.1, 6.2, 6.5_

- [ ] 17. Implement invite acceptance flow
  - Handle Accept button click
  - Call `/api/friends/accept/:id` endpoint
  - Update badge count
  - Close modal
  - Open direct chat with new friend
  - Show success notification
  - _Requirements: 5.4, 6.3, 10.3_

- [ ] 18. Implement invite decline flow
  - Handle Decline button click
  - Call `/api/friends/decline/:id` endpoint
  - Update badge count
  - Remove invite from list
  - Show confirmation message
  - _Requirements: 5.5, 6.4, 10.3_

- [ ] 19. Enhance user search with invite button
  - Update search results to show invite status
  - Add "Invite" button for non-friends
  - Show "Pending" for sent invites
  - Show "Chat" button for existing friends
  - Disable invite button after sending
  - Call `/api/friends/invite` on click
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ] 20. Create friend list sidebar
  - Add friend list section to chat sidebar
  - Display all accepted friends
  - Show online/offline status with colored dot
  - Show last seen time for offline friends
  - Add click handler to open direct chat
  - Update status in real-time via socket events
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

## Phase 5: Real-time Integration

- [ ] 21. Implement socket event handlers
  - Add `friend:invite:received` handler to show badge
  - Add `friend:invite:accepted` handler for notifications
  - Add `friend:invite:declined` handler for notifications
  - Add `friend:online` handler to update friend list
  - Add `friend:offline` handler to update friend list
  - Update badge count in real-time
  - _Requirements: 5.1, 9.4, 9.5, 10.4_

- [ ] 22. Add invite notification animations
  - Animate badge appearance
  - Pulse animation for new invites
  - Toast notification for invite received
  - Sound notification (optional)
  - _Requirements: 5.1, 10.4_

## Phase 6: Testing and Polish

- [ ] 23. Write unit tests
  - Test password hashing and verification
  - Test session creation and validation
  - Test invite creation with duplicate check
  - Test friend list retrieval
  - Test badge count calculation
  - _Requirements: All_

- [ ] 24. Write integration tests
  - Test complete signup → login flow
  - Test send → accept invite flow
  - Test send → decline invite flow
  - Test session persistence
  - Test friend status updates
  - _Requirements: All_

- [ ] 25. Final polish and bug fixes
  - Test all user flows end-to-end
  - Fix any UI/UX issues
  - Ensure responsive design
  - Add loading states
  - Add error handling
  - Test on multiple browsers
  - _Requirements: All_

## Notes

- Use bcrypt for password hashing (10+ salt rounds)
- Session tokens should be UUID v4 or JWT
- Session expiration: 24 hours
- All friend endpoints require authentication
- Real-time updates via Socket.IO
- Badge count updates immediately on any invite action
- Friend list shows online status in real-time
