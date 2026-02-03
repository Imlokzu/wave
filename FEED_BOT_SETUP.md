# Feed Bot Setup Guide

## Prerequisites
- Python 3.8 or higher
- Telegram account
- Supabase account (optional, for cloud storage)

## Step 1: Install Dependencies

```bash
cd feed-bot
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

## Step 2: Get Telegram API Credentials

You already have these in your `.env` file:
- API_ID: `33178697`
- API_HASH: `09a96abe686d98c0da49ef40ad0f13c7`

If you need new ones:
1. Go to https://my.telegram.org
2. Log in with your phone number
3. Click "API development tools"
4. Create a new application
5. Copy the `api_id` and `api_hash`

## Step 3: Configure Supabase (Optional)

Edit `feed-bot/.env` and add your Supabase credentials:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
```

To get these:
1. Go to your Supabase dashboard
2. Click on your project
3. Go to Settings > API
4. Copy the "Project URL" and "anon public" key

## Step 4: Authenticate with Telegram

Run the scraper for the first time:

```bash
cd feed-bot
.venv\Scripts\activate
python telegram-scraper.py
```

### Authentication Options:

**Option 1: QR Code (Recommended)**
1. The script will display a QR code in the terminal
2. Open Telegram on your phone
3. Go to Settings > Devices > Link Desktop Device
4. Scan the QR code
5. Done! Session saved to `session.session`

**Option 2: Phone Number**
1. If QR code doesn't work, enter your phone number
2. Enter the verification code sent to your Telegram
3. If you have 2FA, enter your password
4. Session saved to `session.session`

## Step 5: Add Channels to Scrape

The script will ask you to add channels. You can add:
- Public channels: `@channelname` or `channelname`
- Private channels: Use the channel ID (e.g., `-1001234567890`)

To get a private channel ID:
1. Forward a message from the channel to @userinfobot
2. It will show you the channel ID

## Step 6: Configure Scraping Options

The script will ask:
- **Scrape media?** (yes/no) - Download photos and videos
- **Message limit?** (number or blank) - Limit messages per channel

## Step 7: Start Scraping

Choose from the menu:
1. **Scrape all channels** - Scrape all configured channels
2. **Scrape specific channel** - Choose one channel
3. **Add new channel** - Add more channels
4. **Remove channel** - Remove a channel
5. **Export to CSV/JSON** - Export scraped data
6. **Continuous scraping** - Auto-scrape new messages every 5 minutes

## Troubleshooting

### "Session expired" or "Authorization error"
Delete the `session.session` file and re-authenticate:
```bash
del session.session
python telegram-scraper.py
```

### "FloodWaitError"
Telegram is rate-limiting you. Wait the specified time and try again.

### "Channel not found"
- Make sure you're a member of the channel
- For private channels, use the numeric ID (starts with `-100`)
- For public channels, use `@channelname` format

### Media not downloading
Check that `scrape_media` is set to `true` in `state.json`

## File Structure

```
feed-bot/
├── .env                    # Configuration
├── session.session         # Telegram session (auto-created)
├── state.json             # Scraper state (auto-created)
├── channels_list.csv      # Channel list (optional)
├── channels/              # Downloaded data
│   └── -1001234567890/    # Channel folder
│       ├── -1001234567890.db  # SQLite database
│       ├── profile.jpg    # Channel profile picture
│       └── media/         # Downloaded media files
└── telegram-scraper.py    # Main script
```

## Quick Start Commands

```bash
# Activate virtual environment
cd feed-bot
.venv\Scripts\activate

# Run the scraper
python telegram-scraper.py

# Deactivate when done
deactivate
```

## Advanced: Supabase Integration

If you configured Supabase, messages will automatically be uploaded to your database.

### Create Supabase Table

Run this SQL in your Supabase SQL Editor:

```sql
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id BIGINT NOT NULL,
  channel_id TEXT NOT NULL,
  channel_name TEXT,
  date TIMESTAMP NOT NULL,
  message TEXT,
  media_type TEXT,
  media_path TEXT,
  views INTEGER,
  forwards INTEGER,
  sender_id BIGINT,
  username TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(message_id, channel_id)
);

CREATE INDEX idx_messages_channel ON messages(channel_id);
CREATE INDEX idx_messages_date ON messages(date);
```

### Create Storage Bucket

1. Go to Storage in Supabase
2. Create a new bucket called `telegram_media`
3. Set it to public if you want media URLs to be accessible

## Tips

- **First run**: Start with a small channel to test
- **Media**: Disable media scraping for faster initial scrape
- **Continuous mode**: Great for monitoring channels in real-time
- **Session file**: Keep `session.session` safe - it's your login token
- **Rate limits**: Telegram limits how fast you can scrape. Be patient!

## Need Help?

Check the console output for detailed error messages. Most issues are related to:
1. Authentication (delete session.session and re-auth)
2. Channel access (make sure you're a member)
3. Rate limiting (wait and try again)
