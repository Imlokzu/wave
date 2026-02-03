# Feed Bot - Complete Setup Guide

## ✅ What's Already Configured

Your feed bot is pre-configured with:
- ✅ Telegram API credentials
- ✅ Supabase URL and Key
- ✅ Custom Supabase client for feed integration
- ✅ All dependencies listed in requirements.txt

## 🚀 Quick Start (3 Steps)

### Step 1: Install Dependencies
```bash
cd feed-bot
fix-dependencies.bat
```

This will:
- Activate the virtual environment
- Upgrade pip
- Install all required packages (including supabase and openai)

### Step 2: Setup Supabase Table (One-time)

1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Select your project
3. Click "SQL Editor" in the left sidebar
4. Click "New Query"
5. Copy and paste the contents of `setup-supabase-table.sql`
6. Click "Run"

### Step 3: Create Storage Bucket (One-time)

1. In Supabase dashboard, go to "Storage"
2. Click "Create a new bucket"
3. Name: `telegram_media`
4. Public: ✅ Yes (check this box)
5. Click "Create bucket"

### Step 4: Run the Bot
```bash
python telegram-scraper.py
```

## 🔐 Authentication

On first run, you'll need to authenticate:

**Option A: QR Code (Easiest)**
1. A QR code will appear in the terminal
2. Open Telegram on your phone
3. Go to: Settings → Devices → Link Desktop Device
4. Scan the QR code
5. Done!

**Option B: Phone Number**
1. Enter your phone number (e.g., +1234567890)
2. Enter the verification code from Telegram
3. If you have 2FA, enter your password

## 📊 How It Works

### Local Storage
- Messages saved to SQLite: `channels/{channel_id}/{channel_id}.db`
- Media downloaded to: `channels/{channel_id}/media/`

### Cloud Storage (Supabase)
- Messages automatically uploaded to `telegram_messages` table
- Media files uploaded to `telegram_media` bucket
- Public URLs stored in database for easy access

### Data Flow
```
Telegram Channel
    ↓
Feed Bot Scraper
    ↓
├─→ Local SQLite DB (backup)
└─→ Supabase (cloud)
    ├─→ telegram_messages table
    └─→ telegram_media bucket
```

## 🎯 Using the Bot

### Main Menu
```
[S] Scrape channels       - Scrape messages from channels
[C] Continuous scraping   - Auto-scrape every 5 minutes
[M] Media scraping: ON    - Toggle media download
[L] List & add channels   - Manage channels
[R] Remove channels       - Remove channels
[E] Export data          - Export to CSV/JSON
[Q] Quit                 - Exit
```

### Adding Channels

1. Press `L` (List & add channels)
2. Enter channel info:
   - Public: `@channelname` or `channelname`
   - Private: Channel ID (e.g., `-1001234567890`)

**How to get private channel ID:**
1. Forward a message from the channel to @userinfobot
2. It will show you the channel ID

### Scraping Channels

1. Press `S` (Scrape channels)
2. Choose:
   - Type `all` - Scrape all channels
   - Type `1,3,5` - Scrape specific channels by number
   - Type channel ID - Scrape one channel

### Continuous Monitoring

1. Press `C` (Continuous scraping)
2. Bot will check for new messages every 5 minutes
3. Press Ctrl+C to stop

## 📁 Where is My Data?

### Local Files
```
feed-bot/
├── channels/
│   └── -1001234567890/        ← Channel folder
│       ├── -1001234567890.db  ← SQLite database
│       ├── profile.jpg        ← Channel picture
│       └── media/             ← Downloaded media
├── session.session            ← Your Telegram login
└── state.json                ← Scraper progress
```

### Supabase (Cloud)
- **Database**: `telegram_messages` table
- **Storage**: `telegram_media` bucket
- **Access**: Via Supabase dashboard or API

## 🔧 Configuration

Edit `feed-bot/.env` to customize:

```env
# Telegram API (already configured)
TELEGRAM_API_ID=33178697
TELEGRAM_API_HASH=09a96abe686d98c0da49ef40ad0f13c7

# Supabase (already configured)
SUPABASE_URL=https://ocvusoidmvjlbssblnxw.supabase.co
SUPABASE_KEY=your-key-here
SUPABASE_BUCKET=telegram_media
SUPABASE_TABLE=telegram_messages

# Bot Settings
RETENTION_DAYS=3  # How long to keep messages

# AI Translation (optional - currently disabled)
# AI_API_KEY=your-key
# TARGET_LANGUAGE=English
```

## 🐛 Troubleshooting

### "Session expired"
```bash
cd feed-bot
reauth.bat
```

### "Channel not found"
- Make sure you're a member of the channel
- For private channels, use the numeric ID (starts with `-100`)

### "FloodWaitError"
- Telegram is rate-limiting you
- Wait the specified time and try again
- This is normal for large channels

### "Supabase error"
- Check that you created the `telegram_messages` table
- Check that you created the `telegram_media` bucket
- Verify credentials in `.env`

### Dependencies conflict
```bash
cd feed-bot
fix-dependencies.bat
```

## 💡 Pro Tips

1. **First time?** Start with a small channel to test
2. **Large channels?** Disable media initially: Press `M`
3. **Monitor channels?** Use continuous mode: Press `C`
4. **Session file** is your login - keep it safe!
5. **Check Supabase** to see your data in the cloud

## 🔗 Integration with Your App

Your scraped messages are now in Supabase! You can:

1. **Query from backend**:
```typescript
const { data } = await supabase
  .from('telegram_messages')
  .select('*')
  .order('date', { ascending: false })
  .limit(50);
```

2. **Display in feed**:
- Messages are in `telegram_messages` table
- Media URLs are in `media_path` column
- Filter by `channel_id` or `channel_name`

3. **Real-time updates**:
```typescript
supabase
  .channel('telegram_messages')
  .on('postgres_changes', 
    { event: 'INSERT', schema: 'public', table: 'telegram_messages' },
    (payload) => console.log('New message:', payload)
  )
  .subscribe();
```

## 📚 Next Steps

1. ✅ Run `fix-dependencies.bat`
2. ✅ Create Supabase table (run `setup-supabase-table.sql`)
3. ✅ Create storage bucket (`telegram_media`)
4. ✅ Run `python telegram-scraper.py`
5. ✅ Authenticate with Telegram
6. ✅ Add channels and start scraping!

## 🆘 Need Help?

- Check console output for detailed errors
- Review `FEED_BOT_QUICK_START.md` for basics
- Check Supabase dashboard for data
- Verify `.env` configuration

Happy scraping! 🎉
