# 🌊 WaveChat

A modern, real-time chat application with AI assistance, Telegram feed integration, and beautiful UI.

![WaveChat](public/wavechat.png)

## ✨ Features

- 💬 **Real-time Chat** - Socket.io powered instant messaging
- 🤖 **AI Assistant** - 20+ AI models including DeepSeek R1, Gemini, Llama
- 🔍 **Web Search** - AI can search the web for current information
- 🌤️ **Weather Integration** - Real-time weather data
- 📱 **Telegram Feed** - Scrape and display Telegram channel content
- 🎨 **Customizable Themes** - Dark mode with custom backgrounds
- 🎵 **Music Player** - Built-in music streaming
- 👥 **User Profiles** - Avatars, bios, and customization
- 🔒 **Secure Authentication** - JWT-based auth with Supabase
- 📊 **Admin Panel** - User management and moderation

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL or Supabase account
- OpenRouter API key (for AI features)

### Installation

1. **Clone the repository:**
```bash
git clone https://github.com/YOUR_USERNAME/wavechat.git
cd wavechat
```

2. **Install backend dependencies:**
```bash
cd backend
npm install
```

3. **Configure environment:**
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Build and run:**
```bash
npm run build
npm start
```

5. **Access the app:**
```
http://localhost:3001
```

## 📖 Documentation

- [Deployment Guide](DEPLOYMENT.md) - Deploy to VPS, Android tablet, or cloud
- [API Documentation](backend/README.md) - Backend API reference
- [Theme Guide](public/css/THEME_GUIDE.md) - Customize the UI

## 🛠️ Tech Stack

### Backend
- **Node.js** + **TypeScript**
- **Express.js** - Web framework
- **Socket.io** - Real-time communication
- **Supabase** - Database and authentication
- **OpenRouter** - AI model access

### Frontend
- **Vanilla JavaScript** - No framework overhead
- **Tailwind CSS** - Utility-first styling
- **Socket.io Client** - Real-time updates
- **Material Icons** - Beautiful icons

### Additional Services
- **Python** - Telegram scraper bot
- **Telethon** - Telegram API client

## 📁 Project Structure

```
wavechat/
├── backend/              # Node.js backend
│   ├── src/
│   │   ├── routes/      # API endpoints
│   │   ├── services/    # Business logic
│   │   ├── managers/    # Data management
│   │   ├── socket/      # Socket.io handlers
│   │   └── server.ts    # Main server file
│   ├── migrations/      # Database migrations
│   └── package.json
├── public/              # Frontend static files
│   ├── js/             # JavaScript modules
│   ├── css/            # Stylesheets
│   ├── mobile/         # Mobile-optimized pages
│   └── *.html          # HTML pages
├── feed-bot/           # Telegram scraper
│   ├── telegram-scraper.py
│   └── requirements.txt
├── migrations/         # SQL migrations
└── README.md
```

## 🎨 Features in Detail

### AI Chat
- 20+ AI models to choose from
- Web search integration
- Weather queries
- Code generation
- Translation
- Summarization

### Real-time Chat
- Private messages
- Group rooms
- File sharing
- Image uploads
- Read receipts
- Typing indicators

### Telegram Feed
- Scrape public channels
- Display posts in feed
- Media support
- Auto-sync

### Customization
- Custom themes
- Background images
- Transparency mode
- Color schemes

## 🔐 Security

- JWT authentication
- Password hashing with bcrypt
- SQL injection protection
- XSS prevention
- CORS configuration
- Rate limiting

## 🌐 Deployment

### Deploy to Android Tablet (VPS)
See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions.

### Deploy to Cloud
- **Railway** - One-click deploy
- **Heroku** - Easy setup
- **DigitalOcean** - Full control
- **AWS** - Enterprise scale

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- OpenRouter for AI model access
- Supabase for backend infrastructure
- Tailwind CSS for styling
- Socket.io for real-time features
- Material Design for icons

## 📧 Contact

For questions or support, please open an issue on GitHub.

---

Made with ❤️ by the WaveChat team
