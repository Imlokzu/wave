import os

from supabase import Client, create_client


class SupabaseManager:
    def __init__(self, url: str, key: str):
        if not url or not key:
            raise ValueError("Supabase URL and Key are required")
        self.client: Client = create_client(url, key)

    def upload_media(self, bucket: str, local_path: str, storage_path: str) -> str:
        """
        Uploads a file to Supabase Storage and returns the public URL.
        """
        try:
            # Determine content type based on extension
            ext = local_path.split(".")[-1].lower()
            content_type = "image/jpeg"  # default
            if ext == "png":
                content_type = "image/png"
            elif ext == "mp4":
                content_type = "video/mp4"

            with open(local_path, "rb") as f:
                self.client.storage.from_(bucket).upload(
                    file=f,
                    path=storage_path,
                    file_options={"content-type": content_type, "upsert": "true"},
                )
            return self.client.storage.from_(bucket).get_public_url(storage_path)
        except Exception as e:
            print(f"Supabase Upload Error: {e}")
            return None

    def save_message(self, table: str, data: dict):
        """
        Saves a message record to the database.
        """
        try:
            # Use upsert to avoid duplicates based on message_id if configured in Supabase
            return (
                self.client.table(table)
                .upsert(data, on_conflict="message_id")
                .execute()
            )
        except Exception as e:
            print(f"Supabase Insert Error: {e}")
            return None

    def cleanup_old_messages(self, table: str, days: int = 3):
        """
        Deletes messages older than specific days.
        Assumes there is a 'date' column with ISO timestamp or similar.
        """
        # This is complex to do purely client side without raw SQL or precise dates
        # Typically better handled by a Postgres Cron job or Database Trigger
        pass
