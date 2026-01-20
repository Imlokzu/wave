# Telegram Channel Scraper 📱

A powerful Python script that allows you to scrape messages and media from Telegram channels using the Telethon library. Features include real-time continuous scraping, media downloading, and data export capabilities.

```
___________________  _________
\__    ___/  _____/ /   _____/
  |    | /   \  ___ \_____  \ 
  |    | \    \_\  \/        \
  |____|  \______  /_______  /
                 \/        \/
```

## What's New in v3.1 🎉

**Enhanced Message Data:**
- **Message statistics** - Captures views, forwards, and post_author for each message
- **Reactions support** - Records all emoji reactions with counts (e.g., "😀 12 👍 3")
- **Automatic database migration** - Seamlessly adds new columns to existing databases
- **Richer exports** - All new data included in CSV/JSON exports

**Improved Channel Management:**
- **Channel names displayed** - Shows channel names alongside IDs everywhere
- **Smart filtering** - List option now only shows Channels and Groups (no private chats)
- **channels_list.csv export** - Automatically saves channel list with names, IDs, usernames, and types
- **"all" selection** - Quickly add all listed channels at once
- **Better export naming** - Files now named as `ID_username.csv` and `ID_username.json`

**Bug Fixes:**
- **Fixed channel ID parsing** - Resolved "invalid literal for int()" error in fix missing media
- **Better entity resolution** - Handles both numeric IDs and channel usernames
- **Improved error messages** - Shows channel names with IDs for clearer debugging

## Features 🚀

- **QR Code & Phone Authentication** - Choose your preferred login method
- Scrape messages with full metadata (views, forwards, reactions, post author)
- Download media files with parallel processing and unique naming
- Real-time continuous scraping
- Export data to JSON and CSV formats with enhanced metadata
- SQLite database storage with automatic schema migration
- Resume capability (saves progress)
- Interactive menu with channel names and numbered selection
- Smart channel filtering (only shows channels/groups)
- Progress tracking with visual progress bars
- Automatic channels list export to CSV

## Prerequisites 📋

Before running the script, you'll need:

- Python 3.7 or higher
- Telegram account
- API credentials from Telegram

### Required Python packages

```
pip install -r requirements.txt
```

## Getting Telegram API Credentials 🔑

1. Visit https://my.telegram.org/auth
2. Log in with your phone number
3. Click on "API development tools"
4. Fill in the form:
   - App title: Your app name
   - Short name: Your app short name
   - Platform: Can be left as "Desktop"
   - Description: Brief description of your app
5. Click "Create application"
6. You'll receive:
   - `api_id`: A number
   - `api_hash`: A string of letters and numbers
   
Keep these credentials safe, you'll need them to run the script!

## Setup and Running 🔧

1. Clone the repository:
```bash
git clone https://github.com/unnohwn/telegram-scraper.git
cd telegram-scraper
```

2. Install requirements:
```bash
pip install -r requirements.txt
```

3. Run the script:
```bash
python telegram-scraper.py
```

4. On first run, you'll be prompted to enter:
   - Your API ID (from my.telegram.org)
   - Your API Hash (from my.telegram.org)
   - **Choose authentication method:**
     - **QR Code** (Recommended) - Scan with your phone (no phone number needed)
     - **Phone Number** - Traditional SMS verification

## Usage 📝

The script provides a clean interactive menu:

```
========================================
           TELEGRAM SCRAPER
========================================
[S] Scrape channels
[C] Continuous scraping  
[M] Media scraping: ON
[L] List & add channels
[R] Remove channels
[E] Export data
[T] Rescrape media
[Q] Quit
========================================
```

### Channel Selection Made Easy 🔢

Instead of typing long channel IDs, use numbers:

**Adding Channels:**
```
[1] Tech News (ID: -1002116176890, Type: Channel, Username: @technews)
[2] Python Dev (ID: -1001597139842, Type: Group, Username: @pythondev)
[3] Daily Updates (ID: -1002274713954, Type: Channel, Username: @dailyupdates)

Enter: 1,3 (adds channels 1 and 3)
Or: all (adds all listed channels)
```

**Viewing Your Channels:**
```
[1] Tech News (ID: -1002116176890), Last Message ID: 5234, Messages: 12450
[2] Python Dev (ID: -1001597139842), Last Message ID: 8192, Messages: 45782
```

**Scraping Channels:**
- Single: `1`
- Multiple: `1,3,5`
- All: `all`
- Mix formats: `1,-1001597139842,3`

## Data Storage 💾

### Database Structure

Data is stored in SQLite databases, one per channel:
- Location: `./channelname/channelname.db`
- Optimized with indexes for fast queries
- WAL mode for better performance
- Schema includes: message_id, date, sender info, message text, media info, reply_to, post_author, views, forwards, reactions
- Automatic migration adds new columns to existing databases

### Media Storage 📁

Media files are stored with unique naming:
- Location: `./channelname/media/`
- Format: `{message_id}-{unique_id}-{original_name}.ext`
- **No more file overwrites** - Each file gets a unique name

### Exported Data 📊

Export formats:
1. **CSV**: `./channelname/channelid_username.csv`
2. **JSON**: `./channelname/channelid_username.json`
3. **Channel List**: `./channels_list.csv` (automatically created when using [L] option)

All exports include complete message metadata: views, forwards, reactions, and post author information.

## Performance Features ⚙️

- **5 concurrent downloads** for faster media processing
- **Batch database operations** for optimal speed
- **Progress bars** with real-time feedback
- **Resume capability** - Continue where you left off
- **Memory-efficient** exports for large datasets

## Error Handling 🛠️

- Automatic retry with exponential backoff
- Rate limit compliance
- Network error recovery
- State preservation during interruptions

## Limitations ⚠️

- Respects Telegram's rate limits
- Can only access public channels or channels you're a member of
- Media download size limits apply as per Telegram's restrictions

## License 📄

This project is licensed under the MIT License - see the LICENSE file for details.

## Disclaimer ⚖️

This tool is for educational purposes only. Make sure to:
- Respect Telegram's Terms of Service
- Obtain necessary permissions before scraping
- Use responsibly and ethically
- Comply with data protection regulations
