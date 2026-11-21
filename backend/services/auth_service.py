"""Authentication and JWT Token Service for CivicSetu."""

import os
import hmac
import hashlib
import base64
import json
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any

from backend.config import settings

logger = logging.getLogger("civicsetu.auth_service")


def hash_password(password: str) -> str:
    """Hashes password using PBKDF2-HMAC-SHA256 with a 16-byte random salt."""
    salt = os.urandom(16)
    pw_hash = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt,
        iterations=100000
    )
    salt_hex = salt.hex()
    hash_hex = pw_hash.hex()
    return f"{salt_hex}${hash_hex}"


def verify_password(password: str, hashed_str: str) -> bool:
    """Verifies a plain password against the stored salt$hash string."""
    try:
        parts = hashed_str.split("$")
        if len(parts) != 2:
            return False
        salt = bytes.fromhex(parts[0])
        expected_hash = bytes.fromhex(parts[1])
        actual_hash = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            salt,
            iterations=100000
        )
        return hmac.compare_digest(actual_hash, expected_hash)
    except Exception as e:
        logger.warning(f"Password verification failure: {e}")
        return False


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("utf-8").rstrip("=")


def _b64url_decode(s: str) -> bytes:
    padding = 4 - (len(s) % 4)
    if padding < 4:
        s += "=" * padding
    return base64.urlsafe_b64decode(s.encode("utf-8"))


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Generates an RFC 7519 HMAC-SHA256 standard JWT token."""
    header = {"alg": "HS256", "typ": "JWT"}
    header_json = json.dumps(header, separators=(",", ":")).encode("utf-8")
    header_b64 = _b64url_encode(header_json)

    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.JWT_EXPIRE_MINUTES)

    to_encode["exp"] = int(expire.timestamp())
    to_encode["iat"] = int(now.timestamp())

    payload_json = json.dumps(to_encode, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
    payload_b64 = _b64url_encode(payload_json)

    signing_input = f"{header_b64}.{payload_b64}".encode("utf-8")
    signature = hmac.new(
        settings.JWT_SECRET.encode("utf-8"),
        signing_input,
        hashlib.sha256
    ).digest()
    sig_b64 = _b64url_encode(signature)

    return f"{header_b64}.{payload_b64}.{sig_b64}"


def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """Decodes and validates an RFC 7519 HMAC-SHA256 JWT token."""
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None

        header_b64, payload_b64, sig_b64 = parts
        signing_input = f"{header_b64}.{payload_b64}".encode("utf-8")
        expected_sig = hmac.new(
            settings.JWT_SECRET.encode("utf-8"),
            signing_input,
            hashlib.sha256
        ).digest()
        actual_sig = _b64url_decode(sig_b64)

        if not hmac.compare_digest(expected_sig, actual_sig):
            logger.warning("JWT signature mismatch")
            return None

        payload_bytes = _b64url_decode(payload_b64)
        payload = json.loads(payload_bytes.decode("utf-8"))

        # Verify expiration
        exp = payload.get("exp")
        if exp and datetime.now(timezone.utc).timestamp() > exp:
            logger.warning("JWT token expired")
            return None

        return payload
    except Exception as e:
        logger.warning(f"Error decoding JWT token: {e}")
        return None
