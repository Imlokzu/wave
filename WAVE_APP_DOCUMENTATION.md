# Wave Messenger - Complete Application Documentation

## Overview
Wave is a modern real-time messaging platform with AI integration, music streaming, Telegram feed aggregation, and Pro subscription features. Built with Node.js, Express, Socket.IO, and Supabase.

## Tech Stack
- **Backend**: Node.js, Express, TypeScript
- **Database**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage
- **Real-time**: Socket.IO
- **Frontend**: Vanilla JS, TailwindCSS
- **AI**: DeepSeek, OpenRouter integration
- **External APIs**: DuckDuckGo Search, Weather, Location

## Architecture

### Ports
- Main Server: `3001`
- Admin Server: `3004`

### Key Components
1. **Authentication System** - Custom JWT-based auth
2. **Messaging System** - Real-time chat with Socket.IO
3. **AI Chat** - Multi-model AI with web search
4. **Music System** - Pro user uploads to Supabase Storage
5. **Feed System** - Telegram channel aggregation
6. **Admin Panel** - User management, reports, moderation
7. **Pro Subscription** - Tiered feature access

---

## Features

### 1. Authentication & Users
**Files**: `src/routes/auth.ts`, `src/middleware/auth.ts`, `src/managers/UserManager.ts`

**Features**:
- Username/password authentication
- JWT token-based sessions
- Friend invites system
- User profiles with bio, theme, social links
- Avatar uploads

**Database Tables**:
- `flux_users` - User accounts
- `sessions` - Active sessions
- `friend_invites` - Pending friend requests
- `friends` - Accepted friendships

**Endpoints**:
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### 2. Messaging System
**Files**: `src/socket/socketHandler.ts`, `src/managers/MessageManager.ts`, `src/routes/messages.ts`

**Features**:
- Real-time messaging via Socket.IO
- Direct messages (DMs)
- Group chats (rooms)
- Message reactions
- File attachments
- Read receipts
- Typing indicators

**Database Tables**:
- `messages` - All messages
- `rooms` - Chat rooms
- `room_members` - Room membership
- `direct_messages` - DM metadata

**Socket Events**:
- `message:send` - Send message
- `message:edit` - Edit message
- `message:delete` - Delete message
- `message:react` - Add reaction
- `typing:start` / `typing:stop` - Typing indicators

### 3. AI Chat System
**Files**: `src/routes/ai.ts`, `src/services/DeepSeekAIService.ts`, `src/services/SearchService.ts`

**Features**:
- Multi-model AI support (DeepSeek, OpenRouter models)
- Web search integration (DuckDuckGo)
- Full page content extraction for accurate answers
- Weather and location services
- Conversation history
- Model selection in settings

**AI Models**:
- **Free**: Llama 3.2 3B, Gemini Flash 2.0, Gemini Flash 2.0 Exp
- **Pro**: GPT-4o, Claude 3.5 Sonnet, Gemini Pro 1.5, DeepSeek V3, and 12 more

**Database Tables**:
- `ai_conversations` - Conversation threads
- `ai_messages` - Individual AI messages

**Endpoints**:
- `POST /api/ai/message` - Send AI message
- `GET /api/ai/conversations` - Get conversations
- `GET /api/ai/models` - Get available models

**Search Enhancement**:
- Fetches full page content (not just snippets)
- Extracts paragraphs, lists, tables, headings
- Removes ads, scripts, navigation
- ~8000 chars per page vs ~100 char snippets
- Prevents AI hallucination with real data

### 4. Music System (Pro Feature)
**Files**: `src/routes/music.ts`, `src/managers/MusicManager.ts`, `public/music.html`

**Features**:
- Pro users upload music to Supabase Storage
- Automatic metadata extraction (title, artist, album, duration)
- Public/private tracks
- Playlist creation and management
- Streaming for all users
- Offline download for Pro users
- Play count and download tracking

**Database Tables**:
- `music_tracks` - Uploaded tracks
- `playlists` - User playlists
- `playlist_tracks` - Playlist-track relationships

**Storage**:
- Bucket: `flux-music`
- Path: `music/{userId}/{trackId}_{filename}`
- Max size: 50MB
- Formats: MP3, WAV, FLAC

**Endpoints**:
- `POST /api/music/upload` - Upload track (Pro only)
- `GET /api/music/tracks` - Get user tracks
- `GET /api/music/stream/:trackId` - Stream track
- `POST /api/music/download/:trackId` - Download track (Pro only)
- `POST /api/music/playlist` - Create playlist
- `GET /api/music/playlists` - Get playlists

### 5. Telegram Feed System
**Files**: `src/routes/feed.ts`, `src/services/TelegramFeedService.ts`, `feed-bot/`

**Features**:
- Subscribe to Telegram channels
- Automated feed updates via bot
- Message parsing (text, images, videos, buttons)
- Inline button URL extraction
- Feed filtering and search

**Database Tables**:
- `telegram_subscriptions` - User subscriptions
- `telegram_feed_messages` - Cached messages

**Endpoints**:
- `POST /api/feed/subscribe` - Subscribe to channel
- `GET /api/feed/subscriptions` - Get subscriptions
- `GET /api/feed/messages` - Get feed messages
- `DELETE /api/feed/unsubscribe/:id` - Unsubscribe

**Bot Setup**:
- Bot token in `.env` as `TELEGRAM_BOT_TOKEN`
- Webhook URL: `https://yourdomain.com/api/feed/webhook`
- Run: `node feed-bot/index.js`

### 6. Pro Subscription System
**Files**: `src/routes/subscription.ts`, `src/managers/SubscriptionManager.ts`

**Features**:
- Free and Pro tiers
- Feature gating
- Subscription status tracking
- Pro badge display
- Gift Pro to friends

**Database Tables**:
- `subscriptions` - User subscriptions
- `flux_users.is_pro` - Quick Pro status check

**Pro Features**:
- Music upload and download
- Advanced AI models (GPT-4o, Claude, etc.)
- Offline music storage
- Priority support
- Custom themes

**Endpoints**:
- `GET /api/subscription/status` - Get subscription status
- `POST /api/subscription/upgrade` - Upgrade to Pro
- `POST /api/subscription/downgrade` - Downgrade to Free

### 7. Admin Panel
**Files**: `admin/`, `src/routes/admin.ts`, `src/routes/reports.ts`

**Features**:
- User management
- Report moderation
- Ban/unban users
- View statistics
- System monitoring

**Database Tables**:
- `reports` - User reports
- `bans` - Banned users
- `flux_users.is_admin` - Admin flag

**Endpoints**:
- `GET /api/admin/users` - List users
- `GET /api/admin/reports` - List reports
- `POST /api/admin/ban` - Ban user
- `POST /api/admin/unban` - Unban user

**Access**:
- Admin panel: `http://localhost:3004`
- Login with admin credentials
- Set admin: `UPDATE flux_users SET is_admin = TRUE WHERE username = 'lokzu2';`

### 8. Profile & Settings
**Files**: `src/routes/profile.ts`, `src/routes/settings.ts`, `public/settings.html`

**Features**:
- Bio and status
- Avatar upload
- Theme customization (primary/accent colors)
- Social links (Twitter, Instagram, GitHub, etc.)
- Privacy settings
- Notification preferences
- AI model selection
- Storage management

**Database Tables**:
- `user_profiles` - Extended profile data
- `user_avatars` - Avatar metadata

**Endpoints**:
- `GET /api/profile/me` - Get profile
- `PUT /api/profile/bio` - Update bio
- `PUT /api/profile/theme` - Update theme
- `POST /api/profile/social-link` - Add social link
- `POST /api/profile/avatar` - Upload avatar

---

## Database Schema

### Core Tables
```sql
flux_users (id, username, password_hash, email, is_pro, is_admin, created_at)
sessions (id, user_id, token, expires_at)
friends (id, user_id, friend_id, accepted_at)
friend_invites (id, from_user_id, to_user_id, status)
```

### Messaging Tables
```sql
messages (id, room_id, user_id, content, created_at)
rooms (id, name, type, created_by)
room_members (room_id, user_id, joined_at)
direct_messages (id, user1_id, user2_id, last_message_at)
```

### Feature Tables
```sql
ai_conversations (id, user_id, title, created_at)
ai_messages (id, conversation_id, role, content)
music_tracks (id, user_id, title, artist, file_url, is_public)
playlists (id, user_id, name, track_count)
telegram_subscriptions (id, user_id, channel_username)
telegram_feed_messages (id, subscription_id, message_text, media_url)
subscriptions (id, user_id, tier, start_date, end_date)
reports (id, reporter_id, reported_user_id, reason, status)
bans (id, user_id, banned_by, reason, expires_at)
user_profiles (user_id, bio, theme_primary, theme_accent)
```

---

## Setup & Deployment

### Prerequisites
- Node.js 18+
- Supabase account
- Telegram Bot Token (for feed feature)
- OpenRouter API Key (for AI)

### Environment Variables (.env)
```env
PORT=3001
ADMIN_PORT=3004
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
JWT_SECRET=your-secret-key
TELEGRAM_BOT_TOKEN=your-bot-token
OPENROUTER_API_KEY=your-openrouter-key
DEEPSEEK_API_KEY=your-deepseek-key
```

### Installation
```bash
npm install
npm run build
npm start
```

### Database Setup
Run migrations in order:
1. `001_add_auth_tables.sql` - Auth system
2. `002_add_subscriptions_table.sql` - Subscriptions
3. `003_add_telegram_feed_tables_fixed.sql` - Feed system
4. `005_add_ai_bot_user.sql` - AI bot user
5. `006_add_pro_status_to_users.sql` - Pro status
6. `008_complete_pro_setup.sql` - Complete Pro setup
7. `009_add_ai_conversations_table.sql` - AI conversations
8. `011_add_user_avatars.sql` - Avatars
9. `012_add_user_profiles_table.sql` - Profiles
10. `013_add_reports_and_bans.sql` - Reports/bans
11. `014_add_music_tables.sql` - Music system
12. `fix-music-rls.sql` - Disable RLS for music tables

### Supabase Storage Buckets
Create these buckets:
- `avatars` - User avatars (public)
- `files` - Message attachments (private)
- `flux-music` - Music uploads (public for streaming)

### Make User Pro
```sql
UPDATE flux_users SET is_pro = TRUE WHERE username = 'lokzu2';
```

### Make User Admin
```sql
UPDATE flux_users SET is_admin = TRUE WHERE username = 'lokzu2';
```

---

## API Reference

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Messaging
- `GET /api/messages/:roomId` - Get room messages
- `POST /api/messages` - Send message
- `PUT /api/messages/:id` - Edit message
- `DELETE /api/messages/:id` - Delete message

### AI
- `POST /api/ai/message` - Send AI message
- `GET /api/ai/conversations` - Get conversations
- `GET /api/ai/models` - Get available models
- `GET /api/ai/status` - Get AI status

### Music
- `POST /api/music/upload` - Upload track (Pro)
- `GET /api/music/tracks` - Get user tracks
- `GET /api/music/stream/:trackId` - Stream track
- `POST /api/music/download/:trackId` - Download (Pro)
- `POST /api/music/playlist` - Create playlist
- `GET /api/music/playlists` - Get playlists

### Feed
- `POST /api/feed/subscribe` - Subscribe to channel
- `GET /api/feed/subscriptions` - Get subscriptions
- `GET /api/feed/messages` - Get feed messages
- `DELETE /api/feed/unsubscribe/:id` - Unsubscribe

### Profile
- `GET /api/profile/me` - Get profile
- `PUT /api/profile/bio` - Update bio
- `PUT /api/profile/theme` - Update theme
- `POST /api/profile/avatar` - Upload avatar

### Subscription
- `GET /api/subscription/status` - Get status
- `POST /api/subscription/upgrade` - Upgrade to Pro
- `POST /api/subscription/downgrade` - Downgrade

### Admin
- `GET /api/admin/users` - List users
- `GET /api/admin/reports` - List reports
- `POST /api/admin/ban` - Ban user
- `POST /api/admin/unban` - Unban user

---

## Frontend Pages

### Public Pages
- `/login.html` - Login page
- `/signup.html` - Registration page
- `/terms.html` - Terms of service
- `/privacy.html` - Privacy policy
- `/help.html` - Help center

### Authenticated Pages
- `/chat.html` - Main chat interface
- `/ai-chat.html` - AI chat interface
- `/music.html` - Music player & playlists
- `/feed.html` - Telegram feed
- `/profile.html` - User profile
- `/settings.html` - Settings page
- `/gift-pro.html` - Gift Pro subscription
- `/report-bug.html` - Bug reporting
- `/changelog.html` - App changelog

### Mobile Pages
- `/mobile/chat.html` - Mobile chat
- `/mobile/aichat.html` - Mobile AI chat
- `/mobile/feed.html` - Mobile feed
- `/mobile/playlist.html` - Mobile playlists
- `/mobile/settings.html` - Mobile settings

### Admin Pages
- `/admin/login.html` - Admin login
- `/admin/index.html` - Admin dashboard

---

## Key Features Implementation

### Real-time Messaging
Uses Socket.IO for bidirectional communication. Messages are stored in Supabase and broadcast to connected clients.

### AI Search Enhancement
Fetches full page content instead of snippets to prevent hallucination. Extracts structured data (tables, lists) for accurate specs.

### Music Upload Flow
1. User selects audio file
2. Frontend validates (type, size)
3. Backend checks Pro status
4. Extract metadata (title, artist, album)
5. Upload to Supabase Storage (`flux-music` bucket)
6. Save metadata to `music_tracks` table
7. Return public URL for streaming

### Telegram Feed Bot
1. User subscribes to channel
2. Bot joins channel and monitors messages
3. New messages are parsed and stored
4. Frontend polls for updates
5. Messages displayed with media and buttons

### Pro Feature Gating
Backend checks `user.isPro` before allowing:
- Music upload/download
- Advanced AI models
- Premium features

---

## Troubleshooting

### RLS Errors
If you get "row-level security policy" errors:
```sql
ALTER TABLE table_name DISABLE ROW LEVEL SECURITY;
```

### Music Upload Fails
1. Check Pro status: `SELECT is_pro FROM flux_users WHERE username = 'lokzu2';`
2. Verify bucket exists: Supabase Dashboard > Storage > `flux-music`
3. Check bucket is public for streaming
4. Run `fix-music-rls.sql`

### AI Not Working
1. Check API keys in `.env`
2. Verify model availability: `GET /api/ai/models`
3. Check OpenRouter credits

### Feed Not Updating
1. Verify bot token in `.env`
2. Check bot is running: `node feed-bot/index.js`
3. Ensure webhook is set up

### Socket.IO Connection Issues
1. Check CORS settings in `src/server.ts`
2. Verify port 3001 is accessible
3. Check firewall rules

---

## Security

### Authentication
- JWT tokens with expiration
- Password hashing with bcrypt
- Session management in database

### Authorization
- Middleware checks for valid tokens
- Role-based access (admin, pro, free)
- Resource ownership validation

### Data Protection
- RLS disabled (using custom auth)
- API-level access control
- Input validation and sanitization

### Storage Security
- Bucket policies for public/private access
- File type validation
- Size limits enforced

---

## Performance

### Optimization Strategies
- Database indexes on frequently queried columns
- Connection pooling for Supabase
- Caching for AI conversations
- Lazy loading for messages
- Pagination for large datasets

### Monitoring
- Console logging for errors
- Request/response timing
- Socket.IO connection tracking

---

## Credits

**Developer**: lokzu2  
**Framework**: Node.js + Express + Socket.IO  
**Database**: Supabase (PostgreSQL)  
**AI**: DeepSeek, OpenRouter  
**Design**: TailwindCSS, Glass Morphism  
**Theme**: Wave (#0db9f2)

---

## Version History

See `CHANGELOG.md` for detailed version history.

**Current Version**: 2.0.0  
**Last Updated**: January 2026
