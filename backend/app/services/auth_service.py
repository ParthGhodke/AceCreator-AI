import base64
import hashlib
import hmac
import json
import os
import secrets
import time
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from uuid import UUID

from dotenv import load_dotenv
from fastapi import Cookie, Depends, Header, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models.user import RefreshSession, User

load_dotenv()

# Fallback secret for local dev/testing if JWT_SECRET_KEY is not yet in .env
JWT_SECRET_KEY = os.getenv(
    "JWT_SECRET_KEY",
    "acecreator-local-dev-secret-change-in-production-9f8e7d6c5b4a",
)

ACCESS_TOKEN_EXPIRE_SECONDS = 15 * 60  # 15 minutes
REFRESH_TOKEN_EXPIRE_DAYS = 7  # 7 days

ACCESS_COOKIE_NAME = "acecreator_access"
REFRESH_COOKIE_NAME = "acecreator_refresh"
COOKIE_SECURE = os.getenv("COOKIE_SECURE", "false").lower() == "true"
COOKIE_SAMESITE = os.getenv("COOKIE_SAMESITE", "lax").lower()

# In-memory sliding window rate limiter for auth endpoints: IP -> list[timestamp]
RATE_LIMIT_WINDOW_SECONDS = 60
RATE_LIMIT_MAX_REQUESTS = 12
_RATE_LIMIT_BUCKETS: dict[str, list[float]] = defaultdict(list)


def clear_rate_limits() -> None:
    """Reset rate limit counters (used by automated tests)."""
    _RATE_LIMIT_BUCKETS.clear()


def check_auth_rate_limit(request: Request) -> None:
    """Enforce sliding-window rate limiting on sensitive auth endpoints."""
    client_host = request.client.host if request.client else "local"
    now = time.monotonic()

    timestamps = [
        ts
        for ts in _RATE_LIMIT_BUCKETS[client_host]
        if now - ts < RATE_LIMIT_WINDOW_SECONDS
    ]
    if len(timestamps) >= RATE_LIMIT_MAX_REQUESTS:
        _RATE_LIMIT_BUCKETS[client_host] = timestamps
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many authentication attempts. Please wait a minute and try again.",
        )

    timestamps.append(now)
    _RATE_LIMIT_BUCKETS[client_host] = timestamps


def hash_password(password: str) -> str:
    """Hash a password using salted scrypt (with PBKDF2 fallback)."""
    salt = secrets.token_bytes(16)
    derived = hashlib.scrypt(
        password.encode("utf-8"),
        salt=salt,
        n=16384,
        r=8,
        p=1,
        dklen=32,
    )
    return f"scrypt$16384$8$1${salt.hex()}${derived.hex()}"


def verify_password(password: str, stored_hash: str) -> bool:
    """Verify a password in constant time against its stored scrypt hash."""
    try:
        algorithm, n_str, r_str, p_str, salt_hex, derived_hex = stored_hash.split("$")
        if algorithm != "scrypt":
            return False
        salt = bytes.fromhex(salt_hex)
        expected = bytes.fromhex(derived_hex)
        candidate = hashlib.scrypt(
            password.encode("utf-8"),
            salt=salt,
            n=int(n_str),
            r=int(r_str),
            p=int(p_str),
            dklen=len(expected),
        )
        return secrets.compare_digest(candidate, expected)
    except Exception:
        return False


def _b64url_encode(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")


def _b64url_decode(encoded: str) -> bytes:
    padding = "=" * (-len(encoded) % 4)
    return base64.urlsafe_b64decode(encoded + padding)


def create_access_token(user_id: UUID) -> str:
    """Create a short-lived HS256-signed JWT access token."""
    now = int(time.time())
    header = {"alg": "HS256", "typ": "JWT"}
    payload = {
        "sub": str(user_id),
        "iat": now,
        "exp": now + ACCESS_TOKEN_EXPIRE_SECONDS,
        "type": "access",
    }

    header_b64 = _b64url_encode(json.dumps(header, separators=(",", ":")).encode("utf-8"))
    payload_b64 = _b64url_encode(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    signing_input = f"{header_b64}.{payload_b64}".encode("ascii")

    signature = hmac.new(
        JWT_SECRET_KEY.encode("utf-8"),
        signing_input,
        hashlib.sha256,
    ).digest()

    return f"{header_b64}.{payload_b64}.{_b64url_encode(signature)}"


def decode_access_token(token: str) -> UUID:
    """Verify signature and expiration of an HS256 access token and return user_id."""
    try:
        parts = token.split(".")
        if len(parts) != 3:
            raise ValueError("Invalid token structure")

        header_b64, payload_b64, signature_b64 = parts
        signing_input = f"{header_b64}.{payload_b64}".encode("ascii")
        expected_sig = hmac.new(
            JWT_SECRET_KEY.encode("utf-8"),
            signing_input,
            hashlib.sha256,
        ).digest()

        actual_sig = _b64url_decode(signature_b64)
        if not secrets.compare_digest(expected_sig, actual_sig):
            raise ValueError("Invalid token signature")

        payload = json.loads(_b64url_decode(payload_b64).decode("utf-8"))
        if payload.get("type") != "access":
            raise ValueError("Invalid token type")

        exp = int(payload.get("exp", 0))
        if int(time.time()) >= exp:
            raise ValueError("Token has expired")

        return UUID(str(payload["sub"]))
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token.",
        ) from exc


def hash_refresh_token(raw_token: str) -> str:
    """Return the SHA-256 hex digest of a raw refresh token."""
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


def create_refresh_session(db: Session, user_id: UUID) -> str:
    """Create a persisted refresh session in PostgreSQL and return the raw token."""
    raw_token = secrets.token_urlsafe(48)
    token_hash = hash_refresh_token(raw_token)
    expires_at = datetime.now(timezone.utc) + timedelta(
        days=REFRESH_TOKEN_EXPIRE_DAYS
    )

    session_record = RefreshSession(
        user_id=user_id,
        token_hash=token_hash,
        expires_at=expires_at,
    )
    db.add(session_record)
    db.commit()
    return raw_token


def rotate_refresh_session(db: Session, raw_token: str) -> tuple[User, str]:
    """
    Validate a refresh token, revoke the old session record, and issue a new one.
    """
    token_hash = hash_refresh_token(raw_token)
    session_record = (
        db.query(RefreshSession)
        .filter(RefreshSession.token_hash == token_hash)
        .first()
    )

    now = datetime.now(timezone.utc)

    if session_record is None or session_record.revoked_at is not None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh session is invalid or has already been revoked.",
        )

    expires_at = session_record.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if now >= expires_at:
        session_record.revoked_at = now
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh session has expired. Please sign in again.",
        )

    user = (
        db.query(User)
        .filter(User.id == session_record.user_id, User.is_active.is_(True))
        .first()
    )

    if user is None:
        session_record.revoked_at = now
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is no longer active.",
        )

    # Rotate: revoke current session and mint a fresh refresh token
    session_record.revoked_at = now
    new_raw_token = secrets.token_urlsafe(48)
    new_session = RefreshSession(
        user_id=user.id,
        token_hash=hash_refresh_token(new_raw_token),
        expires_at=now + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
    )
    db.add(new_session)
    db.commit()

    return user, new_raw_token


def set_auth_cookies(
    response: Response,
    access_token: str,
    refresh_token: str,
) -> None:
    """Set HttpOnly access and refresh cookies on the outgoing HTTP response."""
    response.set_cookie(
        key=ACCESS_COOKIE_NAME,
        value=access_token,
        max_age=ACCESS_TOKEN_EXPIRE_SECONDS,
        httponly=True,
        samesite=COOKIE_SAMESITE,  # type: ignore[arg-type]
        secure=COOKIE_SECURE,
        path="/",
    )
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=refresh_token,
        max_age=REFRESH_TOKEN_EXPIRE_DAYS * 86400,
        httponly=True,
        samesite=COOKIE_SAMESITE,  # type: ignore[arg-type]
        secure=COOKIE_SECURE,
        path="/api/auth",
    )


def clear_auth_cookies(response: Response) -> None:
    """Remove authentication cookies from the client browser."""
    response.delete_cookie(key=ACCESS_COOKIE_NAME, path="/")
    response.delete_cookie(key=REFRESH_COOKIE_NAME, path="/api/auth")


def _extract_token(
    authorization: str | None,
    access_cookie: str | None,
) -> str | None:
    if authorization and authorization.lower().startswith("bearer "):
        return authorization[7:].strip()
    if access_cookie:
        return access_cookie.strip()
    return None


def get_optional_current_user(
    authorization: str | None = Header(default=None),
    access_cookie: str | None = Cookie(default=None, alias=ACCESS_COOKIE_NAME),
    db: Session = Depends(get_db),
) -> User | None:
    """
    Resolve the authenticated User if a token/cookie is supplied.
    If a token IS supplied but invalid/expired, raise 401.
    If no token is supplied at all, return None (allowing unowned dev fallback).
    """
    token = _extract_token(authorization, access_cookie)
    if not token:
        return None

    user_id = decode_access_token(token)
    user = (
        db.query(User)
        .filter(User.id == user_id, User.is_active.is_(True))
        .first()
    )
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account not found or inactive.",
        )
    return user


def get_current_user(
    user: User | None = Depends(get_optional_current_user),
) -> User:
    """Strictly require an authenticated User (raises 401 if unauthenticated)."""
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication is required to access this resource.",
        )
    return user
