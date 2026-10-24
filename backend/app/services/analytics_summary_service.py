from collections import Counter
from typing import Any
import re


def _number(value: Any) -> int | None:
    """Return a numeric metric or None when it is unavailable."""
    if isinstance(value, bool):
        return None

    if isinstance(value, (int, float)):
        return int(value)

    return None


def _average(values: list[float]) -> float | None:
    if not values:
        return None

    return round(sum(values) / len(values), 2)


def _extract_hashtags(caption: str | None) -> list[str]:
    if not caption:
        return []

    return [
        tag.lower()
        for tag in re.findall(r"(?<!\w)#([a-zA-Z0-9_]+)", caption)
    ]


def build_analytics_summary(
    analytics: dict[str, Any],
) -> dict[str, Any]:
    """
    Summarize real Instagram post analytics.

    Missing metrics remain unavailable instead of being treated as zero.
    Content patterns are descriptive, not proof of causation.
    """
    posts = analytics.get("posts", [])

    if not isinstance(posts, list):
        posts = []

    analyzed_posts = []
    total_views = 0
    total_reach = 0
    total_interactions = 0

    available_views = 0
    available_reach = 0
    available_interactions = 0

    engagement_rates = []
    hashtag_counts = Counter()
    theme_counts = Counter()

    for post in posts:
        if not isinstance(post, dict):
            continue

        insights = post.get("insights") or {}
        if not isinstance(insights, dict):
            insights = {}

        views = _number(insights.get("views"))
        reach = _number(insights.get("reach"))
        likes = _number(insights.get("likes"))
        comments = _number(insights.get("comments"))
        shares = _number(insights.get("shares"))
        saves = _number(insights.get("saved"))
        interactions = _number(insights.get("total_interactions"))

        if views is not None:
            total_views += views
            available_views += 1

        if reach is not None:
            total_reach += reach
            available_reach += 1

        if interactions is not None:
            total_interactions += interactions
            available_interactions += 1

        rate = None
        if reach is not None and reach > 0 and interactions is not None:
            rate = round((interactions / reach) * 100, 2)
            engagement_rates.append(rate)

        caption = post.get("caption") or ""
        hashtags = _extract_hashtags(caption)

        hashtag_counts.update(hashtags)

        analyzed_posts.append(
            {
                "media_id": post.get("media_id"),
                "caption": caption,
                "permalink": post.get("permalink"),
                "published_at": post.get("published_at"),
                "media_type": post.get("media_type"),
                "views": views,
                "reach": reach,
                "likes": likes,
                "comments": comments,
                "shares": shares,
                "saves": saves,
                "total_interactions": interactions,
                "engagement_rate": rate,
                "hashtags": hashtags,
                "insights_available": bool(
                    post.get("insights_available", False)
                ),
            }
        )

    posts_with_views = [
        post
        for post in analyzed_posts
        if post["views"] is not None
    ]

    top_by_views = sorted(
        posts_with_views,
        key=lambda post: post["views"],
        reverse=True,
    )[:3]

    top_by_engagement = sorted(
        [
            post
            for post in analyzed_posts
            if post["engagement_rate"] is not None
        ],
        key=lambda post: post["engagement_rate"],
        reverse=True,
    )[:3]

    comment_rich_posts = sorted(
        [
            post
            for post in analyzed_posts
            if post["comments"] is not None
        ],
        key=lambda post: post["comments"],
        reverse=True,
    )[:3]

    for post in analyzed_posts:
        caption_lower = post["caption"].lower()

        # Transparent, multi-niche caption classifications for Instagram creators.
        if "?" in caption_lower or any(
            phrase in caption_lower
            for phrase in (
                "should i release",
                "drop your",
                "what do you think",
                "what u guys think",
                "comment your",
                "let me know",
                "which one",
                "fav bar",
            )
        ):
            theme_counts["Audience questions"] += 1

        if any(
            phrase in caption_lower
            for phrase in (
                "teaser",
                "coming soon",
                "mixtape",
                "release",
                "new music",
                "new drop",
                "out now",
                "new project",
                "preview",
            )
        ):
            theme_counts["Teasers, launches and releases"] += 1

        if any(
            phrase in caption_lower
            for phrase in (
                "behind the scenes",
                "bts",
                "studio session",
                "editing",
                "color grading",
                "how i shot",
                "how i made",
                "work in progress",
                "process",
            )
        ):
            theme_counts["Behind the scenes and process"] += 1

        if any(
            phrase in caption_lower
            for phrase in (
                "relatable",
                "relationships",
                "sadshayari",
                "feeling a bit low",
                "thoughts",
                "storytime",
                "personal",
                "late night",
            )
        ):
            theme_counts["Relatable and emotional content"] += 1

        if any(
            phrase in caption_lower
            for phrase in (
                "marathi",
                "hindi",
                "mumbai",
                "desi",
                "indian",
            )
        ):
            theme_counts["Regional identity"] += 1

    overall_rate = (
        round((total_interactions / total_reach) * 100, 2)
        if available_interactions > 0
        and available_reach > 0
        and total_reach > 0
        else None
    )

    return {
        "summary": {
            "posts_retrieved": len(analyzed_posts),
            "posts_with_insights": sum(
                post["insights_available"]
                for post in analyzed_posts
            ),
            "total_views": total_views if available_views else None,
            "total_reach_across_posts": (
                total_reach if available_reach else None
            ),
            "total_interactions": (
                total_interactions if available_interactions else None
            ),
            "overall_interactions_per_summed_reach_percent": overall_rate,
            "average_post_engagement_rate_percent": _average(
                engagement_rates
            ),
            "posts_with_view_data": available_views,
            "posts_with_reach_data": available_reach,
            "posts_with_interaction_data": available_interactions,
            "posts_with_engagement_rate": len(engagement_rates),
        },
        "top_posts_by_views": top_by_views,
        "top_posts_by_engagement_rate": top_by_engagement,
        "top_posts_by_comments": comment_rich_posts,
        "frequent_hashtags": [
            {"hashtag": tag, "count": count}
            for tag, count in hashtag_counts.most_common(10)
        ],
        "caption_theme_counts": [
            {"theme": theme, "post_count": count}
            for theme, count in theme_counts.most_common()
        ],
        "limitations": [
            "Post reach values can overlap and are not unique account-wide reach.",
            "Caption themes are heuristic classifications, not proof of causation.",
            "Post age can affect total views and interactions.",
            "Missing metrics are excluded from calculations rather than treated as zero.",
        ],
    }