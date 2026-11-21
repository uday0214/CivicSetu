"""Media Storage Adapter: Local uploads vs Google Cloud Storage (us-central1)."""

import os
import uuid
import logging
from abc import ABC, abstractmethod
from backend.config import settings

logger = logging.getLogger("civicsetu.storage")


class MediaStorageAdapter(ABC):
    """Abstract interface for storing binary image/audio assets."""

    @abstractmethod
    async def save_bytes(self, data: bytes, mime_type: str, filename_prefix: str = "") -> str:
        """Saves binary media and returns a servable URL."""
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

        logger.info(f"Saved media file locally: {filepath}")
        return f"/uploads/{filename}"


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


def get_media_storage() -> MediaStorageAdapter:
    if settings.DATA_STORE_MODE == "firestore":
        return GCSMediaStorage(bucket_name=settings.GCS_BUCKET)
    return LocalMediaStorage()
