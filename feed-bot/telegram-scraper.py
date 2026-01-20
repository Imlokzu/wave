import asyncio
import csv
import json
import os
import sqlite3
import sys
import time
import uuid
import warnings
from dataclasses import dataclass
from io import StringIO
from pathlib import Path
from typing import Any, Dict, List, Optional

import qrcode
from telethon import TelegramClient
from telethon.errors import FloodWaitError, SessionPasswordNeededError
from telethon.tl.types import (
    Channel,
    Chat,
    MessageMediaDocument,
    MessageMediaPhoto,
    MessageMediaWebPage,
    PeerChannel,
    User,
    KeyboardButtonUrl,
)

try:
    from supabase_client import SupabaseManager
except ImportError:
    SupabaseManager = None

try:
    from openai import AsyncOpenAI
except ImportError:
    print("\n[WARNING]: 'openai' library not installed. AI translation will NOT work.")
    print("Run this command to fix it: .venv\\Scripts\\pip install openai\n")
    AsyncOpenAI = None

warnings.filterwarnings(
    "ignore", message="Using async sessions support is an experimental feature"
)


def display_ascii_art():
    WHITE = "\033[97m"
    RESET = "\033[0m"
    art = r"""
___________________  _________
\__    ___/  _____/ /   _____/
  |    | /   \  ___ \_____  \
  |    | \    \_\  \/        \
  |____|  \______  /_______  /
                 \/        \/
    """
    print(WHITE + art + RESET)


def extract_button_urls(message) -> str:
    """Extract inline button URLs from message reply_markup and format them"""
    if not message.reply_markup or not hasattr(message.reply_markup, 'rows'):
        return ""
    
    button_links = []
    try:
        for row in message.reply_markup.rows:
            for button in row.buttons:
                # Check if it's a URL button
                if hasattr(button, 'url') and button.url:
                    button_text = button.text if hasattr(button, 'text') else 'Link'
                    button_links.append(f"{button_text}: {button.url}")
    except Exception as e:
        # Silently fail if button extraction doesn't work
        pass
    
    if button_links:
        return "\n\n🔗 Links:\n" + "\n".join(button_links)
    return ""


@dataclass
class MessageData:
    message_id: int
    date: str
    sender_id: int
    first_name: Optional[str]
    last_name: Optional[str]
    username: Optional[str]
    message: str
    media_type: Optional[str]
    media_path: Optional[str]
    reply_to: Optional[int]
    post_author: Optional[str]
    views: Optional[int]
    forwards: Optional[int]
    reactions: Optional[str]


class OptimizedTelegramScraper:
    def __init__(self, supabase_url: str = None, supabase_key: str = None):
        self.STATE_FILE = "state.json"
        self.state = self.load_state()
        self.client = None
        self.continuous_scraping_active = False
        self.max_concurrent_downloads = 5
        self.batch_size = 100
        self.state_save_interval = 50
        self.db_connections = {}

        # Initialize AI
        self.ai_client = None
        ai_key = os.getenv("AI_API_KEY")
        print(
            f"DEBUG: AI Init - Key present: {bool(ai_key)}, AsyncOpenAI: {AsyncOpenAI}"
        )

        if not AsyncOpenAI:
            print("[ERROR] AI ERROR: openai library is missing. Translation disabled.")
        elif not ai_key:
            print(
                "[ERROR] AI ERROR: AI_API_KEY is missing in .env. Translation disabled."
            )
        else:
            try:
                self.ai_client = AsyncOpenAI(
                    api_key=ai_key,
                    base_url=os.getenv("AI_BASE_URL", "https://api.openai.com/v1"),
                )
                self.ai_model = os.getenv("AI_MODEL", "gpt-3.5-turbo")
                self.target_lang = os.getenv("TARGET_LANGUAGE", "English")
                print(f"[INFO] AI Translation enabled ({self.target_lang})")
            except Exception as e:
                print(f"[ERROR] Failed to initialize AI: {e}")

        # Initialize Supabase
        self.supabase = None

        # Try env vars if not provided
        if not supabase_url:
            supabase_url = os.getenv("SUPABASE_URL")
        if not supabase_key:
            supabase_key = os.getenv("SUPABASE_KEY")

        if SupabaseManager and supabase_url and supabase_key:
            try:
                self.supabase = SupabaseManager(supabase_url, supabase_key)
                print("[INFO] Supabase integration enabled")
            except Exception as e:
                print(f"[ERROR] Failed to initialize Supabase: {e}")

    async def translate_text(self, text: str, target_lang: str = None) -> str:
        print(f"DEBUG: Translating text length {len(text) if text else 0}")
        if not self.ai_client:
            print("DEBUG: No AI client initialized")
            return text
        if not text or len(text) < 2:
            return text

        lang = target_lang or self.target_lang
        print(
            f"DEBUG: Sending request to AI model: {self.ai_model} for language: {lang}"
        )

        try:
            response = await self.ai_client.chat.completions.create(
                model=self.ai_model,
                messages=[
                    {
                        "role": "system",
                        "content": f"Translate the following Telegram post to {lang}. Keep emojis and formatting. Output ONLY the translation. If it is already in {lang}, return nothing.",
                    },
                    {"role": "user", "content": text},
                ],
            )
            translation = response.choices[0].message.content.strip()
            print(f"DEBUG: AI Response: {translation[:50]}...")
            if translation:
                return f"{text}\n\n[Translation]:\n{translation}"
            return text
        except Exception as e:
            print(f"[WARN] Translation failed: {e}")
            return text

    def load_state(self) -> Dict[str, Any]:
        if os.path.exists(self.STATE_FILE):
            try:
                with open(self.STATE_FILE, "r") as f:
                    return json.load(f)
            except:
                pass
        return {
            "api_id": None,
            "api_hash": None,
            "channels": {},
            "channel_names": {},
            "scrape_media": True,
            "message_limit": None,
        }

    def save_state(self):
        try:
            with open(self.STATE_FILE, "w") as f:
                json.dump(self.state, f, indent=2)
        except Exception as e:
            print(f"Failed to save state: {e}")

    def get_db_connection(self, channel: str) -> sqlite3.Connection:
        if channel not in self.db_connections:
            channel_dir = Path("channels") / channel
            channel_dir.mkdir(parents=True, exist_ok=True)

            db_file = channel_dir / f"{channel}.db"
            conn = sqlite3.connect(str(db_file), check_same_thread=False)
            conn.execute("""CREATE TABLE IF NOT EXISTS messages
                          (id INTEGER PRIMARY KEY, message_id INTEGER UNIQUE, date TEXT,
                           sender_id INTEGER, first_name TEXT, last_name TEXT, username TEXT,
                           message TEXT, media_type TEXT, media_path TEXT, reply_to INTEGER,
                           post_author TEXT, views INTEGER, forwards INTEGER, reactions TEXT)""")
            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_message_id ON messages(message_id)"
            )
            conn.execute("CREATE INDEX IF NOT EXISTS idx_date ON messages(date)")
            conn.execute("PRAGMA journal_mode=WAL")
            conn.execute("PRAGMA synchronous=NORMAL")
            conn.commit()

            self.migrate_database(conn)

            self.db_connections[channel] = conn

        return self.db_connections[channel]

    def migrate_database(self, conn: sqlite3.Connection):
        cursor = conn.cursor()
        cursor.execute("PRAGMA table_info(messages)")
        columns = {row[1] for row in cursor.fetchall()}

        migrations = []
        if "post_author" not in columns:
            migrations.append("ALTER TABLE messages ADD COLUMN post_author TEXT")
        if "views" not in columns:
            migrations.append("ALTER TABLE messages ADD COLUMN views INTEGER")
        if "forwards" not in columns:
            migrations.append("ALTER TABLE messages ADD COLUMN forwards INTEGER")
        if "reactions" not in columns:
            migrations.append("ALTER TABLE messages ADD COLUMN reactions TEXT")

        for migration in migrations:
            try:
                conn.execute(migration)
            except:
                pass

        if migrations:
            conn.commit()

    def close_db_connections(self):
        for conn in self.db_connections.values():
            conn.close()
        self.db_connections.clear()

    def batch_insert_messages(self, channel: str, messages: List[MessageData]):
        if not messages:
            return

        if self.supabase:
            self.upload_batch_to_supabase(channel, messages)

        conn = self.get_db_connection(channel)
        data = [
            (
                msg.message_id,
                msg.date,
                msg.sender_id,
                msg.first_name,
                msg.last_name,
                msg.username,
                msg.message,
                msg.media_type,
                msg.media_path,
                msg.reply_to,
                msg.post_author,
                msg.views,
                msg.forwards,
                msg.reactions,
            )
            for msg in messages
        ]

        conn.executemany(
            """INSERT OR IGNORE INTO messages
                           (message_id, date, sender_id, first_name, last_name, username,
                            message, media_type, media_path, reply_to, post_author, views,
                            forwards, reactions)
                           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            data,
        )
        conn.commit()

    def upload_batch_to_supabase(self, channel: str, messages: List[MessageData]):
        if not self.supabase:
            return

        channel_name = self.state.get("channel_names", {}).get(channel, "Unknown")

        # Convert MessageData objects to dictionaries matching Supabase schema
        records = []
        for msg in messages:
            record = {
                "message_id": msg.message_id,
                "channel_id": channel,
                "channel_name": channel_name,
                "date": msg.date,
                "message": msg.message,
                "media_type": msg.media_type,
                "media_path": msg.media_path,  # This will be updated later if media is uploaded
                "views": msg.views,
                "forwards": msg.forwards,
                "sender_id": msg.sender_id,
                "username": msg.username,
            }
            records.append(record)

        # Bulk upsert to Supabase
        if records:
            self.supabase.save_message(os.getenv("SUPABASE_TABLE", "messages"), records)

    async def download_media(self, channel: str, message) -> Optional[str]:
        if not message.media or not self.state["scrape_media"]:
            return None

        if isinstance(message.media, MessageMediaWebPage):
            return None

        try:
            channel_dir = Path("channels") / channel
            media_folder = channel_dir / "media"
            media_folder.mkdir(parents=True, exist_ok=True)

            if isinstance(message.media, MessageMediaPhoto):
                original_name = getattr(message.file, "name", None) or "photo.jpg"
                ext = "jpg"
            elif isinstance(message.media, MessageMediaDocument):
                ext = getattr(message.file, "ext", "bin") if message.file else "bin"
                original_name = getattr(message.file, "name", None) or f"document.{ext}"
            else:
                return None

            base_name = Path(original_name).stem
            extension = Path(original_name).suffix or f".{ext}"
            unique_filename = f"{message.id}-{base_name}{extension}"
            media_path = media_folder / unique_filename

            existing_files = list(media_folder.glob(f"{message.id}-*"))
            if existing_files:
                return str(existing_files[0])

            for attempt in range(3):
                try:
                    downloaded_path = await message.download_media(file=str(media_path))
                    if downloaded_path and Path(downloaded_path).exists():
                        return downloaded_path
                    else:
                        return None
                except FloodWaitError as e:
                    if attempt < 2:
                        await asyncio.sleep(e.seconds)
                    else:
                        return None
                except Exception:
                    if attempt < 2:
                        await asyncio.sleep(2**attempt)
                    else:
                        return None

            return None
        except Exception:
            return None

    async def update_media_path(self, channel: str, message_id: int, media_path: str):
        conn = self.get_db_connection(channel)
        conn.execute(
            "UPDATE messages SET media_path = ? WHERE message_id = ?",
            (media_path, message_id),
        )
        conn.commit()

        if self.supabase:
            # Upload to Supabase Storage
            try:
                bucket = os.getenv("SUPABASE_BUCKET", "telegram_media")
                file_name = os.path.basename(media_path)
                storage_path = f"{channel}/{file_name}"

                public_url = self.supabase.upload_media(
                    bucket, media_path, storage_path
                )

                if public_url:
                    # Update the record in Supabase with the public URL
                    self.supabase.save_message(
                        os.getenv("SUPABASE_TABLE", "messages"),
                        [
                            {
                                "message_id": message_id,
                                "channel_id": channel,
                                "media_path": public_url,
                            }
                        ],
                    )
            except Exception as e:
                print(f"Failed to upload media to Supabase: {e}")

    async def download_channel_photo(self, channel: str, entity) -> Optional[str]:
        """Download channel profile picture"""
        try:
            if not entity.photo:
                return None
            
            channel_dir = Path("channels") / channel
            channel_dir.mkdir(parents=True, exist_ok=True)
            
            photo_path = channel_dir / "profile.jpg"
            
            # Skip if already downloaded
            if photo_path.exists():
                return str(photo_path)
            
            # Download the profile photo
            downloaded = await self.client.download_profile_photo(
                entity,
                file=str(photo_path)
            )
            
            if downloaded and Path(downloaded).exists():
                print(f"[INFO] Downloaded profile picture for channel {channel}")
                return str(downloaded)
            
            return None
        except Exception as e:
            print(f"[WARN] Failed to download channel photo: {e}")
            return None

    async def scrape_channel(
        self,
        channel: str,
        offset_id: int,
        force_rescrape: bool = False,
        target_lang: str = None,
    ):
        collected_messages = []
        downloaded_media_paths = {}
        try:
            entity = await self.client.get_entity(
                PeerChannel(int(channel)) if channel.startswith("-") else channel
            )

            # Download channel profile picture
            await self.download_channel_photo(channel, entity)

            # If force_rescrape and message_limit is set, scrape only the newest N messages
            if force_rescrape and self.state.get("message_limit"):
                message_limit = self.state["message_limit"]
                print(
                    f"Force rescaping last {message_limit} messages from channel {channel}"
                )

                message_batch = []
                media_tasks = []
                processed_messages = 0

                async for message in self.client.iter_messages(
                    entity, limit=message_limit
                ):
                    try:
                        sender = await message.get_sender()

                        reactions_str = None
                        if message.reactions and message.reactions.results:
                            reactions_parts = []
                            for reaction in message.reactions.results:
                                emoji = getattr(reaction.reaction, "emoticon", "")
                                count = reaction.count
                                if emoji:
                                    reactions_parts.append(f"{emoji} {count}")
                            if reactions_parts:
                                reactions_str = " ".join(reactions_parts)

                        message_text = message.message or ""
                        
                        # Extract button URLs from reply_markup
                        button_urls = extract_button_urls(message)
                        if button_urls:
                            message_text += button_urls

                        # Translate if AI client is available
                        if self.ai_client and message_text and target_lang:
                            message_text = await self.translate_text(
                                message_text, target_lang
                            )

                        # Create message data (always, not just when translating)
                        msg_data = MessageData(
                            message_id=message.id,
                            date=message.date.strftime("%Y-%m-%d %H:%M:%S"),
                            sender_id=message.sender_id,
                            first_name=getattr(sender, "first_name", None)
                            if isinstance(sender, User)
                            else None,
                            last_name=getattr(sender, "last_name", None)
                            if isinstance(sender, User)
                            else None,
                            username=getattr(sender, "username", None)
                            if isinstance(sender, User)
                            else None,
                            message=message_text,
                            media_type=message.media.__class__.__name__
                            if message.media
                            else None,
                            media_path=None,
                            reply_to=message.reply_to_msg_id
                            if message.reply_to
                            else None,
                            post_author=message.post_author,
                            views=message.views,
                            forwards=message.forwards,
                            reactions=reactions_str,
                        )

                        message_batch.append(msg_data)
                        collected_messages.append(msg_data)

                        if (
                            self.state["scrape_media"]
                            and message.media
                            and not isinstance(message.media, MessageMediaWebPage)
                        ):
                            media_tasks.append(message)

                        processed_messages += 1

                        if len(message_batch) >= self.batch_size:
                            self.batch_insert_messages(channel, message_batch)
                            message_batch.clear()

                        sys.stdout.write(
                            f"\rMessages: {processed_messages}/{message_limit}"
                        )
                        sys.stdout.flush()

                    except Exception as e:
                        print(f"\nError processing message {message.id}: {e}")

                if message_batch:
                    self.batch_insert_messages(channel, message_batch)

                if media_tasks:
                    total_media = len(media_tasks)
                    completed_media = 0
                    successful_downloads = 0
                    print(f"\nDownloading {total_media} media files...")

                    semaphore = asyncio.Semaphore(self.max_concurrent_downloads)

                    async def download_single_media(message):
                        async with semaphore:
                            return await self.download_media(channel, message)

                    batch_size = 10
                    for i in range(0, len(media_tasks), batch_size):
                        batch = media_tasks[i : i + batch_size]
                        tasks = [
                            asyncio.create_task(download_single_media(msg))
                            for msg in batch
                        ]

                        for j, task in enumerate(tasks):
                            try:
                                media_path = await task
                                if media_path:
                                    await self.update_media_path(
                                        channel, batch[j].id, media_path
                                    )
                                    downloaded_media_paths[batch[j].id] = str(
                                        media_path
                                    )
                                    successful_downloads += 1
                            except Exception:
                                pass

                            completed_media += 1
                            progress = (completed_media / total_media) * 100
                            bar_length = 30
                            filled_length = int(
                                bar_length * completed_media // total_media
                            )
                            bar = "█" * filled_length + "░" * (
                                bar_length - filled_length
                            )

                            sys.stdout.write(
                                f"\rMedia: [{bar}] {progress:.1f}% ({completed_media}/{total_media})"
                            )
                            sys.stdout.flush()

                    print(
                        f"\n[INFO] Media download complete! ({successful_downloads}/{total_media} successful)"
                    )

                print(
                    f"\n[INFO] Completed force rescrape of {processed_messages} messages from channel {channel}"
                )
                for msg in collected_messages:
                    if msg.message_id in downloaded_media_paths:
                        msg.media_path = downloaded_media_paths[msg.message_id]
                return collected_messages

            result = await self.client.get_messages(
                entity, offset_id=offset_id, reverse=True, limit=0
            )
            total_messages = result.total

            if total_messages == 0:
                print(f"No messages found in channel {channel}")
                return

            print(f"Found {total_messages} messages in channel {channel}")

            message_batch = []
            media_tasks = []
            processed_messages = 0
            last_message_id = offset_id
            semaphore = asyncio.Semaphore(self.max_concurrent_downloads)

            async for message in self.client.iter_messages(
                entity, offset_id=offset_id, reverse=True
            ):
                try:
                    sender = await message.get_sender()

                    reactions_str = None
                    if message.reactions and message.reactions.results:
                        reactions_parts = []
                        for reaction in message.reactions.results:
                            emoji = getattr(reaction.reaction, "emoticon", "")
                            count = reaction.count
                            if emoji:
                                reactions_parts.append(f"{emoji} {count}")
                        if reactions_parts:
                            reactions_str = " ".join(reactions_parts)

                    message_text = message.message or ""
                    
                    # Extract button URLs from reply_markup
                    button_urls = extract_button_urls(message)
                    if button_urls:
                        message_text += button_urls

                    if self.ai_client and message_text:
                        message_text = await self.translate_text(
                            message_text, target_lang
                        )

                    msg_data = MessageData(
                        message_id=message.id,
                        date=message.date.strftime("%Y-%m-%d %H:%M:%S"),
                        sender_id=message.sender_id,
                        first_name=getattr(sender, "first_name", None)
                        if isinstance(sender, User)
                        else None,
                        last_name=getattr(sender, "last_name", None)
                        if isinstance(sender, User)
                        else None,
                        username=getattr(sender, "username", None)
                        if isinstance(sender, User)
                        else None,
                        message=message_text,
                        media_type=message.media.__class__.__name__
                        if message.media
                        else None,
                        media_path=None,
                        reply_to=message.reply_to_msg_id if message.reply_to else None,
                        post_author=message.post_author,
                        views=message.views,
                        forwards=message.forwards,
                        reactions=reactions_str,
                    )

                    message_batch.append(msg_data)
                    collected_messages.append(msg_data)

                    if (
                        self.state["scrape_media"]
                        and message.media
                        and not isinstance(message.media, MessageMediaWebPage)
                    ):
                        media_tasks.append(message)

                    last_message_id = message.id
                    processed_messages += 1

                    if len(message_batch) >= self.batch_size:
                        self.batch_insert_messages(channel, message_batch)
                        message_batch.clear()

                    if processed_messages % self.state_save_interval == 0:
                        self.state["channels"][channel] = last_message_id
                        self.save_state()

                    progress = (processed_messages / total_messages) * 100
                    bar_length = 30
                    filled_length = int(
                        bar_length * processed_messages // total_messages
                    )
                    bar = "█" * filled_length + "░" * (bar_length - filled_length)

                    sys.stdout.write(
                        f"\rMessages: [{bar}] {progress:.1f}% ({processed_messages}/{total_messages})"
                    )
                    sys.stdout.flush()

                except Exception as e:
                    print(f"\nError processing message {message.id}: {e}")

            if message_batch:
                self.batch_insert_messages(channel, message_batch)

            if media_tasks:
                total_media = len(media_tasks)
                completed_media = 0
                successful_downloads = 0
                print(f"\nDownloading {total_media} media files...")

                semaphore = asyncio.Semaphore(self.max_concurrent_downloads)

                async def download_single_media(message):
                    async with semaphore:
                        return await self.download_media(channel, message)

                batch_size = 10
                for i in range(0, len(media_tasks), batch_size):
                    batch = media_tasks[i : i + batch_size]
                    tasks = [
                        asyncio.create_task(download_single_media(msg)) for msg in batch
                    ]

                    for j, task in enumerate(tasks):
                        try:
                            media_path = await task
                            if media_path:
                                await self.update_media_path(
                                    channel, batch[j].id, media_path
                                )
                                downloaded_media_paths[batch[j].id] = str(media_path)
                                successful_downloads += 1
                        except Exception:
                            pass

                        completed_media += 1
                        progress = (completed_media / total_media) * 100
                        bar_length = 30
                        filled_length = int(bar_length * completed_media // total_media)
                        bar = "█" * filled_length + "░" * (bar_length - filled_length)

                        sys.stdout.write(
                            f"\rMedia: [{bar}] {progress:.1f}% ({completed_media}/{total_media})"
                        )
                        sys.stdout.flush()

                print(
                    f"\n[INFO] Media download complete! ({successful_downloads}/{total_media} successful)"
                )

            self.state["channels"][channel] = last_message_id
            self.save_state()
            print(f"\nCompleted scraping channel {channel}")
            for msg in collected_messages:
                if msg.message_id in downloaded_media_paths:
                    msg.media_path = downloaded_media_paths[msg.message_id]
            return collected_messages

        except Exception as e:
            print(f"Error with channel {channel}: {e}")
            return []

    async def rescrape_media(self, channel: str):
        conn = self.get_db_connection(channel)
        cursor = conn.cursor()
        cursor.execute(
            'SELECT message_id FROM messages WHERE media_type IS NOT NULL AND media_type != "MessageMediaWebPage" AND media_path IS NULL'
        )
        message_ids = [row[0] for row in cursor.fetchall()]

        channel_name = self.state.get("channel_names", {}).get(channel, "Unknown")

        if not message_ids:
            print(f"No media files to reprocess for {channel_name} (ID: {channel})")
            return

        print(
            f"Reprocessing {len(message_ids)} media files for {channel_name} (ID: {channel})"
        )

        try:
            if channel.lstrip("-").isdigit():
                entity = await self.client.get_entity(PeerChannel(int(channel)))
            else:
                entity = await self.client.get_entity(channel)
            semaphore = asyncio.Semaphore(self.max_concurrent_downloads)
            completed_media = 0
            successful_downloads = 0

            async def download_single_media(message):
                async with semaphore:
                    return await self.download_media(channel, message)

            batch_size = 10
            for i in range(0, len(message_ids), batch_size):
                batch_ids = message_ids[i : i + batch_size]
                messages = await self.client.get_messages(entity, ids=batch_ids)

                valid_messages = [
                    msg
                    for msg in messages
                    if msg
                    and msg.media
                    and not isinstance(msg.media, MessageMediaWebPage)
                ]
                tasks = [
                    asyncio.create_task(download_single_media(msg))
                    for msg in valid_messages
                ]

                for j, task in enumerate(tasks):
                    try:
                        media_path = await task
                        if media_path:
                            await self.update_media_path(
                                channel, valid_messages[j].id, media_path
                            )
                            successful_downloads += 1
                    except Exception:
                        pass

                    completed_media += 1
                    progress = (completed_media / len(message_ids)) * 100
                    bar_length = 30
                    filled_length = int(
                        bar_length * completed_media // len(message_ids)
                    )
                    bar = "█" * filled_length + "░" * (bar_length - filled_length)

                    sys.stdout.write(
                        f"\rRescrape: [{bar}] {progress:.1f}% ({completed_media}/{len(message_ids)})"
                    )
                    sys.stdout.flush()

            print(
                f"\n[INFO] Media reprocessing complete! ({successful_downloads}/{len(message_ids)} successful)"
            )

        except Exception as e:
            print(f"Error reprocessing media: {e}")

    async def fix_missing_media(self, channel: str):
        conn = self.get_db_connection(channel)
        cursor = conn.cursor()

        cursor.execute(
            'SELECT COUNT(*) FROM messages WHERE media_type IS NOT NULL AND media_type != "MessageMediaWebPage"'
        )
        total_with_media = cursor.fetchone()[0]

        cursor.execute(
            'SELECT COUNT(*) FROM messages WHERE media_type IS NOT NULL AND media_type != "MessageMediaWebPage" AND media_path IS NOT NULL'
        )
        total_with_files = cursor.fetchone()[0]

        missing_count = total_with_media - total_with_files

        channel_name = self.state.get("channel_names", {}).get(channel, "Unknown")
        print(f"\nMedia Analysis for {channel_name} (ID: {channel}):")
        print(f"Messages with media: {total_with_media}")
        print(f"Media files downloaded: {total_with_files}")
        print(f"Missing media files: {missing_count}")

        if missing_count == 0:
            print("[INFO] All media files are already downloaded!")
            return

        cursor.execute(
            'SELECT message_id, media_type FROM messages WHERE media_type IS NOT NULL AND media_type != "MessageMediaWebPage" AND (media_path IS NULL OR media_path = "")'
        )
        missing_media = cursor.fetchall()

        if not missing_media:
            print("[INFO] No missing media found!")
            return

        print(f"\nAttempting to download {len(missing_media)} missing media files...")

        try:
            if channel.lstrip("-").isdigit():
                entity = await self.client.get_entity(PeerChannel(int(channel)))
            else:
                entity = await self.client.get_entity(channel)
            semaphore = asyncio.Semaphore(self.max_concurrent_downloads)
            completed_media = 0
            successful_downloads = 0

            async def download_single_media(message):
                async with semaphore:
                    return await self.download_media(channel, message)

            batch_size = 10
            for i in range(0, len(missing_media), batch_size):
                batch = missing_media[i : i + batch_size]
                message_ids = [msg[0] for msg in batch]

                messages = await self.client.get_messages(entity, ids=message_ids)
                valid_messages = [
                    msg
                    for msg in messages
                    if msg
                    and msg.media
                    and not isinstance(msg.media, MessageMediaWebPage)
                ]

                tasks = [
                    asyncio.create_task(download_single_media(msg))
                    for msg in valid_messages
                ]

                for j, task in enumerate(tasks):
                    try:
                        media_path = await task
                        if media_path:
                            await self.update_media_path(
                                channel, valid_messages[j].id, media_path
                            )
                            successful_downloads += 1
                    except Exception:
                        pass

                    completed_media += 1
                    progress = (completed_media / len(missing_media)) * 100
                    bar_length = 30
                    filled_length = int(
                        bar_length * completed_media // len(missing_media)
                    )
                    bar = "█" * filled_length + "░" * (bar_length - filled_length)

                    sys.stdout.write(
                        f"\rFix Media: [{bar}] {progress:.1f}% ({completed_media}/{len(missing_media)})"
                    )
                    sys.stdout.flush()

            print(
                f"\n[INFO] Media fix complete! ({successful_downloads}/{len(missing_media)} successful)"
            )

        except Exception as e:
            print(f"Error fixing missing media: {e}")

    async def continuous_scraping(self):
        self.continuous_scraping_active = True

        try:
            while self.continuous_scraping_active:
                start_time = time.time()

                for channel in self.state["channels"]:
                    if not self.continuous_scraping_active:
                        break
                    print(f"\nChecking for new messages in channel: {channel}")
                    await self.scrape_channel(channel, self.state["channels"][channel])

                elapsed = time.time() - start_time
                sleep_time = max(0, 60 - elapsed)
                if sleep_time > 0:
                    await asyncio.sleep(sleep_time)

        except asyncio.CancelledError:
            print("Continuous scraping stopped")
        finally:
            self.continuous_scraping_active = False

    def get_recent_messages(self, limit: int = 20) -> List[Dict]:
        """Fetch recent messages from all channels combined"""
        all_messages = []

        for channel in self.state.get("channels", {}):
            try:
                conn = self.get_db_connection(channel)
                cursor = conn.cursor()
                # Get channel name
                channel_name = self.state.get("channel_names", {}).get(
                    channel, "Unknown"
                )

                cursor.execute(
                    "SELECT message_id, date, message, views, media_path FROM messages ORDER BY date DESC LIMIT ?",
                    (limit,),
                )
                rows = cursor.fetchall()

                for row in rows:
                    all_messages.append(
                        {
                            "channel_id": channel,
                            "channel_name": channel_name,
                            "message_id": row[0],
                            "date": row[1],
                            "message": row[2],
                            "views": row[3],
                            "media_path": row[4],
                        }
                    )
            except Exception as e:
                print(f"[ERROR] Failed to fetch messages for {channel}: {e}")
                continue

        # Sort by date descending
        all_messages.sort(key=lambda x: x["date"], reverse=True)
        return all_messages[:limit]

    def get_export_filename(self, channel: str):
        username = self.state.get("channel_names", {}).get(channel, "no_username")
        return f"{channel}_{username}"

    def export_to_csv(self, channel: str):
        conn = self.get_db_connection(channel)
        filename = self.get_export_filename(channel)
        csv_file = Path("channels") / channel / f"{filename}.csv"

        cursor = conn.cursor()
        cursor.execute("SELECT * FROM messages ORDER BY date")
        columns = [description[0] for description in cursor.description]

        with open(csv_file, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(columns)

            while True:
                rows = cursor.fetchmany(1000)
                if not rows:
                    break
                writer.writerows(rows)

    def export_to_json(self, channel: str):
        conn = self.get_db_connection(channel)
        filename = self.get_export_filename(channel)
        json_file = Path("channels") / channel / f"{filename}.json"

        cursor = conn.cursor()
        cursor.execute("SELECT * FROM messages ORDER BY date")
        columns = [description[0] for description in cursor.description]

        with open(json_file, "w", encoding="utf-8") as f:
            f.write("[\n")
            first_row = True

            while True:
                rows = cursor.fetchmany(1000)
                if not rows:
                    break

                for row in rows:
                    if not first_row:
                        f.write(",\n")
                    else:
                        first_row = False

                    data = dict(zip(columns, row))
                    json.dump(data, f, ensure_ascii=False, indent=2)

            f.write("\n]")

    async def export_data(self):
        if not self.state["channels"]:
            print("No channels to export")
            return

        for channel in self.state["channels"]:
            print(f"Exporting data for channel {channel}...")
            try:
                self.export_to_csv(channel)
                self.export_to_json(channel)
                print(f"[INFO] Completed export for channel {channel}")
            except Exception as e:
                print(f"[ERROR] Export failed for channel {channel}: {e}")

    async def view_channels(self):
        if not self.state["channels"]:
            print("No channels saved")
            return

        print("\nCurrent channels:")
        for i, (channel, last_id) in enumerate(self.state["channels"].items(), 1):
            try:
                conn = self.get_db_connection(channel)
                cursor = conn.cursor()
                cursor.execute("SELECT COUNT(*) FROM messages")
                count = cursor.fetchone()[0]
                channel_name = self.state.get("channel_names", {}).get(
                    channel, "Unknown"
                )
                print(
                    f"[{i}] {channel_name} (ID: {channel}), Last Message ID: {last_id}, Messages: {count}"
                )
            except:
                channel_name = self.state.get("channel_names", {}).get(
                    channel, "Unknown"
                )
                print(
                    f"[{i}] {channel_name} (ID: {channel}), Last Message ID: {last_id}"
                )

    async def list_channels(self):
        try:
            print("\nList of channels and groups joined by account:")
            count = 1
            channels_data = []
            async for dialog in self.client.iter_dialogs():
                entity = dialog.entity
                if dialog.id != 777000 and (
                    isinstance(entity, Channel) or isinstance(entity, Chat)
                ):
                    channel_type = (
                        "Channel"
                        if isinstance(entity, Channel) and entity.broadcast
                        else "Group"
                    )
                    username = getattr(entity, "username", None) or "no_username"
                    print(
                        f"[{count}] {dialog.title} (ID: {dialog.id}, Type: {channel_type}, Username: @{username})"
                    )
                    channels_data.append(
                        {
                            "number": count,
                            "channel_name": dialog.title,
                            "channel_id": str(dialog.id),
                            "username": username,
                            "type": channel_type,
                        }
                    )
                    count += 1

            if channels_data:
                csv_file = Path("channels_list.csv")
                with open(csv_file, "w", newline="", encoding="utf-8") as f:
                    writer = csv.DictWriter(
                        f,
                        fieldnames=[
                            "number",
                            "channel_name",
                            "channel_id",
                            "username",
                            "type",
                        ],
                    )
                    writer.writeheader()
                    writer.writerows(channels_data)
                print(f"\n[INFO] Saved channels list to {csv_file}")

            return channels_data

        except Exception as e:
            print(f"Error listing channels: {e}")
            return []

    def display_qr_code_ascii(self, qr_login):
        qr = qrcode.QRCode(box_size=1, border=1)
        qr.add_data(qr_login.url)
        qr.make()

        f = StringIO()
        qr.print_ascii(out=f)
        f.seek(0)
        print(f.read())

    async def qr_code_auth(self):
        print("\nChoosing QR Code authentication...")
        print("Please scan the QR code with your Telegram app:")
        print("1. Open Telegram on your phone")
        print("2. Go to Settings > Devices > Scan QR")
        print("3. Scan the code below\n")

        qr_login = await self.client.qr_login()
        self.display_qr_code_ascii(qr_login)

        try:
            await qr_login.wait()
            print("\n[INFO] Successfully logged in via QR code!")
            return True
        except SessionPasswordNeededError:
            password = input("Two-factor authentication enabled. Enter your password: ")
            await self.client.sign_in(password=password)
            print("\n[INFO] Successfully logged in with 2FA!")
            return True
        except Exception as e:
            print(f"\n[ERROR] QR code authentication failed: {e}")
            return False

    async def phone_auth(self):
        phone = input("Enter your phone number: ")
        await self.client.send_code_request(phone)
        code = input("Enter the code you received: ")

        try:
            await self.client.sign_in(phone, code)
            print("\n[INFO] Successfully logged in via phone!")
            return True
        except SessionPasswordNeededError:
            password = input("Two-factor authentication enabled. Enter your password: ")
            await self.client.sign_in(password=password)
            print("\n[INFO] Successfully logged in with 2FA!")
            return True
        except Exception as e:
            print(f"\n[ERROR] Phone authentication failed: {e}")
            return False

    async def initialize_client(self, headless: bool = False):
        # If headless, we expect api_id/hash to be present in state or env vars
        if headless and (
            not self.state.get("api_id") or not self.state.get("api_hash")
        ):
            # Try env vars
            if os.getenv("TELEGRAM_API_ID"):
                self.state["api_id"] = int(os.getenv("TELEGRAM_API_ID"))
            if os.getenv("TELEGRAM_API_HASH"):
                self.state["api_hash"] = os.getenv("TELEGRAM_API_HASH")

        if not all([self.state.get("api_id"), self.state.get("api_hash")]):
            if headless:
                print("Missing API credentials in headless mode")
                return False

            print("\n=== API Configuration Required ===")
            print("You need to provide API credentials from https://my.telegram.org")
            try:
                self.state["api_id"] = int(input("Enter your API ID: "))
                self.state["api_hash"] = input("Enter your API Hash: ")
                self.save_state()
            except ValueError:
                print("Invalid API ID. Must be a number.")
                return False

        self.client = TelegramClient(
            "session", self.state["api_id"], self.state["api_hash"]
        )

        try:
            await self.client.connect()
        except Exception as e:
            print(f"Failed to connect: {e}")
            return False

        if not await self.client.is_user_authorized():
            if headless:
                print("Client not authorized. Run interactively first to login.")
                return False

            print("\n=== Choose Authentication Method ===")
            print("[1] QR Code (Recommended - No phone number needed)")
            print("[2] Phone Number (Traditional method)")

            while True:
                choice = input("Enter your choice (1 or 2): ").strip()
                if choice in ["1", "2"]:
                    break
                print("Please enter 1 or 2")

            success = (
                await self.qr_code_auth() if choice == "1" else await self.phone_auth()
            )

            if not success:
                print("Authentication failed. Please try again.")
                await self.client.disconnect()
                return False
        else:
            print("[INFO] Already authenticated!")

        return True

    def parse_channel_selection(self, choice):
        channels_list = list(self.state["channels"].keys())
        selected_channels = []

        if choice.lower() == "all":
            return channels_list

        for selection in [x.strip() for x in choice.split(",")]:
            try:
                if selection.startswith("-"):
                    if selection in self.state["channels"]:
                        selected_channels.append(selection)
                    else:
                        print(f"Channel ID {selection} not found in your channels")
                else:
                    num = int(selection)
                    if 1 <= num <= len(channels_list):
                        selected_channels.append(channels_list[num - 1])
                    else:
                        print(
                            f"Invalid channel number: {num}. Valid range: 1-{len(channels_list)}"
                        )
            except ValueError:
                print(
                    f"Invalid input: {selection}. Use numbers (1,2,3) or full IDs (-100123...)"
                )

        return selected_channels

    async def scrape_channel_by_url(self, url: str, target_lang: str = None):
        """API Helper: Join/Find channel by URL and scrape it"""
        try:
            # Join/Get entity
            entity = await self.client.get_entity(url)
            channel_id = str(entity.id)
            # Add to state if not exists (so we track offsets)
            if channel_id not in self.state["channels"]:
                # For channels we usually need -100 prefix for DB but telethon gives ID
                # If it's a broadcast channel it might be just ID.
                # Let's handle formatting.
                full_id = (
                    f"-100{channel_id}"
                    if not str(channel_id).startswith("-100")
                    else str(channel_id)
                )

                self.state["channels"][full_id] = 0
                username = getattr(entity, "username", "") or "unknown"
                if "channel_names" not in self.state:
                    self.state["channel_names"] = {}
                self.state["channel_names"][full_id] = username
                self.save_state()

                print(f"Added new channel via API: {username} ({full_id})")
                channel_to_scrape = full_id
            else:
                # Find the existing ID key
                channel_to_scrape = (
                    f"-100{channel_id}"
                    if not str(channel_id).startswith("-100")
                    else str(channel_id)
                )

            # Scrape it
            messages = await self.scrape_channel(
                channel_to_scrape,
                0,
                force_rescrape=True,
                target_lang=target_lang,
            )
            return {
                "status": "success",
                "channel_id": channel_to_scrape,
                "messages": messages,
            }

        except Exception as e:
            print(f"API Scrape Error: {e}")
            return {"status": "error", "message": str(e)}

    async def scrape_specific_channels(self):
        if not self.state["channels"]:
            print("No channels available. Use [L] to add channels first")
            return

        await self.view_channels()
        print("\nScrape Options:")
        print("• Single: 1 or -1001234567890")
        print("• Multiple: 1,3,5 or mix formats")
        print("• All channels: all")

        choice = input("\nEnter selection: ").strip()
        selected_channels = self.parse_channel_selection(choice)

        if selected_channels:
            print(f"\nStarting scrape of {len(selected_channels)} channel(s)...")
            for i, channel in enumerate(selected_channels, 1):
                print(f"\n[{i}/{len(selected_channels)}] Scraping: {channel}")
                await self.scrape_channel(channel, self.state["channels"][channel])
            print(f"\n[INFO] Completed scraping {len(selected_channels)} channel(s)!")
        else:
            print("[ERROR] No valid channels selected")

    async def manage_channels(self):
        while True:
            print("\n" + "=" * 40)
            print("           TELEGRAM SCRAPER")
            print("=" * 40)
            print("[S] Scrape channels")
            print("[C] Continuous scraping")
            print(
                f"[M] Media scraping: {'ON' if self.state['scrape_media'] else 'OFF'}"
            )
            print(f"[N] Message limit: {self.state.get('message_limit', 'ALL')}")
            print("[L] List & add channels")
            print("[R] Remove channels")
            print("[Z] Force rescrape channels")
            print("[E] Export data")
            print("[T] Rescrape media")
            print("[F] Fix missing media")
            print("[Q] Quit")
            print("=" * 40)

            choice = input("Enter your choice: ").lower().strip()

            try:
                if choice == "r":
                    if not self.state["channels"]:
                        print("No channels to remove")
                        continue

                    await self.view_channels()
                    print("\nTo remove channels:")
                    print("• Single: 1 or -1001234567890")
                    print("• Multiple: 1,2,3 or mix formats")
                    selection = input("Enter selection: ").strip()
                    selected_channels = self.parse_channel_selection(selection)

                    if selected_channels:
                        removed_count = 0
                        for channel in selected_channels:
                            if channel in self.state["channels"]:
                                del self.state["channels"][channel]
                                print(f"[INFO] Removed channel {channel}")
                                removed_count += 1
                            else:
                                print(f"[ERROR] Channel {channel} not found")

                        if removed_count > 0:
                            self.save_state()
                            print(f"\n[INFO] Removed {removed_count} channel(s)!")
                            await self.view_channels()
                        else:
                            print("No channels were removed")
                    else:
                        print("No valid channels selected")

                elif choice == "s":
                    await self.scrape_specific_channels()

                elif choice == "m":
                    self.state["scrape_media"] = not self.state["scrape_media"]
                    self.save_state()
                    print(
                        f"\n[INFO] Media scraping {'enabled' if self.state['scrape_media'] else 'disabled'}"
                    )

                elif choice == "n":
                    print("\nMessage Limit Configuration")
                    print("Set how many newest messages to save per channel")
                    print("Enter a number (e.g., 5, 10, 50) or 'all' for unlimited")
                    limit_input = input("Enter limit: ").strip().lower()

                    if limit_input == "all":
                        self.state["message_limit"] = None
                        self.save_state()
                        print("[INFO] Message limit removed - will save ALL messages")
                    else:
                        try:
                            limit = int(limit_input)
                            if limit > 0:
                                self.state["message_limit"] = limit
                                self.save_state()
                                print(
                                    f"[INFO] Message limit set to {limit} newest messages"
                                )
                            else:
                                print("[ERROR] Limit must be positive")
                        except ValueError:
                            print("[ERROR] Invalid input. Enter a number or 'all'")

                elif choice == "z":
                    if not self.state["channels"]:
                        print("No channels available. Use [L] to add channels first")
                        continue

                    await self.view_channels()
                    print("\nForce Rescrape Options:")
                    print("• Single: 1 or -1001234567890")
                    print("• Multiple: 1,3,5 or mix formats")
                    print("• All channels: all")

                    choice_input = input("\nEnter selection: ").strip()
                    selected_channels = self.parse_channel_selection(choice_input)

                    if selected_channels:
                        print(
                            f"\nForce rescaping {len(selected_channels)} channel(s)..."
                        )
                        for i, channel in enumerate(selected_channels, 1):
                            print(
                                f"\n[{i}/{len(selected_channels)}] Force rescaping: {channel}"
                            )
                            await self.scrape_channel(channel, 0, force_rescrape=True)
                        print(
                            f"\n[INFO] Completed force rescrape of {len(selected_channels)} channel(s)!"
                        )
                    else:
                        print("[ERROR] No valid channels selected")

                elif choice == "c":
                    task = asyncio.create_task(self.continuous_scraping())
                    print("Continuous scraping started. Press Ctrl+C to stop.")
                    try:
                        await asyncio.sleep(float("inf"))
                    except KeyboardInterrupt:
                        self.continuous_scraping_active = False
                        task.cancel()
                        print("\nStopping continuous scraping...")
                        try:
                            await task
                        except asyncio.CancelledError:
                            pass

                elif choice == "e":
                    await self.export_data()

                elif choice == "l":
                    channels_data = await self.list_channels()

                    if not channels_data:
                        continue

                    print("\nTo add channels from the list above:")
                    print("• Single: 1 or -1001234567890")
                    print("• Multiple: 1,3,5 or mix formats")
                    print("• All channels: all")
                    print("• Press Enter to skip adding")
                    selection = input("\nEnter selection (or Enter to skip): ").strip()

                    if selection:
                        added_count = 0
                        added_channels = []

                        if selection.lower() == "all":
                            for channel_info in channels_data:
                                channel_id = channel_info["channel_id"]
                                if channel_id not in self.state["channels"]:
                                    self.state["channels"][channel_id] = 0
                                    if "channel_names" not in self.state:
                                        self.state["channel_names"] = {}
                                    self.state["channel_names"][channel_id] = (
                                        channel_info["username"]
                                    )
                                    print(
                                        f"✅ Added channel {channel_info['channel_name']} (ID: {channel_id})"
                                    )
                                    added_count += 1
                                else:
                                    print(
                                        f"Channel {channel_info['channel_name']} already added"
                                    )
                        else:
                            for sel in [x.strip() for x in selection.split(",")]:
                                try:
                                    if sel.startswith("-"):
                                        channel_id = sel
                                        channel_info = next(
                                            (
                                                c
                                                for c in channels_data
                                                if c["channel_id"] == channel_id
                                            ),
                                            None,
                                        )
                                        if not channel_info:
                                            print(f"Channel ID {channel_id} not found")
                                            continue
                                    else:
                                        num = int(sel)
                                        if 1 <= num <= len(channels_data):
                                            channel_info = channels_data[num - 1]
                                            channel_id = channel_info["channel_id"]
                                        else:
                                            print(
                                                f"Invalid number: {num}. Choose 1-{len(channels_data)}"
                                            )
                                            continue

                                    if channel_id in self.state["channels"]:
                                        print(
                                            f"Channel {channel_info['channel_name']} already added"
                                        )
                                    else:
                                        self.state["channels"][channel_id] = 0
                                        if "channel_names" not in self.state:
                                            self.state["channel_names"] = {}
                                        self.state["channel_names"][channel_id] = (
                                            channel_info["username"]
                                        )
                                        print(
                                            f"[INFO] Added channel {channel_info['channel_name']} (ID: {channel_id})"
                                        )
                                        added_count += 1
                                        added_channels.append(channel_id)

                                except ValueError:
                                    print(f"Invalid input: {sel}")

                        if added_count > 0:
                            self.save_state()
                            print(f"\n[INFO] Added {added_count} new channel(s)!")
                            await self.view_channels()

                            limit_val = self.state.get("message_limit")
                            limit_display = limit_val if limit_val else "ALL"
                            limit_info = f" (limit: {limit_display})"

                            scrape_now = (
                                input(
                                    f"\nScrape {added_count} new channel(s) immediately?{limit_info} [Y/n]: "
                                )
                                .lower()
                                .strip()
                            )

                            if scrape_now in ["", "y", "yes"]:
                                print(f"\nStarting immediate scrape of new channels...")
                                for i, channel_id in enumerate(added_channels, 1):
                                    print(
                                        f"\n[{i}/{len(added_channels)}] Initializing scrape for: {channel_id}"
                                    )
                                    await self.scrape_channel(
                                        channel_id, 0, force_rescrape=True
                                    )
                                print(f"\n[INFO] Completed immediate scraping!")
                        else:
                            print("No new channels were added")

                elif choice == "t":
                    if not self.state["channels"]:
                        print("No channels available. Add channels first")
                        continue

                    await self.view_channels()
                    print(
                        "\nEnter channel NUMBER (1,2,3...) or full channel ID (-100123...)"
                    )
                    selection = input("Enter your selection: ").strip()
                    selected_channels = self.parse_channel_selection(selection)

                    if len(selected_channels) == 1:
                        channel = selected_channels[0]
                        print(f"Rescaping media for channel: {channel}")
                        await self.rescrape_media(channel)
                    elif len(selected_channels) > 1:
                        print("Please select only one channel for media rescaping")
                    else:
                        print("No valid channel selected")

                elif choice == "f":
                    if not self.state["channels"]:
                        print("No channels available. Add channels first")
                        continue

                    await self.view_channels()
                    print(
                        "\nEnter channel NUMBER (1,2,3...) or full channel ID (-100123...)"
                    )
                    selection = input("Enter your selection: ").strip()
                    selected_channels = self.parse_channel_selection(selection)

                    if len(selected_channels) == 1:
                        channel = selected_channels[0]
                        await self.fix_missing_media(channel)
                    elif len(selected_channels) > 1:
                        print("Please select only one channel for fixing missing media")
                    else:
                        print("No valid channel selected")

                elif choice == "q":
                    print("\nGoodbye!")
                    self.close_db_connections()
                    if self.client:
                        await self.client.disconnect()
                    sys.exit()

                else:
                    print("Invalid option")

            except Exception as e:
                print(f"Error: {e}")

    async def run(self):
        display_ascii_art()
        if await self.initialize_client():
            try:
                await self.manage_channels()
            finally:
                self.close_db_connections()
                if self.client:
                    await self.client.disconnect()
        else:
            print("Failed to initialize client. Exiting.")


async def main():
    scraper = OptimizedTelegramScraper()
    await scraper.run()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nProgram interrupted. Exiting...")
        sys.exit()
