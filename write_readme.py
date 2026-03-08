content = r"""# WAVE

We're building a modern communication platform — real-time messaging, voice/video calls, AI chat, music streaming, and a live Telegram news feed, all in one place.

---

## Features

- **Real-time Messaging** — Instant group channels, direct messages, typing indicators, and read receipts
- **Voice & Video Calls** — Crystal-clear peer-to-peer calls powered by Agora RTC
- **AI Assistant** — Chat with 20+ models including DeepSeek, Gemini, and Llama via OpenRouter / NVIDIA NIM
- **Music Streaming** — Built-in audio player with full track management
- **Telegram Feed** — Live news feed synced from public Telegram channels
- **Bio Profiles & Shareable Links** — Personal profile pages with avatar, bio, and a public link
- **Polls & Ephemeral Messages** — In-chat polls and self-destructing messages
- **Pro Subscriptions** — Premium feature tiers for power users
- **Admin Panel** — Full moderation tools: user management, bans, and reports
- **Device & Email Alerts** — Instant notifications for new logins and account activity
- **Secure Auth** — JWT-based authentication with Supabase
- **Weather Widget** — Real-time weather right inside chat

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 18+, TypeScript |
| Framework | Express.js |
| Real-time | Socket.IO |
| Database | Supabase (PostgreSQL) |
| Auth | JWT + Supabase Auth |
| AI | OpenAI SDK, NVIDIA NIM, OpenRouter |
| Voice/Video | Agora RTC |
| Email | Nodemailer |
| Feed Bot | Python 3, FastAPI, Telethon |
| Frontend | Vanilla JS, Tailwind CSS |
| Deployment | Railway |

---

## Project Structure

```
wave/
├── backend/
│   ├── src/
│   │   ├── routes/        # REST API endpoints
│   │   ├── services/      # Business logic
│   │   ├── managers/      # State & data managers
│   │   ├── socket/        # Socket.IO event handlers
│   │   ├── middleware/    # Auth, error handling
│   │   └── server.ts      # Entry point
│   └── migrations/        # SQL migration files
├── feed-bot/              # Telegram scraper (Python)
├── public/                # Frontend static files
├── admin/                 # Admin panel
├── landing/               # Landing pages
└── migrations/            # Root-level SQL migrations
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+
- Python 3.10+ *(for the Telegram feed bot)*
- A [Supabase](https://supabase.com) project

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/wave.git
cd wave
```

### 2. Install dependencies

```bash
cd backend && npm install
```

### 3. Configure environment variables

```bash
cp backend/.env.example backend/.env
```

Fill in `backend/.env`:

```env
# Supabase
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# AI
OPENROUTER_API_KEY=
NVIDIA_NIM_API_KEY=

# Agora (voice/video)
AGORA_APP_ID=
AGORA_APP_CERTIFICATE=

# Email
SMTP_HOST=
SMTP_USER=
SMTP_PASS=
```

### 4. Run database migrations

Apply the SQL files in `migrations/` to your Supabase project in order (001 → latest).

### 5. Start the server

```bash
# Development
cd backend && npm run dev

# Production
npm run build && npm start
```

App runs at `http://localhost:3001`.

---

## Telegram Feed Bot (Optional)

```bash
cd feed-bot
pip install -r requirements.txt
python telegram-scraper.py
```

See [feed-bot/README.md](feed-bot/README.md) for Telegram API credentials setup.

---

## Deployment

We deploy on [Railway](https://railway.app) — config is already included via [`railway.json`](railway.json) and [`backend/Procfile`](backend/Procfile). Just set the environment variables in your Railway project and push.

For other platforms:

```bash
npm run build && npm start
```

---

## License

[MIT](LICENSE)
"""

import os
path = os.path.join(os.path.dirname(__file__), "README.md")
with open(path, "w") as f:
    f.write(content)
print("README.md written successfully")
