# Authentication and Friend Invites - Requirements

## Introduction

This feature adds proper user authentication with login/signup flows, password protection, and a friend invitation system that allows users to connect and chat without needing room codes.

## Glossary

- **System**: The WAVE messaging application
- **User**: A person using the messaging application
- **Friend Invite**: A request from one user to another to establish a direct messaging connection
- **Notification Badge**: A visual indicator (red circle) showing pending invites
- **Authentication**: The process of verifying user identity with username and password

## Requirements

### Requirement 1: User Registration

**User Story:** As a new user, I want to create an account with a username and password, so that I can securely access the messaging system.

#### Acceptance Criteria

1. WHEN a user visits the signup page THEN the system SHALL display fields for username, nickname, and password
2. WHEN a user submits the signup form with valid data THEN the system SHALL create a new account and hash the password
3. WHEN a user attempts to register with an existing username THEN the system SHALL reject the registration and display an error message
4. WHEN a user successfully registers THEN the system SHALL automatically log them in and redirect to the chat interface
5. WHEN a user enters a password THEN the system SHALL display password strength indicators

### Requirement 2: User Login

**User Story:** As a registered user, I want to log in with my username and password, so that I can access my account and messages.

#### Acceptance Criteria

1. WHEN a user visits the login page THEN the system SHALL display fields for username and password
2. WHEN a user submits valid credentials THEN the system SHALL authenticate them and grant access to the chat interface
3. WHEN a user submits invalid credentials THEN the system SHALL reject the login and display an error message
4. WHEN a user successfully logs in THEN the system SHALL store their session and maintain login state
5. WHEN a logged-in user refreshes the page THEN the system SHALL restore their session without requiring re-login

### Requirement 3: Optional Room Code

**User Story:** As a logged-in user, I want to access the chat interface without entering a room code, so that I can start messaging friends directly.

#### Acceptance Criteria

1. WHEN a user logs in successfully THEN the system SHALL allow access to the chat interface without requiring a room code
2. WHEN a user wants to join a specific room THEN the system SHALL provide an option to enter a room code
3. WHEN a user is in the chat interface THEN the system SHALL display their direct messages and available rooms

### Requirement 4: Friend Search and Invite

**User Story:** As a user, I want to search for other users and send them friend invites, so that I can connect with people I want to chat with.

#### Acceptance Criteria

1. WHEN a user searches for another user by username THEN the system SHALL display matching users with an "Invite" button
2. WHEN a user clicks the "Invite" button THEN the system SHALL send a friend invite to the target user
3. WHEN a friend invite is sent THEN the system SHALL notify the sender of successful delivery
4. WHEN a user has already sent an invite to another user THEN the system SHALL disable the invite button and show "Pending" status
5. WHEN users are already friends THEN the system SHALL show a "Chat" button instead of "Invite"

### Requirement 5: Friend Invite Notifications

**User Story:** As a user, I want to see when someone sends me a friend invite, so that I can accept or decline connection requests.

#### Acceptance Criteria

1. WHEN a user receives a friend invite THEN the system SHALL display a red notification badge on the UI
2. WHEN a user clicks the notification badge THEN the system SHALL display a modal with pending invites
3. WHEN viewing an invite THEN the system SHALL show the sender's username and options to accept or decline
4. WHEN a user accepts an invite THEN the system SHALL establish a friend connection and open a direct chat
5. WHEN a user declines an invite THEN the system SHALL remove the invite and notify the sender

### Requirement 6: Friend Invite Modal

**User Story:** As a user, I want to review friend invites in a clear interface, so that I can make informed decisions about accepting connections.

#### Acceptance Criteria

1. WHEN the invite modal opens THEN the system SHALL display all pending invites with sender information
2. WHEN displaying an invite THEN the system SHALL show the sender's username, nickname, and timestamp
3. WHEN a user accepts an invite THEN the system SHALL close the modal and open a chat with the new friend
4. WHEN a user declines an invite THEN the system SHALL remove it from the list without opening a chat
5. WHEN there are no pending invites THEN the system SHALL display a message indicating no invites

### Requirement 7: Password Security

**User Story:** As a user, I want my password to be stored securely, so that my account is protected from unauthorized access.

#### Acceptance Criteria

1. WHEN a user creates a password THEN the system SHALL hash it using bcrypt before storage
2. WHEN a user logs in THEN the system SHALL compare the hashed password securely
3. WHEN storing passwords THEN the system SHALL never store passwords in plain text
4. WHEN a password is transmitted THEN the system SHALL use HTTPS to prevent interception
5. WHEN a user creates a password THEN the system SHALL enforce minimum security requirements (8+ characters)

### Requirement 8: Session Management

**User Story:** As a user, I want my login session to persist across page refreshes, so that I don't have to log in repeatedly.

#### Acceptance Criteria

1. WHEN a user logs in THEN the system SHALL create a session token
2. WHEN a user refreshes the page THEN the system SHALL validate the session token and restore the user state
3. WHEN a session expires THEN the system SHALL redirect the user to the login page
4. WHEN a user logs out THEN the system SHALL invalidate the session token
5. WHEN a session token is invalid THEN the system SHALL require re-authentication

### Requirement 9: Friend List Management

**User Story:** As a user, I want to see a list of my friends, so that I can easily start conversations with them.

#### Acceptance Criteria

1. WHEN a user views their friend list THEN the system SHALL display all accepted friend connections
2. WHEN displaying friends THEN the system SHALL show their online/offline status
3. WHEN a user clicks on a friend THEN the system SHALL open a direct chat with that friend
4. WHEN a friend comes online THEN the system SHALL update their status in real-time
5. WHEN a friend goes offline THEN the system SHALL update their status and show last seen time

### Requirement 10: Notification Badge Counter

**User Story:** As a user, I want to see the number of pending invites, so that I know how many requests I need to review.

#### Acceptance Criteria

1. WHEN a user has pending invites THEN the system SHALL display a red badge with the count
2. WHEN the invite count is zero THEN the system SHALL hide the notification badge
3. WHEN a user accepts or declines an invite THEN the system SHALL update the badge count immediately
4. WHEN a new invite arrives THEN the system SHALL increment the badge count in real-time
5. WHEN the badge count exceeds 9 THEN the system SHALL display "9+" instead of the exact number
