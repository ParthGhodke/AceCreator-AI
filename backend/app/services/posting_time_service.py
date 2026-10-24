
from collections import defaultdict
from datetime import datetime, timezone
from typing import Any
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError


MIN_POSTS_PER_SLOT = 2

# Each window is [start_hour, end_hour).
TIME_WINDOWS = [
    ("Early morning", 0, 6),
    ("Morning", 6, 11),
    ("Afternoon", 11, 16),
    ("Evening", 16, 21),
    ("Night", 21, 24),
]

WEEKDAYS = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
]


def _parse_timestamp(value: Any) -> datetime | None:
    """Parse an ISO timestamp and normalize it to an aware datetime."""
    if not isinstance(value, str) or not value.strip():
        return None

    try:
        parsed = datetime.fromisoformat(
            value.strip().replace("Z", "+00:00")
        )
    except ValueError:
        return None

    # Instagram timestamps should include a timezone. If one is
    # missing, treat it as UTC rather than the server's local time.
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)

    return parsed


def _get_time_window(hour: int) -> str:
    for label, start_hour, end_hour in TIME_WINDOWS:
        if start_hour <= hour < end_hour:
            return label

    # Defensive fallback; valid datetime hours are always 0–23.
    return "Night"


def _get_interaction_count(
    insights: dict[str, Any],
) -> int | None:
    """Return total interactions, or derive a count if unavailable."""
    total = insights.get("total_interactions")

    if isinstance(total, (int, float)) and not isinstance(total, bool):
        if total >= 0:
            return int(total)

    component_metrics = ("likes", "comments", "shares", "saved")
    available_values = [
        insights[metric]
        for metric in component_metrics
        if isinstance(insights.get(metric), (int, float))
        and not isinstance(insights.get(metric), bool)
        and insights[metric] >= 0
    ]

    # Do not mistake missing metrics for zero interactions.
    if available_values and len(available_values) == len(component_metrics):
        return sum(int(value) for value in available_values)

    return None


def recommend_posting_times(
    posts: list[dict[str, Any]],
    timezone_name: str = "Asia/Kolkata",
    limit: int = 3,
) -> dict[str, Any]:
    """
    Recommend promising posting windows from historical post performance.

    This analyzes observed post performance. It does not measure
    when followers are online or prove that posting time caused
    a post's performance.
    """
    if not 1 <= limit <= 10:
        raise ValueError("Limit must be between 1 and 10.")

    try:
        creator_timezone = ZoneInfo(timezone_name)
    except (ZoneInfoNotFoundError, ValueError):
        raise ValueError(
            "Invalid timezone. Use an IANA timezone such as "
            "'Asia/Kolkata' or 'Europe/London'."
        ) from None

    parsed_posts: list[dict[str, Any]] = []
    invalid_timestamps = 0

    for post in posts:
        published_at = _parse_timestamp(post.get("published_at"))

        if published_at is None:
            invalid_timestamps += 1
            continue

        local_time = published_at.astimezone(creator_timezone)
        insights = post.get("insights")

        if not isinstance(insights, dict):
            insights = {}

        interactions = _get_interaction_count(insights)
        reach = insights.get("reach")

        engagement_rate = None
        if (
            interactions is not None
            and isinstance(reach, (int, float))
            and not isinstance(reach, bool)
            and reach > 0
        ):
            engagement_rate = interactions / reach

        parsed_posts.append(
            {
                "weekday": WEEKDAYS[local_time.weekday()],
                "time_window": _get_time_window(local_time.hour),
                "engagement_rate": engagement_rate,
                "interactions": interactions,
            }
        )

    # Use one consistent metric across the analysis. Never mix
    # engagement rates with raw interaction counts.
    rate_posts = [
        post for post in parsed_posts
        if post["engagement_rate"] is not None
    ]

    if rate_posts:
        metric_used = "engagement_rate"
        metric_label = "Engagement rate by reach"
        score_field = "engagement_rate"
        analyzed_posts = rate_posts
    else:
        count_posts = [
            post for post in parsed_posts
            if post["interactions"] is not None
        ]

        metric_used = "total_interactions"
        metric_label = "Average interactions per post"
        score_field = "interactions"
        analyzed_posts = count_posts

    grouped: dict[tuple[str, str], list[float]] = defaultdict(list)

    for post in analyzed_posts:
        key = (post["weekday"], post["time_window"])
        grouped[key].append(float(post[score_field]))

    eligible_slots = []

    for (weekday, time_window), scores in grouped.items():
        if len(scores) < MIN_POSTS_PER_SLOT:
            continue

        eligible_slots.append(
            {
                "weekday": weekday,
                "time_window": time_window,
                "average_score": sum(scores) / len(scores),
                "posts_analyzed": len(scores),
            }
        )

    eligible_slots.sort(
        key=lambda slot: slot["average_score"],
        reverse=True,
    )

    recommendations = []

    for rank, slot in enumerate(eligible_slots[:limit], start=1):
        average_score = slot["average_score"]

        if metric_used == "engagement_rate":
            formatted_score = round(average_score * 100, 2)
        else:
            formatted_score = round(average_score, 2)

        recommendations.append(
            {
                "rank": rank,
                "weekday": slot["weekday"],
                "time_window": slot["time_window"],
                "average_score": formatted_score,
                "metric": metric_used,
                "posts_analyzed": slot["posts_analyzed"],
            }
        )

    if recommendations:
        message = (
            "These time windows performed best among the eligible "
            "historical groups. Results are descriptive, not a guarantee "
            "of future performance."
        )
    else:
        message = (
            "There is not enough comparable historical data to recommend "
            "a specific weekday and time window yet. Aim to collect at "
            "least two posts in the same window, with usable performance "
            "metrics, before drawing comparisons."
        )

    return {
        "timezone": timezone_name,
        "metric_used": metric_used,
        "metric_label": metric_label,
        "minimum_posts_per_slot": MIN_POSTS_PER_SLOT,
        "posts_received": len(posts),
        "posts_with_valid_timestamps": len(parsed_posts),
        "posts_analyzed": len(analyzed_posts),
        "invalid_timestamps": invalid_timestamps,
        "eligible_slots_found": len(eligible_slots),
        "recommendations": recommendations,
        "message": message,
        "limitations": [
            "Historical performance does not establish causation.",
            "This analysis does not measure follower online activity.",
            "Only available metrics are used; missing values are not "
            "automatically treated as zero.",
            "Results may be affected by content type, topic, and audience "
            "differences between posts.",
        ],
    }
