# Wave Messenger Changelog

All notable changes to Wave Messenger will be documented in this file.

## [4.2.0] - 2025-12-28

### Added
- **Auto-Update System** - Automatic update notifications and "What's New" changelog display
- **User Profiles** - Custom avatars, bios, and profile pages with sharing
- **Direct Messages** - Private 1-on-1 conversations with read receipts
- **AI Chat Interface** - DeepSeek AI integration with chat UI (requires API key)
- **Telegram Feed** - Follow and view Telegram channel feeds
- **Music Player UI** - Music streaming interface (backend ready)
- **Wave Pro System** - Premium subscription framework with gift codes
- **Mobile Layouts** - Dedicated mobile-optimized pages for all features
- **Legal Pages** - Terms of Service, Privacy Policy, Help Center, Bug Reporting, and Changelog
- **Settings Panel** - Comprehensive multi-tab settings interface
- **Invite System** - Controlled user registration with invite codes

### Enhanced
- **Authentication** - Secure JWT-based auth with bcrypt password hashing
- **Chat Interface** - Modern redesign with better UX and animations
- **Message Features** - Pin messages, reactions, edit/delete, search
- **Room Management** - Create/join rooms, manage members, room settings
- **Typing Indicators** - Real-time typing status display
- **Read Receipts** - Track message read status in DMs
- **Theme System** - Dark theme with consistent styling across all pages
- **Navigation** - Unified navigation with bottom bars for mobile

### Fixed
- **API Key Handling** - Users can now provide their own OpenRouter API keys
- **Mobile Responsiveness** - Fixed navigation and layout issues on mobile
- **Avatar Display** - Proper avatar loading and fallbacks
- **Theme Consistency** - Unified color scheme across all pages
- **Authentication Flow** - Improved login/signup experience

### Security
- **Password Hashing** - bcrypt with salt rounds
- **JWT Tokens** - Secure session management
- **Input Validation** - Sanitized user inputs
- **CORS Configuration** - Proper cross-origin security
- **Environment Variables** - Secure credential storage

## [4.1.0] - 2025-12-15

### Added
- **Group Chat Rooms** - Create and join chat rooms with invite codes
- **Real-time Messaging** - WebSocket-based instant messaging
- **Image Sharing** - Upload and share images in chats
- **Message Expiration** - Auto-delete messages after set time
- **Room Controls** - Lock/unlock rooms, manage participants

### Enhanced
- **UI Redesign** - Modern dark theme interface
- **Performance** - Optimized message loading and rendering
- **Error Handling** - Better error messages and recovery

## [4.0.0] - 2025-12-01

### Added
- **Initial Release** - Wave Messenger launched
- **Real-time Chat** - Basic chat functionality
- **User Authentication** - Login and signup system
- **Profile System** - Basic user profiles
- **Dark Theme** - Initial dark mode UI

---

## Version Naming

Wave Messenger follows [Semantic Versioning](https://semver.org/):
- **Major** (4.x.x) - Breaking changes or major feature releases
- **Minor** (x.2.x) - New features, backwards compatible
- **Patch** (x.x.0) - Bug fixes and minor improvements

## Categories

- **Added** - New features
- **Enhanced** - Improvements to existing features
- **Fixed** - Bug fixes
- **Security** - Security improvements
- **Deprecated** - Features that will be removed
- **Removed** - Removed features
