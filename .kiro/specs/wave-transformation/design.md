# Design Document - Wave Transformation

## Overview

Wave transforms Flux Messenger into a comprehensive communication platform with voice/video calling, music streaming, clans, AI assistance, and rich user profiles. The system maintains the existing real-time messaging infrastructure while adding new features through modular services and managers.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (PWA)                        │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────┐  │
│  │  Chat    │  Calls   │  Music   │  Clans   │ Profile  │  │
│  └──────────┴──────────┴──────────┴──────────┴──────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    WebSocket + REST API                      │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────┐  │
│  │ Messages │  Calls   │  Music   │  Clans   │  Users   │  │
│  └──────────┴──────────┴──────────┴──────────┴──────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│   Supabase   │   │    Agora     │   │   OpenAI     │
│   Database   │   │  Voice/Video │   │      AI      │
│   + Storage  │   │              │   │   Assistant  │
└──────────────┘   └──────────────┘   └──────────────┘
```

### Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+), PWA APIs
- **Backend**: Node.js, Express, Socket.IO, TypeScript
- **Database**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage
- **Voice/Video**: Agora Web SDK
- **AI**: OpenAI API (optional)
- **Deployment**: Netlify (serverless functions)

## Components and Interfaces

### 1. Design System Module

**Purpose**: Manage theme and visual styling

**Interface**:
```typescript
interface ThemeConfig {
  primary: string;      // Blue shades
  secondary: string;    // Cyan shades
  accent: string;       // Light blue
  background: string;
  text: string;
}

class ThemeManager {
  applyTheme(config: ThemeConfig): void;
  removeGreenColors(): void;
  addWaveAnimations(): void;
}
```

### 2. Agora Service

**Purpose**: Handle voice and video calling

**Interface**:
```typescript
interface CallConfig {
  appId: string;
  channel: string;
  token: string;
  uid: number;
}

interface CallParticipant {
  userId: string;
  username: string;
  audioEnabled: boolean;
  videoEnabled: boolean;
}

class AgoraService {
  initializeClient(appId: string): Promise<void>;
  joinVoiceCall(config: CallConfig): Promise<void>;
  joinVideoCall(config: CallConfig): Promise<void>;
  leaveCall(): Promise<void>;
  toggleAudio(enabled: boolean): void;
  toggleVideo(enabled: boolean): void;
  startScreenShare(): Promise<void>;
  stopScreenShare(): void;
  getParticipants(): CallParticipant[];
}
```

### 3. Call Manager

**Purpose**: Manage call state and signaling

**Interface**:
```typescript
interface Call {
  id: string;
  type: 'voice' | 'video';
  participants: string[];
  startTime: Date;
  endTime?: Date;
  duration?: number;
  status: 'ringing' | 'active' | 'ended' | 'missed';
}

class CallManager {
  initiateCall(toUserId: string, type: 'voice' | 'video'): Promise<Call>;
  acceptCall(callId: string): Promise<void>;
  rejectCall(callId: string): Promise<void>;
  endCall(callId: string): Promise<void>;
  getCallHistory(userId: string): Promise<Call[]>;
  saveCallRecord(call: Call): Promise<void>;
}
```

### 4. Voice Recorder Service

**Purpose**: Record and process voice messages

**Interface**:
```typescript
interface VoiceMessage {
  id: string;
  userId: string;
  audioUrl: string;
  duration: number;
  waveform: number[];
  transcription?: string;
  createdAt: Date;
}

class VoiceRecorder {
  startRecording(): Promise<void>;
  stopRecording(): Promise<Blob>;
  uploadVoiceMessage(audio: Blob): Promise<VoiceMessage>;
  generateWaveform(audio: Blob): Promise<number[]>;
  transcribeAudio(audio: Blob): Promise<string>;
}
```

### 5. AI Service

**Purpose**: Process AI commands and generate responses

**Interface**:
```typescript
interface AICommand {
  type: 'search' | 'translate' | 'summarize' | 'generate';
  content: string;
  parameters?: Record<string, any>;
}

interface AIResponse {
  success: boolean;
  result: string;
  metadata?: Record<string, any>;
}

class AIService {
  parseCommand(message: string): AICommand | null;
  processCommand(command: AICommand): Promise<AIResponse>;
  search(query: string): Promise<string>;
  translate(text: string, targetLang: string): Promise<string>;
  summarize(text: string): Promise<string>;
  generateLink(description: string): Promise<string>;
}
```

### 6. Clan Manager

**Purpose**: Manage clans and memberships

**Interface**:
```typescript
interface Clan {
  id: string;
  name: string;
  tag: string;
  description: string;
  ownerId: string;
  createdAt: Date;
}

interface ClanMember {
  clanId: string;
  userId: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: Date;
}

class ClanManager {
  createClan(name: string, tag: string, ownerId: string): Promise<Clan>;
  joinClan(clanId: string, userId: string): Promise<void>;
  leaveClan(clanId: string, userId: string): Promise<void>;
  getClanMembers(clanId: string): Promise<ClanMember[]>;
  getUserClan(userId: string): Promise<Clan | null>;
  searchClans(query: string): Promise<Clan[]>;
  sendClanMessage(clanId: string, userId: string, content: string): Promise<void>;
}
```

### 7. Music Manager

**Purpose**: Handle music upload, storage, and streaming

**Interface**:
```typescript
interface MusicTrack {
  id: string;
  userId: string;
  title: string;
  artist: string;
  album?: string;
  duration: number;
  fileUrl: string;
  isPublic: boolean;
  createdAt: Date;
}

interface Playlist {
  id: string;
  userId: string;
  name: string;
  description?: string;
  tracks: string[];
  isPublic: boolean;
  createdAt: Date;
}

class MusicManager {
  uploadTrack(file: File, userId: string, isPro: boolean): Promise<MusicTrack>;
  extractMetadata(file: File): Promise<{ title: string; artist: string; album: string; duration: number }>;
  createPlaylist(userId: string, name: string): Promise<Playlist>;
  addTrackToPlaylist(playlistId: string, trackId: string): Promise<void>;
  getPlaylist(playlistId: string): Promise<Playlist>;
  streamTrack(trackId: string): Promise<ReadableStream>;
  downloadTrack(trackId: string, userId: string, isPro: boolean): Promise<Blob>;
  deleteFromCloud(trackId: string): Promise<void>;
}
```

### 8. Status Manager

**Purpose**: Manage user presence and activity

**Interface**:
```typescript
interface UserStatus {
  userId: string;
  statusType: 'online' | 'idle' | 'dnd' | 'offline';
  customStatus?: string;
  activityType?: 'playing' | 'listening' | 'watching';
  activityName?: string;
  autoStatus: boolean;
  updatedAt: Date;
}

class StatusManager {
  setStatus(userId: string, status: Partial<UserStatus>): Promise<void>;
  getStatus(userId: string): Promise<UserStatus>;
  setAutoIdle(userId: string, minutes: number): void;
  detectActivity(userId: string): Promise<{ type: string; name: string } | null>;
  broadcastStatus(userId: string, status: UserStatus): void;
}
```

### 9. Profile Manager

**Purpose**: Manage user profiles and customization

**Interface**:
```typescript
interface UserProfile {
  userId: string;
  bio?: string;
  socialLinks: { platform: string; url: string }[];
  badges: string[];
  themeSettings: {
    primaryColor: string;
    accentColor: string;
  };
  profileEffects: string[];
  updatedAt: Date;
}

class ProfileManager {
  getProfile(userId: string): Promise<UserProfile>;
  updateBio(userId: string, bio: string): Promise<void>;
  addSocialLink(userId: string, platform: string, url: string): Promise<void>;
  addBadge(userId: string, badgeId: string): Promise<void>;
  updateTheme(userId: string, theme: { primaryColor: string; accentColor: string }): Promise<void>;
}
```

### 10. Subscription Manager

**Purpose**: Handle Pro subscriptions

**Interface**:
```typescript
interface Subscription {
  userId: string;
  tier: 'free' | 'pro';
  startDate: Date;
  endDate?: Date;
  autoRenew: boolean;
}

class SubscriptionManager {
  getSubscription(userId: string): Promise<Subscription>;
  upgradeToPro(userId: string): Promise<void>;
  downgradeToFree(userId: string): Promise<void>;
  isPro(userId: string): Promise<boolean>;
  checkFeatureAccess(userId: string, feature: string): Promise<boolean>;
}
```

## Data Models

### Database Schema Extensions

```sql
-- Clans
CREATE TABLE clans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  tag TEXT UNIQUE NOT NULL CHECK (length(tag) <= 6),
  description TEXT,
  owner_id UUID REFERENCES flux_users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE clan_members (
  clan_id UUID REFERENCES clans(id) ON DELETE CASCADE,
  user_id UUID REFERENCES flux_users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (clan_id, user_id)
);

CREATE TABLE clan_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clan_id UUID REFERENCES clans(id) ON DELETE CASCADE,
  user_id UUID REFERENCES flux_users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Music
CREATE TABLE music_tracks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES flux_users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  album TEXT,
  duration INTEGER NOT NULL,
  file_url TEXT NOT NULL,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE playlists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES flux_users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE playlist_tracks (
  playlist_id UUID REFERENCES playlists(id) ON DELETE CASCADE,
  track_id UUID REFERENCES music_tracks(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (playlist_id, track_id)
);

-- Status
CREATE TABLE user_status (
  user_id UUID PRIMARY KEY REFERENCES flux_users(id) ON DELETE CASCADE,
  status_type TEXT NOT NULL CHECK (status_type IN ('online', 'idle', 'dnd', 'offline')),
  custom_status TEXT,
  activity_type TEXT CHECK (activity_type IN ('playing', 'listening', 'watching')),
  activity_name TEXT,
  auto_status BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Profiles
CREATE TABLE user_profiles (
  user_id UUID PRIMARY KEY REFERENCES flux_users(id) ON DELETE CASCADE,
  bio TEXT,
  social_links JSONB DEFAULT '[]',
  badges JSONB DEFAULT '[]',
  theme_settings JSONB DEFAULT '{"primaryColor": "#3b82f6", "accentColor": "#06b6d4"}',
  profile_effects JSONB DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Calls
CREATE TABLE call_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL CHECK (type IN ('voice', 'video')),
  participants JSONB NOT NULL,
  initiator_id UUID REFERENCES flux_users(id),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  duration INTEGER,
  status TEXT NOT NULL CHECK (status IN ('completed', 'missed', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subscriptions
CREATE TABLE subscriptions (
  user_id UUID PRIMARY KEY REFERENCES flux_users(id) ON DELETE CASCADE,
  tier TEXT NOT NULL CHECK (tier IN ('free', 'pro')),
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  auto_renew BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Voice Messages
CREATE TABLE voice_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES flux_users(id) ON DELETE CASCADE,
  audio_url TEXT NOT NULL,
  duration INTEGER NOT NULL,
  waveform JSONB,
  transcription TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Theme Consistency
*For any* page or component in the application, all color values should be from the blue/cyan palette and no green colors should be present.
**Validates: Requirements 1.1, 1.2**

### Property 2: Call Connection Integrity
*For any* voice or video call, when a user initiates a call, the Agora connection should be established before the call status changes to "active".
**Validates: Requirements 2.1, 3.1**

### Property 3: Call History Completeness
*For any* completed call, a call record should exist in the database with all required fields (participants, duration, timestamp).
**Validates: Requirements 15.1**

### Property 4: Voice Message Upload Success
*For any* recorded voice message, uploading should result in a valid Supabase Storage URL and database record.
**Validates: Requirements 4.5**

### Property 5: AI Command Parsing
*For any* message starting with "@ai", the system should correctly parse the command type and parameters.
**Validates: Requirements 6.1**

### Property 6: Clan Tag Uniqueness
*For any* two clans, their tags should be unique across the entire system.
**Validates: Requirements 7.1**

### Property 7: Clan Membership Display
*For any* user who is a clan member, their clan tag should appear next to their username in all contexts.
**Validates: Requirements 7.2, 7.4**

### Property 8: Music Upload Authorization
*For any* music upload attempt, only Pro users should successfully upload, and Free users should receive an error.
**Validates: Requirements 8.3**

### Property 9: Music Streaming Access
*For any* music track, both Free and Pro users should be able to stream it.
**Validates: Requirements 8.2**

### Property 10: Offline Download Authorization
*For any* download attempt, only Pro users should successfully download tracks, and Free users should receive an error.
**Validates: Requirements 9.4**

### Property 11: Status Auto-Update
*For any* user who is inactive for 5 minutes, their status should automatically change to "idle".
**Validates: Requirements 10.2**

### Property 12: Status Real-Time Broadcast
*For any* status change, all connected clients viewing that user should receive the update within 1 second.
**Validates: Requirements 10.5**

### Property 13: Profile Badge Persistence
*For any* badge added to a user profile, it should persist in the database and display on subsequent profile views.
**Validates: Requirements 11.3**

### Property 14: PWA Installation
*For any* mobile device, visiting Wave should trigger an installation prompt.
**Validates: Requirements 12.1**

### Property 15: Subscription Feature Access
*For any* premium feature, Pro users should have access and Free users should see upgrade prompts.
**Validates: Requirements 14.2, 14.3**

## Error Handling

### Call Errors
- Network disconnection during call → Attempt reconnection, show notification
- Agora token expiration → Refresh token automatically
- Microphone/camera permission denied → Show clear error message with instructions

### Music Errors
- Upload fails → Retry with exponential backoff, show progress
- Streaming interrupted → Buffer and resume playback
- Storage quota exceeded → Notify user, suggest cleanup

### AI Errors
- API timeout → Show "AI is thinking..." then timeout message after 10s
- Invalid command → Show command help and examples
- Rate limit exceeded → Queue requests and notify user

### Clan Errors
- Duplicate tag → Suggest alternative tags
- Permission denied → Show clear error about required role
- Clan full → Show member limit and upgrade options

## Testing Strategy

### Unit Testing
- Test each manager class independently with mocked dependencies
- Test API endpoints with mock data
- Test UI components in isolation

### Integration Testing
- Test Agora SDK integration with test channels
- Test Supabase queries with test database
- Test WebSocket events end-to-end

### Property-Based Testing
- Use fast-check library for TypeScript
- Generate random test data for properties
- Run 100+ iterations per property test
- Each property test should reference its design document property number

### Manual Testing
- Test voice/video calls with multiple users
- Test music upload and streaming
- Test PWA installation on various devices
- Test theme consistency across all pages

### Performance Testing
- Load test with 100+ concurrent users
- Test music streaming with multiple simultaneous streams
- Test WebSocket scalability
- Monitor Agora call quality metrics
