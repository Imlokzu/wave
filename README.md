# Wave

Wave is an open-source, self-hostable real-time messaging platform. Deploy it on your own server, own your data — like Telegram, but yours.

---

## Features

### Messaging
- **Rooms** — Create temporary or persistent chat rooms with shareable room codes
- **Channels** — Persistent public channels with message history
- **Direct Messages** — Private one-on-one conversations
- **Voice Messages** — Record and send audio messages
- **File & Image Sharing** — Upload and share files up to 50MB via Supabase Storage
- **Ephemeral Messages** — Self-destructing messages with configurable expiry
- **Read Receipts & Typing Indicators** — Real-time presence through Socket.IO

### Accounts & Profiles
- **Authentication** — Signup/login with bcrypt-hashed passwords and JWT session tokens
- **User Profiles** — Avatar, bio, and customizable display info
- **Shareable Bio Pages** — Public profile links with view tracking
- **Multi-device Sessions** — Session management with new-device email alerts
- **Invite Links** — Invite others to rooms or the platform

### AI Assistant
- **Multi-model Support** — Chat with 5+ models (DeepSeek, Qwen, and more) via OpenRouter and NVIDIA NIM
- **Web Search** — AI can search the web for up-to-date information
- **Streaming Responses** — Real-time token streaming

### Telegram Feed
- **Live News Feed** — Aggregates posts from public Telegram channels into a browsable feed
- **Python Scraper Bot** — Background Telethon-based bot syncs channels into Supabase

### Administration
- **Admin Panel** — Manage users, issue bans, and review reports
- **Reports System** — Users can submit bug reports and flag content
- **Pro Subscriptions** — Optional premium tier with configurable feature gates

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 18+, TypeScript |
| Framework | Express.js |
| Real-time | Socket.IO |
| Database | Supabase (PostgreSQL) |
| Auth | Custom JWT + bcrypt |
| AI | OpenRouter, NVIDIA NIM (OpenAI-compatible) |
| Voice/Video | Agora RTC |
| File Storage | Supabase Storage |
| Email | Nodemailer |
| Feed Bot | Python 3, Telethon, FastAPI |
| Frontend | Vanilla JS, Tailwind CSS |

---

## Project Structure

```
wave/
├── backend/
│   ├── src/
│   │   ├── routes/      # REST API endpoints
│   │   ├── services/    # Business logic (auth, AI, uploads)
│   │   ├── managers/    # Data access layer
│   │   ├── socket/      # Socket.IO event handlers
│   │   ├── middleware/  # Auth guards, error handling
│   │   └── server.ts    # Entry point
│   └── migrations/      # SQL migration files
├── feed-bot/            # Telegram scraper (Python)
├── public/              # Frontend (HTML, JS, CSS)
├── admin/               # Admin panel
└── migrations/          # Root-level SQL migrations
```

---

## Self-Hosting

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project (or self-hosted Supabase)
- Python 3.10+ — only if using the Telegram feed bot

### 1. Clone

```bash
git clone https://github.com/YOUR_USERNAME/wave.git
cd wave
```

### 2. Install dependencies

```bash
cd backend && npm install
```

### 3. Configure environment

```bash
cp backend/.env.example backend/.env
```

```env
# Supabase
SUPABASE_URL=
SUPABASE_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# AI (optional)
OPENROUTER_API_KEY=
NVIDIA_NIM_API_KEY=

# Voice/Video (optional)
AGORA_APP_ID=
AGORA_APP_CERTIFICATE=

# Email alerts (optional)
SMTP_HOST=
SMTP_USER=
SMTP_PASS=
```

### 4. Run database migrations

Apply the SQL files in `migrations/` to your Supabase project in ascending order (001 → latest).

### 5. Start

```bash
# Development
npm run dev

# Production
npm run build && npm start
```

Server runs at `http://localhost:3001`.

---

## Telegram Feed Bot

Optional. Scrapes public Telegram channels and stores posts in your database.

```bash
cd feed-bot
pip install -r requirements.txt
python telegram-scraper.py
```

See [feed-bot/README.md](feed-bot/README.md) for Telegram API setup.

---

## Deployment

Wave ships with [Railway](https://railway.app) config out of the box ([`railway.json`](railway.json), [`backend/Procfile`](backend/Procfile)). Set your environment variables and push.

Works equally well on any VPS, Docker, or PaaS that runs Node.js.

---

## License

[MIT](LICENSE)
