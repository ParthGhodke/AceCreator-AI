
import os
import requests
from dotenv import load_dotenv

load_dotenv()

API_URL = "https://graph.instagram.com/me/media"


def get_instagram_posts():
    access_token = os.getenv("INSTAGRAM_ACCESS_TOKEN")

    if not access_token:
        raise RuntimeError(
            "INSTAGRAM_ACCESS_TOKEN is missing from .env"
        )

    response = requests.get(
        API_URL,
        params={
            "fields": (
                "id,caption,media_type,media_url,"
                "permalink,timestamp"
            ),
            "limit": 10,
            "access_token": access_token,
        },
        timeout=20,
    )

    if not response.ok:
        try:
            error = response.json().get("error", {})
            message = error.get("message", "Unknown API error")
            code = error.get("code", "Unknown")
        except ValueError:
            message = "Unexpected API response"
            code = "Unknown"

        raise RuntimeError(
            f"HTTP {response.status_code}; "
            f"error code: {code}; message: {message}"
        )

    return response.json()


if __name__ == "__main__":
    print("Fetching your latest Instagram posts...")

    try:
        result = get_instagram_posts()
        posts = result.get("data", [])

        print(f"\nSuccessfully retrieved {len(posts)} posts.\n")

        for index, post in enumerate(posts, start=1):
            print(f"Post {index}")
            print("Media ID:", post.get("id", "N/A"))
            print("Type:", post.get("media_type", "N/A"))
            print("Caption:", post.get("caption", "No caption")[:150])
            print("Published:", post.get("timestamp", "N/A"))
            print("Permalink:", post.get("permalink", "N/A"))
            print("-" * 40)

    except Exception as error:
        print("Instagram post retrieval failed.")
        print(f"{type(error).__name__}: {error}")