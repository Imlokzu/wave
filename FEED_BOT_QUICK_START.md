# Feed Bot - Quick Start Guide

## 🚀 Super Quick Setup (3 steps)

### 1. Run the start script
```bash
start-feed-bot.bat
```

### 2. Authenticate with Telegram
**Option A: QR Code (Easiest)**
- A QR code will appear in the terminal
- Open Telegram on your phone
- Go to: Settings → Devices → Link Desktop Device
- Scan the QR code
- Done!

**Option B: Phone Number**
- Enter your phone number (with country code, e.g., +1234567890)
- Enter the verification code sent to Telegram
- If you have 2FA, enter your password

### 3. Add channels and start scraping!

---

## 📱 Need to Re-Authenticate?

If your session expires or you get authentication errors:

```bash
cd feed-bot
reauth.bat
```

This will delete your old session and start fresh.

---

## 🔧 Manual Setup (if scripts don't work)

```bash
# 1. Go to feed-bot folder
cd feed-bot

# 2. Create virtual environment (first time only)
python -m venv .venv

# 3. Activate it
.venv\Scripts\activate

# 4. Install dependencies (first time only)
pip install -r requirements.txt

# 5. Run the scraper
python telegram-scraper.py
```

---

## 📋 What You Need

✅ **Already configured in `.env`:**
- Telegram API ID: `33178697`
- Telegram API Hash: `09a96abe686d98c0da49ef40ad0f13c7`

❌ **Optional (not configured):**
- Supabase URL and Key (for cloud storage)
- AI API Key (for auto-translation)

---

## 🎯 Common Tasks

### Add a channel
1. Run the bot
2. Press `L` (List & add channels)
3. Enter channel username (e.g., `@channelname`) or ID

### Scrape all channels
1. Press `S` (Scrape channels)
2. Type `all`

### Export data
1. Press `E` (Export data)
2. Choose channel
3. Select format (CSV or JSON)

### Continuous monitoring
1. Press `C` (Continuous scraping)
2. Bot will check for new messages every 5 minutes

---

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| "Session expired" | Run `reauth.bat` |
| "Channel not found" | Make sure you're a member of the channel |
| "FloodWaitError" | Wait the specified time (Telegram rate limit) |
| Script won't start | Make sure Python is installed: `python --version` |
| Dependencies error | Run: `pip install -r requirements.txt` |

---

## 📁 Where is my data?

```
feed-bot/
├── channels/              ← Your scraped data
│   └── -1001234567890/   ← Channel folder
│       ├── *.db          ← SQLite database
│       ├── profile.jpg   ← Channel picture
│       ├── *.csv         ← Exported CSV
│       ├── *.json        ← Exported JSON
│       └── media/        ← Downloaded photos/videos
├── session.session       ← Your login (keep safe!)
└── state.json           ← Scraper progress
```

---

## 💡 Pro Tips

1. **First time?** Start with a small channel to test
2. **Slow scraping?** Disable media: Press `M` to toggle
3. **Want to monitor?** Use continuous mode: Press `C`
4. **Session file** is your login token - keep it safe!
5. **Rate limited?** Telegram limits speed - be patient

---

## 🆘 Still Need Help?

Check the full documentation:
- `FEED_BOT_SETUP.md` - Detailed setup guide
- `feed-bot/README.md` - Complete feature documentation

Or check the console output - it shows detailed error messages!
