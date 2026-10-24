
from pprint import pprint

from backend.app.services.instagram_service import (
    get_recent_post_analytics,
)
from backend.app.services.analytics_summary_service import (
    build_analytics_summary,
)


if __name__ == "__main__":
    print("Fetching Instagram analytics...")

    analytics = get_recent_post_analytics(limit=10)
    summary = build_analytics_summary(analytics)

    print("\n=== ANALYTICS SUMMARY ===")
    pprint(summary["summary"])

    print("\n=== TOP POSTS BY VIEWS ===")
    for post in summary["top_posts_by_views"]:
        print(
            f"Views: {post['views']} | "
            f"Interactions: {post['total_interactions']} | "
            f"Engagement rate: {post['engagement_rate']}% | "
            f"Caption: {post['caption'][:90]}"
        )
        print("URL:", post["permalink"])
        print()

    print("=== FREQUENT HASHTAGS ===")
    pprint(summary["frequent_hashtags"])

    print("\n=== CAPTION THEMES ===")
    pprint(summary["caption_theme_counts"])

    print("\nAnalytics summary test completed.")