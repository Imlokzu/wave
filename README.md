# 🌊 Wave Messenger

> A modern, secure messaging platform with AI capabilities, music streaming, and social feeds. Built for real-time communication with privacy in mind.

![Version](https://img.shields.io/badge/version-4.2.0-blue)
![Status](https://img.shields.io/badge/status-active-success)

---

## ✨ Features

### 💬 Core Messaging
- **Real-time chat** - Instant WebSocket communication
- **Direct messages** - Private 1-on-1 conversations
- **Group rooms** - Create and join chat rooms
- **Message reactions** - React to messages with emojis
- **Pin messages** - Keep important messages at the top
- **Edit & delete** - Modify or remove your messages
- **Typing indicators** - See when others are typing
- **Read receipts** - Know when messages are read
- **Search** - Find messages and conversations quickly

### 🤖 AI Assistant
- **AI chat** - Powered by DeepSeek AI
- **Smart commands** - Use `/` commands for quick actions
- **Web search** - AI can search the web for information
- **Weather updates** - Get weather forecasts
- **Location services** - Location-aware features
- **Conversation history** - Persistent AI chat history

### 🎵 Music Streaming
- **Upload tracks** - Share your music (Pro feature)
- **Create playlists** - Organize your music
- **Stream audio** - Listen to music in-app
- **Download tracks** - Save music offline (Pro feature)
- **Public/private tracks** - Control who can listen
- **Metadata extraction** - Automatic track info

### 📰 Social Feed
- **Telegram integration** - Follow Telegram channels
- **Feed aggregation** - All your channels in one place
- **Real-time updates** - Stay up to date
- **Channel management** - Add/remove channels easily

### 👤 User Profiles
- **Custom avatars** - Upload profile pictures
- **Bio & status** - Share about yourself
- **Profile visibility** - Control who sees your profile
- **Online status** - Show when you're active

### �* Authentication & Security
- **Secure signup/login** - Email and password authentication
- **JWT tokens** - Secure session management
- **Password hashing** - bcrypt encryption
- **Invite system** - Controlled user registration
- **Session management** - Active device tracking

### 💎 Wave Pro
- **Unlimited AI** - No limits on AI conversations
- **Music uploads** - Upload and share your tracks
- **Music downloads** - Download tracks for offline listening
- **Priority support** - Get help faster
- **Exclusive features** - Early access to new features
- **Gift Pro** - Share Pro with friends

### 🎨 Customization
- **Dark/Light themes** - Choose your style
- **Responsive design** - Works on all devices
- **Mobile optimized** - Full mobile experience
- **Accessibility** - WCAG compliant
- **Notification controls** - Customize alerts

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Supabase account (for database & storage)
- DeepSeek API key (for AI features)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/wave-messenger.git
cd wave-messenger

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your credentials

# Build the project
npm run build

# Start the server
npm start
```

### Development

```bash
# Run in development mode
npm run dev

# Run tests
npm test

# Watch tests
npm run test:watch
```

---

## 📦 Tech Stack

### Frontend
- **HTML5/CSS3** - Modern web standards
- **Tailwind CSS** - Utility-first styling
- **Vanilla JavaScript** - No framework overhead
- **Socket.IO Client** - Real-time communication
- **Material Symbols** - Icon library

### Backend
- **Node.js** - JavaScript runtime
- **Express** - Web framework
- **TypeScript** - Type safety
- **Socket.IO** - WebSocket server
- **Supabase** - Database & storage
- **JWT** - Authentication tokens
- **bcrypt** - Password hashing

### AI & Services
- **DeepSeek AI** - AI assistant
- **Axios** - HTTP client
- **Cheerio** - Web scraping
- **OpenAI SDK** - AI integration

### Infrastructure
- **Supabase** - PostgreSQL database
- **Supabase Storage** - File storage
- **WebSocket** - Real-time connections

---

## 🔧 Configuration

### Environment Variables

```env
# Server
PORT=3001
NODE_ENV=production

# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# AI Services
DEEPSEEK_API_KEY=your-deepseek-key

# JWT
JWT_SECRET=your-secret-key

# Optional
IMGBB_API_KEY=your-imgbb-key
```

---

## � API Documentation

### Authentication
- `POST /api/auth/signup` - Create new account
- `POST /api/auth/login` - Login to account
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Messaging
- `GET /api/rooms` - Get user's rooms
- `POST /api/rooms` - Create new room
- `GET /api/rooms/:id/messages` - Get messages
- `POST /api/messages` - Send message
- `PUT /api/messages/:id` - Edit message
- `DELETE /api/messages/:id` - Delete message

### Direct Messages
- `GET /api/dms` - Get DM conversations
- `POST /api/dms` - Send direct message
- `GET /api/dms/:userId` - Get DM history

### AI
- `POST /api/ai/message` - Send AI message
- `GET /api/ai/status` - Get AI status
- `GET /api/ai/help` - Get AI help

### Music
- `GET /api/music/tracks` - Get user tracks
- `GET /api/music/playlists` - Get playlists
- `POST /api/music/upload` - Upload track (Pro)
- `GET /api/music/stream/:id` - Stream track
- `POST /api/music/download/:id` - Download (Pro)

### Feed
- `GET /api/feed/channels` - Get channels
- `POST /api/feed/channels` - Add channel
- `GET /api/feed/posts` - Get feed posts

### Profile
- `GET /api/profile/:userId` - Get profile
- `PUT /api/profile` - Update profile
- `POST /api/profile/avatar` - Upload avatar

### Settings
- `GET /api/settings` - Get user settings
- `PUT /api/settings` - Update settings

---

## 🎯 Database Schema

### Users
- Authentication & profile data
- Pro status & subscription info
- Avatar & bio

### Rooms
- Chat rooms & metadata
- Member management

### Messages
- Message content & metadata
- Timestamps & read status

### Direct Messages
- Private conversations
- Read receipts

### Music
- Tracks & playlists
- File storage references

### Feed
- Telegram channel subscriptions
- Feed posts

### AI Conversations
- Chat history with AI
- Conversation context

---

## 🛡️ Security Features

- **Password hashing** - bcrypt with salt rounds
- **JWT authentication** - Secure token-based auth
- **Input validation** - Sanitized user inputs
- **SQL injection protection** - Parameterized queries
- **XSS protection** - Content sanitization
- **CORS configuration** - Controlled access
- **Rate limiting** - API protection
- **Secure file uploads** - File type validation

---

## 📱 Mobile Support

Wave Messenger is fully responsive and optimized for mobile devices:
- Touch-friendly interface
- Mobile navigation
- Optimized layouts
- Fast loading times
- PWA-ready architecture

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Watch mode
npm run test:watch
```

Tests include:
- Unit tests for managers
- Integration tests for routes
- Property-based tests
- Message expiration tests
- Authentication tests

---

## 🤝 Contributing

This is a private project. Contributions are not currently accepted.

---

## 📄 License

Proprietary - All rights reserved

---

## 🆘 Support

For issues or questions:
- Check the documentation
- Review error logs
- Contact support team

---

## 🌟 Why Wave?

### Speed
- Instant message delivery
- Optimized WebSocket connections
- Fast page loads

### Privacy
- Secure authentication
- Encrypted passwords
- Private conversations

### Features
- AI assistant built-in
- Music streaming
- Social feeds
- Modern UI/UX

### Reliability
- Robust error handling
- Comprehensive testing
- Production-ready code

---

**Made with 🌊 by the Wave team**

*Connect, chat, and share - all in one place.* 🚀
