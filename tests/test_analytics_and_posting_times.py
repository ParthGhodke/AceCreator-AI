from datetime import datetime, timezone

import pytest

from backend.app.services.analytics_summary_service import (
    build_analytics_summary,
)
from backend.app.services.instagram_service import (
    clear_instagram_cache,
    get_recent_post_analytics,
)
from backend.app.services.posting_time_service import (
    recommend_posting_times,
)


def test_build_analytics_summary_handles_available_and_missing_metrics():
    sample_analytics = {
        "posts": [
            {
                "media_id": "post_1",
                "caption": "Behind the scenes in the studio! What do you think? #Music #Reel",
                "permalink": "https://instagram.com/p/1",
                "published_at": "2026-10-15T14:30:00+00:00",
                "media_type": "VIDEO",
                "insights": {
                    "views": 1200,
                    "reach": 1000,
                    "likes": 110,
                    "comments": 20,
                    "shares": 15,
                    "saved": 5,
                    "total_interactions": 150,
                },
                "insights_available": True,
            },
            {
                "media_id": "post_2",
                "caption": "New drop coming soon! #Music #NewDrop",
                "permalink": "https://instagram.com/p/2",
                "published_at": "2026-10-18T14:30:00+00:00",
                "media_type": "CAROUSEL_ALBUM",
                "insights": {
                    "views": None,
                    "reach": 500,
                    "likes": 40,
                    "comments": 5,
                    "shares": 2,
                    "saved": 3,
                    "total_interactions": 50,
                },
                "insights_available": True,
            },
        ]
    }

    result = build_analytics_summary(sample_analytics)

    summary = result["summary"]
    assert summary["posts_retrieved"] == 2
    assert summary["posts_with_insights"] == 2
    assert summary["total_views"] == 1200
    assert summary["total_reach_across_posts"] == 1500
    assert summary["total_interactions"] == 200
    assert summary["average_post_engagement_rate_percent"] == 12.5
    assert summary["overall_interactions_per_summed_reach_percent"] == 13.33

    hashtags = {item["hashtag"]: item["count"] for item in result["frequent_hashtags"]}
    assert hashtags["music"] == 2
    assert hashtags["reel"] == 1

    themes = {item["theme"]: item["post_count"] for item in result["caption_theme_counts"]}
    assert themes.get("Behind the scenes and process") == 1
    assert themes.get("Audience questions") == 1
    assert themes.get("Teasers, launches and releases") == 1


def test_recommend_posting_times_ranks_eligible_windows():
    posts = [
        {
            "published_at": "2026-10-15T13:00:00Z",  # Thursday 18:30 IST
            "insights": {"reach": 1000, "total_interactions": 180},
        },
        {
            "published_at": "2026-10-08T13:30:00Z",  # Thursday 19:00 IST
            "insights": {"reach": 1000, "total_interactions": 120},
        },
        {
            "published_at": "2026-10-12T03:00:00Z",  # Monday 08:30 IST
            "insights": {"reach": 1000, "total_interactions": 60},
        },
        {
            "published_at": "2026-10-05T03:30:00Z",  # Monday 09:00 IST
            "insights": {"reach": 1000, "total_interactions": 80},
        },
    ]

    result = recommend_posting_times(
        posts=posts,
        timezone_name="Asia/Kolkata",
        limit=3,
    )

    assert result["metric_used"] == "engagement_rate"
    assert result["eligible_slots_found"] == 2
    assert len(result["recommendations"]) == 2
    assert result["recommendations"][0]["weekday"] == "Thursday"
    assert result["recommendations"][0]["time_window"] == "Evening"
    assert result["recommendations"][0]["average_score"] == 15.0
    assert result["recommendations"][1]["weekday"] == "Monday"
    assert result["recommendations"][1]["time_window"] == "Morning"
    assert result["recommendations"][1]["average_score"] == 7.0


def test_recommend_posting_times_rejects_invalid_timezone():
    with pytest.raises(ValueError, match="Invalid timezone"):
        recommend_posting_times(posts=[], timezone_name="Invalid/Timezone")


def test_instagram_service_uses_ttl_cache(monkeypatch):
    from backend.app.services import instagram_service

    clear_instagram_cache()
    call_count = 0

    def fake_get(endpoint, params=None):
        nonlocal call_count
        call_count += 1
        if endpoint == "me/media":
            return {
                "data": [
                    {
                        "id": "m1",
                        "caption": "Test Reel #Instagram",
                        "media_type": "VIDEO",
                        "permalink": "https://instagram.com/p/m1",
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                    }
                ]
            }
        return {
            "data": [
                {"name": "views", "values": [{"value": 450}]},
                {"name": "reach", "values": [{"value": 300}]},
                {"name": "total_interactions", "values": [{"value": 45}]},
            ]
        }

    monkeypatch.setattr(instagram_service, "_get", fake_get)

    first = get_recent_post_analytics(limit=10)
    second = get_recent_post_analytics(limit=10)

    assert first["posts_retrieved"] == 1
    assert second["posts_retrieved"] == 1
    assert call_count == 2

    clear_instagram_cache()
