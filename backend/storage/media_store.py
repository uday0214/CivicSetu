"""Media Storage Adapter: Local uploads vs Google Cloud Storage (us-central1)."""

import os
import uuid
import logging
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from typing import Optional
from backend.config import settings

logger = logging.getLogger("civicsetu.storage")


class MediaStorageAdapter(ABC):
    """Abstract interface for storing binary image/audio assets."""

    @abstractmethod
    async def save_bytes(self, data: bytes, mime_type: str, filename_prefix: str = "") -> str:
        """Saves binary media and returns a servable URL."""
        pass

    @abstractmethod
    async def read_bytes(self, url: str) -> Optional[bytes]:
        """Reads binary media from a stored URL."""
        pass


class LocalMediaStorage(MediaStorageAdapter):
    """Stores media files locally in backend/uploads/ and returns servable relative path."""

    def __init__(self, upload_dir: str = "backend/uploads"):
        self.upload_dir = upload_dir
        os.makedirs(self.upload_dir, exist_ok=True)

    async def save_bytes(self, data: bytes, mime_type: str, filename_prefix: str = "") -> str:
        ext = "jpg"
        if "png" in mime_type:
            ext = "png"
        elif "webp" in mime_type:
            ext = "webp"
        elif "webm" in mime_type:
            ext = "webm"
        elif "mp4" in mime_type:
            ext = "mp4"
        elif "wav" in mime_type:
            ext = "wav"

        prefix = f"{filename_prefix}_" if filename_prefix else ""
        filename = f"{prefix}{uuid.uuid4().hex[:12]}.{ext}"
        filepath = os.path.join(self.upload_dir, filename)

        with open(filepath, "wb") as f:
            f.write(data)

        file_url = f"/uploads/{filename}"
        logger.info(f"Saved media file locally: {filepath}")

        # Record asset metadata in lightweight database
        try:
            from backend.storage.sqlite_store import get_sqlite_repository
            repo = get_sqlite_repository()
            asset_type = "photo"
            if "audio" in mime_type:
                asset_type = "audio"
            elif "after" in filename_prefix:
                asset_type = "audit_after"
            elif "before" in filename_prefix:
                asset_type = "audit_before"

            await repo.record_asset({
                "asset_id": uuid.uuid4().hex[:16],
                "filename": filename,
                "file_url": file_url,
                "file_path": filepath,
                "mime_type": mime_type,
                "size_bytes": len(data),
                "asset_type": asset_type,
                "created_at": datetime.now(timezone.utc).isoformat(),
            })
        except Exception as e:
            logger.warning(f"Could not record asset in SQLite store: {e}")

        return file_url

    async def read_bytes(self, url: str) -> Optional[bytes]:
        if not url:
            return None
        filename = os.path.basename(url)
        filepath = os.path.join(self.upload_dir, filename)
        if os.path.exists(filepath):
            try:
                with open(filepath, "rb") as f:
                    return f.read()
            except Exception as e:
                logger.error(f"Failed to read local media {filepath}: {e}")
        return None


class GCSMediaStorage(MediaStorageAdapter):
    """Stores media files in a regional us-central1 Cloud Storage bucket."""

    def __init__(self, bucket_name: str):
        self.bucket_name = bucket_name
        self._bucket = None

    def _get_bucket(self):
        if not self._bucket:
            from google.cloud import storage
            client = storage.Client(project=settings.GOOGLE_CLOUD_PROJECT)
            self._bucket = client.bucket(self.bucket_name)
        return self._bucket

    async def save_bytes(self, data: bytes, mime_type: str, filename_prefix: str = "") -> str:
        ext = "jpg"
        if "png" in mime_type:
            ext = "png"
        elif "webp" in mime_type:
            ext = "webp"
        elif "webm" in mime_type:
            ext = "webm"
        elif "mp4" in mime_type:
            ext = "mp4"
        elif "wav" in mime_type:
            ext = "wav"

        prefix = f"{filename_prefix}_" if filename_prefix else ""
        filename = f"{prefix}{uuid.uuid4().hex[:12]}.{ext}"

        bucket = self._get_bucket()
        blob = bucket.blob(filename)
        blob.upload_from_string(data, content_type=mime_type)

        logger.info(f"Uploaded media to GCS: gs://{self.bucket_name}/{filename}")
        return f"https://storage.googleapis.com/{self.bucket_name}/{filename}"

    async def read_bytes(self, url: str) -> Optional[bytes]:
        if not url:
            return None
        try:
            filename = os.path.basename(url)
            bucket = self._get_bucket()
            blob = bucket.blob(filename)
            return blob.download_as_bytes()
        except Exception as e:
            logger.error(f"Failed to read GCS media {url}: {e}")
            return None


def get_media_storage() -> MediaStorageAdapter:
    if settings.DATA_STORE_MODE == "firestore":
        return GCSMediaStorage(bucket_name=settings.GCS_BUCKET)
    return LocalMediaStorage()
