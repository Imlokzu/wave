import asyncio
import importlib.util
import os
import sys
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
from fastapi import BackgroundTasks, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

# Load environment variables
load_dotenv()

# Import the scraper module (handling the hyphen in filename)
try:
    file_path = os.path.join(os.path.dirname(__file__), "telegram-scraper.py")
    spec = importlib.util.spec_from_file_location("telegram_scraper", file_path)
    telegram_scraper_module = importlib.util.module_from_spec(spec)
    sys.modules["telegram_scraper"] = telegram_scraper_module
    spec.loader.exec_module(telegram_scraper_module)
    OptimizedTelegramScraper = telegram_scraper_module.OptimizedTelegramScraper
except Exception as e:
    print(f"Error importing scraper: {e}")
    sys.exit(1)


# Global scraper instance
scraper_instance = None


async def run_periodic_checks(interval_seconds: int = 600):
    """Background task to scrape channels periodically"""
    while True:
        try:
            await asyncio.sleep(interval_seconds)
            if (
                scraper_instance
                and scraper_instance.client
                and await scraper_instance.client.is_user_authorized()
            ):
                print(
                    f"Starting automatic background scrape (Every {interval_seconds}s)..."
                )
                if scraper_instance.state.get("channels"):
                    for channel_id in list(scraper_instance.state["channels"].keys()):
                        try:
                            print(f"   Checking channel: {channel_id}")
                            await scraper_instance.scrape_channel(
                                channel_id, 0, force_rescrape=True
                            )
                        except Exception as c_e:
                            print(f"   Error auto-scraping {channel_id}: {c_e}")
                    print("Automatic background scrape finished.")
                else:
                    print("   No channels to scrape.")
        except asyncio.CancelledError:
            break
        except Exception as e:
            print(f"Error in periodic scrape loop: {e}")
            await asyncio.sleep(60)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Handle startup and shutdown events.
    Initializes the Telegram client in headless mode.
    """
    global scraper_instance
    print("Initializing Telegram Scraper API...")

    scraper_instance = OptimizedTelegramScraper()

    # Initialize in headless mode (uses ENV vars or saved session)
    # Ensure you have logged in at least once interactively to generate the session file!
    success = await scraper_instance.initialize_client(headless=True)

    if success:
        print("Telegram Client connected and authorized!")
    else:
        print("Failed to connect Telegram Client. Check credentials or session.")

    # Start the background task
    bg_task = asyncio.create_task(run_periodic_checks())

    yield

    # Shutdown logic
    print("Shutting down Telegram Scraper API...")
    bg_task.cancel()
    try:
        await bg_task
    except asyncio.CancelledError:
        pass

    if scraper_instance:
        scraper_instance.close_db_connections()
        if scraper_instance.client:
            await scraper_instance.client.disconnect()


app = FastAPI(title="Telegram Feed Scraper API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory="."), name="static")


class ScrapeRequest(BaseModel):
    url: str
    limit: int = 5  # Default to scraping 5 newest messages
    lang: str = None  # Target language for translation


@app.get("/")
async def health_check():
    """Health check endpoint."""
    status = (
        "connected"
        if scraper_instance
        and scraper_instance.client
        and await scraper_instance.client.is_user_authorized()
        else "disconnected"
    )
    return {
        "status": "online",
        "telegram_client": status,
        "supabase_enabled": bool(scraper_instance.supabase)
        if scraper_instance
        else False,
    }


@app.get("/feed", response_class=HTMLResponse)
async def feed_ui():
    return """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Telegram Feed</title>
        <link href="https://vjs.zencdn.net/8.23.4/video-js.css" rel="stylesheet" />
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background: #f0f2f5; color: #1c1e21; }
            .input-group { display: flex; gap: 10px; margin-bottom: 30px; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            input { flex: 1; padding: 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 16px; }
            button { padding: 12px 24px; background: #0088cc; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 16px; font-weight: 500; transition: background 0.2s; }
            button:hover { background: #0077b3; }
            button:disabled { background: #ccc; cursor: not-allowed; }
            .post { background: white; padding: 24px; margin-bottom: 20px; border-radius: 12px; box-shadow: 0 1px 2px rgba(0,0,0,0.1); }
            .meta { color: #65676b; font-size: 13px; margin-bottom: 12px; display: flex; justify-content: space-between; }
            .content { white-space: pre-wrap; line-height: 1.6; font-size: 15px; margin-bottom: 12px; }
            img { max-width: 100%; max-height: 250px; width: auto; border-radius: 8px; border: 1px solid #eee; display: block; margin-top: 10px; }
            .video-js { max-width: 100%; max-height: 250px; border-radius: 8px; margin-top: 10px; background-color: transparent; width: auto !important; height: auto !important; }
            .video-js .vjs-tech { position: relative !important; max-height: 250px; width: auto !important; height: auto !important; }
            .loading { text-align: center; display: none; margin: 20px; color: #666; }
            h1 { text-align: center; color: #0088cc; margin-bottom: 30px; }
        </style>
    </head>
    <body>
        <h1>Telegram Feed Scraper</h1>

        <div class="input-group">
            <input type="text" id="url" placeholder="Enter Telegram Channel URL (e.g., https://t.me/durov)">
            <input type="number" id="limit" value="5" style="max-width: 80px" min="1" max="100">
            <select id="lang" style="padding: 12px; border-radius: 6px; border: 1px solid #ddd;">
                <option value="">No Translation</option>
                <option value="English">English</option>
                <option value="Ukrainian">Ukrainian</option>
                <option value="Spanish">Spanish</option>
                <option value="French">French</option>
                <option value="German">German</option>
                <option value="Chinese">Chinese</option>
            </select>
            <button onclick="scrape()">Load Feed</button>
        </div>

        <div id="loading" class="loading">Loading feed... this takes a few seconds...</div>
        <div id="feed"></div>

        <script src="https://vjs.zencdn.net/8.23.4/video.min.js"></script>
        <script>
            async function scrape() {
                const url = document.getElementById('url').value;
                const limit = document.getElementById('limit').value;
                const lang = document.getElementById('lang').value;
                const btn = document.querySelector('button');
                const loading = document.getElementById('loading');
                const feed = document.getElementById('feed');

                if (!url) return alert('Please enter a URL');

                btn.disabled = true;
                loading.style.display = 'block';
                feed.innerHTML = '';

                try {
                    const response = await fetch('/scrape', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({url, limit: parseInt(limit), lang})
                    });

                    const data = await response.json();

                    if (data.status === 'success') {
                        data.messages.forEach(msg => {
                            const post = document.createElement('div');
                            post.className = 'post';

                            let mediaHtml = '';
                            let isVideo = false;
                            const videoId = 'vid-' + msg.message_id;

                            if (msg.media_url) {
                                const ext = msg.media_url.split('.').pop().toLowerCase();
                                if (['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(ext)) {
                                    isVideo = true;
                                    let mimeType = 'video/mp4';
                                    if (ext === 'webm') mimeType = 'video/webm';

                                    mediaHtml = `
                                        <video
                                            id="${videoId}"
                                            class="video-js vjs-big-play-centered"
                                            controls
                                            preload="metadata"
                                            data-setup="{}"
                                        >
                                            <source src="${msg.media_url}" type="${mimeType}" />
                                        </video>`;
                                } else {
                                    mediaHtml = `<img src="${msg.media_url}" loading="lazy" onclick="window.open(this.src, '_blank')">`;
                                }
                            }

                            post.innerHTML = `
                                <div class="meta">
                                    <span>${msg.date}</span>
                                    <span>👁️ ${msg.views || 0}</span>
                                </div>
                                <div class="content">${msg.message || ''}</div>
                                ${mediaHtml}
                            `;
                            feed.appendChild(post);

                            if (isVideo) {
                                videojs(videoId);
                            }
                        });
                        if (data.messages.length === 0) {
                            feed.innerHTML = '<div class="post" style="text-align:center">No messages found</div>';
                        }
                    } else {
                        alert('Error: ' + (data.detail || 'Unknown error'));
                    }
                } catch (e) {
                    alert('Error: ' + e.message);
                } finally {
                    btn.disabled = false;
                    loading.style.display = 'none';
                }
            }
        </script>
    </body>
    </html>
    """


@app.post("/scrape")
async def scrape_channel(request: ScrapeRequest, background_tasks: BackgroundTasks):
    """
    Scrape a specific channel by URL.
    This triggers the scraper to fetch messages and upload to Supabase.
    """
    if not scraper_instance or not scraper_instance.client:
        raise HTTPException(status_code=503, detail="Scraper not initialized")

    if not await scraper_instance.client.is_user_authorized():
        raise HTTPException(
            status_code=401,
            detail="Bot not authorized. Please run interactively to login.",
        )

    # Set the limit for this request if provided
    if request.limit:
        scraper_instance.state["message_limit"] = request.limit

    print(f"Incoming request to scrape: {request.url}")

    # We perform the scraping
    # Note: Depending on response time requirements, this could be moved to background_tasks
    # But user likely wants to know if it succeeded.

    try:
        result = await scraper_instance.scrape_channel_by_url(
            request.url, target_lang=request.lang
        )

        if result.get("status") == "error":
            raise HTTPException(status_code=400, detail=result.get("message"))

        # Process messages for frontend
        raw_messages = result.get("messages", [])
        clean_messages = []

        for msg in raw_messages:
            msg_dict = {
                "message_id": msg.message_id,
                "date": msg.date,
                "message": msg.message,
                "views": msg.views,
                "media_url": None,
            }

            if msg.media_path:
                try:
                    # Convert absolute path to relative for static serving
                    # Assumes app is running from project root
                    rel_path = os.path.relpath(msg.media_path, os.getcwd())
                    rel_path = rel_path.replace("\\", "/")
                    msg_dict["media_url"] = f"/static/{rel_path}"
                except Exception:
                    pass

            clean_messages.append(msg_dict)

        # Reverse messages so newest appear at the bottom
        clean_messages.reverse()

        return {
            "status": "success",
            "channel_id": result.get("channel_id"),
            "messages": clean_messages,
        }

    except Exception as e:
        print(f"Error in /scrape endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/posts")
async def get_posts(limit: int = 20):
    """
    Get recent posts from all channels.
    """
    if not scraper_instance:
        raise HTTPException(status_code=503, detail="Scraper not initialized")

    try:
        raw_messages = scraper_instance.get_recent_messages(limit=limit)
        clean_messages = []

        for msg in raw_messages:
            msg_dict = msg.copy()
            msg_dict["media_url"] = None

            if msg.get("media_path"):
                try:
                    # Convert absolute path to relative for static serving
                    # Assumes app is running from project root
                    rel_path = os.path.relpath(msg["media_path"], os.getcwd())
                    rel_path = rel_path.replace("\\", "/")
                    msg_dict["media_url"] = f"/static/{rel_path}"
                except Exception:
                    pass

            clean_messages.append(msg_dict)

        return {"status": "success", "messages": clean_messages}

    except Exception as e:
        print(f"Error in /posts endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/channel-photo/{channel_id}")
async def get_channel_photo(channel_id: str):
    """
    Get channel profile picture URL.
    Returns the static URL if available, otherwise returns None.
    """
    try:
        # Check if profile picture exists
        channel_dir = Path("channels") / channel_id
        photo_path = channel_dir / "profile.jpg"
        
        if photo_path.exists():
            rel_path = os.path.relpath(str(photo_path), os.getcwd())
            rel_path = rel_path.replace("\\", "/")
            return {
                "status": "success",
                "photo_url": f"/static/{rel_path}"
            }
        else:
            return {
                "status": "not_found",
                "photo_url": None
            }
    except Exception as e:
        print(f"Error getting channel photo: {e}")
        return {
            "status": "error",
            "photo_url": None
        }


@app.post("/cleanup")
async def cleanup_old_data(days: int = 3):
    """
    Trigger cleanup of old messages in Supabase.
    """
    if not scraper_instance or not scraper_instance.supabase:
        raise HTTPException(status_code=501, detail="Supabase not configured")

    # This assumes the SupabaseManager has a working cleanup method or we implement it here
    # Currently the cleanup method in SupabaseManager was a placeholder.
    # We can leave this as a stub or implementation dependent.

    return {
        "status": "not_implemented",
        "message": "Auto-delete logic should be handled by Supabase Database Webhooks or Cron",
    }
