
import os
import requests
from dotenv import load_dotenv

load_dotenv()

BASE_URL = "https://graph.instagram.com"


def main():
    access_token = os.getenv("INSTAGRAM_ACCESS_TOKEN")

    if not access_token:
        raise RuntimeError(
            "INSTAGRAM_ACCESS_TOKEN is missing from .env"
        )

    headers = {"Authorization": f"Bearer {access_token}"}

    # Retrieve one recent post.
    media_response = requests.get(
        f"{BASE_URL}/me/media",
        params={
            "fields": "id,caption,media_type,permalink",
            "limit": 1,
        },
        headers=headers,
        timeout=20,
    )

    if not media_response.ok:
        raise RuntimeError(
            f"Could not retrieve media: "
            f"{media_response.status_code} "
            f"{media_response.text}"
        )

    posts = media_response.json().get("data", [])

    if not posts:
        print("No Instagram posts were returned.")
        return

    post = posts[0]

    print("Testing insights for one Instagram post...")
    print("Media type:", post.get("media_type"))
    print("Post URL:", post.get("permalink"))

    # Request common metrics. Meta may support different
    # metrics depending on media type and granted permissions.
    metrics = [
        "views",
        "reach",
        "likes",
        "comments",
        "shares",
        "saved",
        "total_interactions",
    ]

    insights_response = requests.get(
        f"{BASE_URL}/{post['id']}/insights",
        params={"metric": ",".join(metrics)},
        headers=headers,
        timeout=20,
    )

    if not insights_response.ok:
        try:
            error = insights_response.json().get("error", {})
            print("\nInsights request was not successful.")
            print("HTTP status:", insights_response.status_code)
            print("Error code:", error.get("code", "Unknown"))
            print("Error type:", error.get("type", "Unknown"))
            print("Message:", error.get("message", "Unknown error"))
        except ValueError:
            print("HTTP status:", insights_response.status_code)
            print("Response:", insights_response.text)

        print(
            "\nThis may indicate a missing permission or an "
            "unsupported metric. We will diagnose it before "
            "changing the app configuration."
        )
        return

    results = insights_response.json().get("data", [])

    if not results:
        print("The API returned no insight metrics.")
        return

    print("\nInsights retrieved successfully!\n")

    for item in results:
        print(f"{item.get('name')}: {item.get('values', [])}")


if __name__ == "__main__":
    try:
        main()
    except requests.RequestException as error:
        print("Network error:", error)
    except RuntimeError as error:
        print(error)