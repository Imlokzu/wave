# Authentication and Friend Invites - Design Document

## Overview

This design implements a complete authentication system with login/signup flows, password-based security, and a friend invitation system. Users can register accounts, log in securely, search for other users, send friend invites, and receive notifications about pending invites.

## Architecture

### High-Level Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend Layer                           │
├─────────────────────────────────────────────────────────────┤
│  login.html  │  signup.html  │  chat.html (enhanced)        │
│  - Login form │  - Signup form│  - Notification badge       │
│  - Validation │  - Password   │  - Invite modal             │
│               │    strength   │  - Friend list              │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     API Layer                                │
├─────────────────────────────────────────────────────────────┤
│  /api/auth/*          │  /api/friends/*                     │
│  - POST /signup       │  - POST /invite                     │
│  - POST /login        │  - GET /invites                     │
│  - POST /logout       │  - POST /accept/:id                 │
│  - GET /session       │  - POST /decline/:id                │
│                       │  - GET /list                        │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Business Logic Layer                       │
├─────────────────────────────────────────────────────────────┤
│  AuthService          │  FriendManager                      │
│  - hashPassword()     │  - sendInvite()                     │
│  - verifyPassword()   │  - acceptInvite()                   │
│  - createSession()    │  - declineInvite()                  │
│  - validateSession()  │  - getFriends()                     │
│                       │  - getPendingInvites()              │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     Data Layer                               │
├─────────────────────────────────────────────────────────────┤
│  Users Table          │  Friends Table                      │
│  - id                 │  - id                               │
│  - username           │  - user_id                          │
│  - nickname           │  - friend_id                        │
│  - password_hash      │  - status (pending/accepted)        │
│  - created_at         │  - created_at                       │
│                       │  - accepted_at                      │
│  Sessions Table       │                                     │
│  - id                 │  FriendInvites Table                │
│  - user_id            │  - id                               │
│  - token              │  - from_user_id                     │
│  - expires_at         │  - to_user_id                       │
│                       │  - status (pending/accepted/declined)│
│                       │  - created_at                       │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Authentication Service

```typescript
interface AuthService {
  // User registration
  signup(username: string, nickname: string, password: string): Promise<User>;
  
  // User login
  login(username: string, password: string): Promise<{ user: User; token: string }>;
  
  // Session management
  createSession(userId: string): Promise<string>;
  validateSession(token: string): Promise<User | null>;
  destroySession(token: string): Promise<void>;
  
  // Password utilities
  hashPassword(password: string): Promise<string>;
  verifyPassword(password: string, hash: string): Promise<boolean>;
}
```

### 2. Friend Manager

```typescript
interface FriendInvite {
  id: string;
  fromUserId: string;
  fromUsername: string;
  fromNickname: string;
  toUserId: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: Date;
}

interface Friend {
  id: string;
  userId: string;
  friendId: string;
  friendUsername: string;
  friendNickname: string;
  isOnline: boolean;
  lastSeen: Date;
  acceptedAt: Date;
}

interface FriendManager {
  // Send friend invite
  sendInvite(fromUserId: string, toUserId: string): Promise<FriendInvite>;
  
  // Get pending invites for a user
  getPendingInvites(userId: string): Promise<FriendInvite[]>;
  
  // Accept invite
  acceptInvite(inviteId: string, userId: string): Promise<Friend>;
  
  // Decline invite
  declineInvite(inviteId: string, userId: string): Promise<void>;
  
  // Get friend list
  getFriends(userId: string): Promise<Friend[]>;
  
  // Check if users are friends
  areFriends(userId1: string, userId2: string): Promise<boolean>;
  
  // Check if invite exists
  inviteExists(fromUserId: string, toUserId: string): Promise<boolean>;
}
```

### 3. Frontend Components

#### Login Page (login.html)
- Username input field
- Password input field (with show/hide toggle)
- Login button
- Link to signup page
- Error message display

#### Signup Page (signup.html)
- Username input field (with availability check)
- Nickname input field
- Password input field (with strength indicator)
- Confirm password field
- Signup button
- Link to login page
- Error message display

#### Chat Interface Enhancements
- Notification badge (red circle with count)
- Invite modal popup
- Friend list sidebar
- User search with invite button

## Data Models

### User Model (Enhanced)

```typescript
interface User {
  id: string;
  username: string;
  nickname: string;
  passwordHash: string;  // NEW: bcrypt hashed password
  email?: string;
  avatar?: string;
  bio?: string;
  isOnline: boolean;
  createdAt: Date;
  lastSeen: Date;
}
```

### Session Model

```typescript
interface Session {
  id: string;
  userId: string;
  token: string;  // JWT or random token
  expiresAt: Date;
  createdAt: Date;
}
```

### FriendInvite Model

```typescript
interface FriendInvite {
  id: string;
  fromUserId: string;
  toUserId: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: Date;
  respondedAt?: Date;
}
```

### Friend Model

```typescript
interface Friend {
  id: string;
  userId: string;
  friendId: string;
  acceptedAt: Date;
  createdAt: Date;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Password Security
*For any* user registration, the stored password hash should never match the plain text password
**Validates: Requirements 7.1, 7.3**

### Property 2: Session Validity
*For any* valid session token, validating it should return the correct user
**Validates: Requirements 8.1, 8.2**

### Property 3: Invite Uniqueness
*For any* two users, there should be at most one pending invite from user A to user B at any time
**Validates: Requirements 4.4**

### Property 4: Friend Symmetry
*For any* two users who are friends, the friendship should exist in both directions (A→B and B→A)
**Validates: Requirements 9.1**

### Property 5: Invite Count Accuracy
*For any* user, the notification badge count should equal the number of pending invites
**Validates: Requirements 10.1, 10.3**

### Property 6: Authentication Required
*For any* protected endpoint, requests without valid session tokens should be rejected
**Validates: Requirements 8.5**

### Property 7: Password Strength
*For any* password submission, passwords shorter than 8 characters should be rejected
**Validates: Requirements 7.5**

### Property 8: Invite Status Transition
*For any* invite, once accepted or declined, it should not return to pending status
**Validates: Requirements 5.4, 5.5**

## Error Handling

### Authentication Errors
- **INVALID_CREDENTIALS**: Username or password incorrect
- **USERNAME_TAKEN**: Username already exists during signup
- **WEAK_PASSWORD**: Password doesn't meet security requirements
- **SESSION_EXPIRED**: Session token has expired
- **SESSION_INVALID**: Session token is invalid or doesn't exist

### Friend Invite Errors
- **INVITE_EXISTS**: Invite already sent to this user
- **ALREADY_FRIENDS**: Users are already friends
- **SELF_INVITE**: Cannot send invite to yourself
- **USER_NOT_FOUND**: Target user doesn't exist
- **INVITE_NOT_FOUND**: Invite ID doesn't exist
- **UNAUTHORIZED**: User not authorized to accept/decline this invite

## Testing Strategy

### Unit Tests
- Password hashing and verification
- Session token generation and validation
- Invite creation and status updates
- Friend list retrieval
- Badge count calculation

### Property-Based Tests
- Password security (Property 1)
- Session validity (Property 2)
- Invite uniqueness (Property 3)
- Friend symmetry (Property 4)
- Badge count accuracy (Property 5)
- Authentication requirements (Property 6)
- Password strength (Property 7)
- Invite status transitions (Property 8)

### Integration Tests
- Complete signup flow
- Complete login flow
- Send and accept invite flow
- Send and decline invite flow
- Session persistence across page refresh

## Security Considerations

### Password Storage
- Use bcrypt with salt rounds of 10 or higher
- Never log or transmit passwords in plain text
- Implement rate limiting on login attempts

### Session Management
- Use secure, random tokens (UUID v4 or JWT)
- Set reasonable expiration times (24 hours)
- Implement token refresh mechanism
- Clear sessions on logout

### API Security
- Validate all inputs
- Use HTTPS in production
- Implement CSRF protection
- Rate limit sensitive endpoints

## UI/UX Flow

### Login Flow
1. User visits login page
2. Enters username and password
3. Clicks login button
4. System validates credentials
5. On success: Create session, redirect to chat
6. On failure: Show error message

### Signup Flow
1. User visits signup page
2. Enters username (checks availability in real-time)
3. Enters nickname
4. Enters password (shows strength indicator)
5. Confirms password
6. Clicks signup button
7. System creates account
8. Auto-login and redirect to chat

### Friend Invite Flow
1. User searches for another user
2. Clicks "Invite" button
3. System sends invite
4. Target user sees red notification badge
5. Target user clicks badge
6. Modal shows invite with Accept/Decline buttons
7. On Accept: Opens direct chat
8. On Decline: Removes invite

### Notification Badge
- Red circle in top-right of UI
- Shows count of pending invites
- Animates when new invite arrives
- Clicking opens invite modal
- Badge disappears when count reaches 0

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) UNIQUE NOT NULL,
  nickname VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  avatar VARCHAR(500),
  bio TEXT,
  is_online BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  last_seen TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_username ON users(username);
```

### Sessions Table
```sql
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
```

### Friend Invites Table
```sql
CREATE TABLE friend_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  responded_at TIMESTAMP,
  CONSTRAINT unique_invite UNIQUE(from_user_id, to_user_id, status),
  CONSTRAINT no_self_invite CHECK(from_user_id != to_user_id)
);

CREATE INDEX idx_invites_to_user ON friend_invites(to_user_id, status);
CREATE INDEX idx_invites_from_user ON friend_invites(from_user_id);
```

### Friends Table
```sql
CREATE TABLE friends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  accepted_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_friendship UNIQUE(user_id, friend_id),
  CONSTRAINT no_self_friend CHECK(user_id != friend_id)
);

CREATE INDEX idx_friends_user_id ON friends(user_id);
CREATE INDEX idx_friends_friend_id ON friends(friend_id);
```

## Socket Events

### New Socket Events

#### Client → Server
- `friend:invite` - Send friend invite
- `friend:accept` - Accept friend invite
- `friend:decline` - Decline friend invite

#### Server → Client
- `friend:invite:received` - New invite received
- `friend:invite:accepted` - Your invite was accepted
- `friend:invite:declined` - Your invite was declined
- `friend:online` - Friend came online
- `friend:offline` - Friend went offline

## Implementation Notes

### Phase 1: Authentication
1. Add password field to User model
2. Implement AuthService with bcrypt
3. Create login.html and signup.html
4. Add session management
5. Update API routes for auth

### Phase 2: Friend System
1. Create FriendManager
2. Add database tables
3. Implement invite API endpoints
4. Add socket events for real-time updates

### Phase 3: UI Components
1. Create notification badge component
2. Build invite modal
3. Add friend list to sidebar
4. Enhance user search with invite button

### Phase 4: Integration
1. Connect all components
2. Add real-time notifications
3. Test complete flows
4. Polish UI/UX
