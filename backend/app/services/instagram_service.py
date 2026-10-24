import os
import time
from typing import Any

import requests
from dotenv import load_dotenv

load_dotenv()

GRAPH_API_URL = "https://graph.instagram.com"
REQUEST_TIMEOUT = 20
CACHE_TTL_SECONDS = 60

# Request only metrics that have already worked with your account.
# Meta's supported metrics can vary by media type and API version.
INSIGHT_METRICS = [
    "views",
    "reach",
    "likes",
    "comments",
    "shares",
    "saved",
    "total_interactions",
]

# Lightweight in-memory TTL cache keyed by requested post limit.
_ANALYTICS_CACHE: dict[int, tuple[float, dict[str, Any]]] = {}


class InstagramAPIError(Exception):
    """Raised when the Instagram API request fails."""


def clear_instagram_cache() -> None:
    """Clear the in-memory Instagram analytics cache."""
    _ANALYTICS_CACHE.clear()


def _get_access_token() -> str:
    token = os.getenv("INSTAGRAM_ACCESS_TOKEN")

    if not token:
        raise InstagramAPIError(
            "Instagram access token is not configured."
        )

    return token


def _get(
    endpoint: str,
    params: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Make an authenticated Instagram Graph API GET request."""
    request_params = dict(params or {})

    try:
        response = requests.get(
            f"{GRAPH_API_URL}/{endpoint.lstrip('/')}",
            params=request_params,
            headers={
                "Authorization": f"Bearer {_get_access_token()}"
            },
            timeout=REQUEST_TIMEOUT,
        )
    except requests.RequestException as exc:
        raise InstagramAPIError(
            "Could not connect to the Instagram API."
        ) from exc

    try:
        payload = response.json()
    except ValueError as exc:
        raise InstagramAPIError(
            "Instagram returned an invalid response."
        ) from exc

    if not response.ok:
        error = payload.get("error", {})
        message = error.get("message", "Instagram request failed.")

        # Avoid exposing access tokens or request URLs in exceptions.
        raise InstagramAPIError(
            f"Instagram API error (HTTP {response.status_code}): "
            f"{message}"
        )

    return payload


def _fetch_post_insights(media_id: str) -> dict[str, int | None]:
    """Fetch available metrics for one media item."""
    payload = _get(
        f"{media_id}/insights",
        {"metric": ",".join(INSIGHT_METRICS)},
    )

    insights: dict[str, int | None] = {
        metric: None for metric in INSIGHT_METRICS
    }

    for item in payload.get("data", []):
        name = item.get("name")
        values = item.get("values", [])

        if name in insights and values:
            value = values[0].get("value")
            if isinstance(value, (int, float)):
                insights[name] = int(value)

    return insights


def get_recent_post_analytics(
    limit: int = 10,
    *,
    use_cache: bool = True,
) -> dict[str, Any]:
    """
    Retrieve recent Instagram posts and available insights.

    A missing metric is represented as None rather than zero.
    This avoids treating unavailable data as a real zero.
    """
    if not 1 <= limit <= 25:
        raise ValueError("Limit must be between 1 and 25.")

    now = time.monotonic()

    if use_cache and limit in _ANALYTICS_CACHE:
        cached_at, cached_payload = _ANALYTICS_CACHE[limit]
        if now - cached_at < CACHE_TTL_SECONDS:
            return cached_payload

    media_payload = _get(
        "me/media",
        {
            "fields": "id,caption,media_type,permalink,timestamp",
            "limit": limit,
        },
    )

    posts: list[dict[str, Any]] = []
    insight_errors = 0

    for media in media_payload.get("data", []):
        media_id = media.get("id")

        if not media_id:
            continue

        post = {
            "media_id": media_id,
            "caption": media.get("caption"),
            "media_type": media.get("media_type"),
            "permalink": media.get("permalink"),
            "published_at": media.get("timestamp"),
            "insights": {
                metric: None for metric in INSIGHT_METRICS
            },
            "insights_available": False,
        }

        try:
            post["insights"] = _fetch_post_insights(media_id)
            post["insights_available"] = any(
                value is not None
                for value in post["insights"].values()
            )
        except InstagramAPIError:
            # One unsupported post or metric should not stop
            # analytics retrieval for every other post.
            insight_errors += 1

        posts.append(post)

    result = {
        "posts": posts,
        "posts_retrieved": len(posts),
        "posts_with_insights": sum(
            post["insights_available"] for post in posts
        ),
        "posts_with_insight_errors": insight_errors,
    }

    if use_cache:
        _ANALYTICS_CACHE[limit] = (now, result)

    return result