
from pprint import pprint

from backend.app.services.instagram_service import (
    get_recent_post_analytics,
)
from backend.app.services.analytics_summary_service import (
    build_analytics_summary,
)
from backend.app.services.ai_performance_service import (
    generate_performance_analysis,
)


if __name__ == "__main__":
    print("Fetching recent Instagram analytics...")

    analytics = get_recent_post_analytics(limit=10)
    summary = build_analytics_summary(analytics)

    print("Generating AI performance analysis...")

    result = generate_performance_analysis(
        analytics_summary=summary,
        creator_context={
            "creator_type": "Musician",
            "niche": "Marathi and Hindi hip-hop",
            "goal": "Grow followers and increase engagement",
        },
    )

    print("\n=== AI PERFORMANCE ANALYSIS ===")
    pprint(result, sort_dicts=False)

    print("\nAI analysis test completed successfully.")