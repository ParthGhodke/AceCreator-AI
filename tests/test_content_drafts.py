import pytest
from fastapi.testclient import TestClient

from backend.app.database import SessionLocal
from backend.app.main import app
from backend.app.models.content_draft import ContentDraft
from backend.app.models.creator import Creator


@pytest.fixture
def client():
    """Create test tables before accessing the isolated test database."""
    with TestClient(app) as test_client:
        # Entering the TestClient context runs FastAPI's lifespan,
        # which initializes the database tables.
        db = SessionLocal()

        try:
            db.query(ContentDraft).delete()
            db.query(Creator).delete()
            db.commit()
        finally:
            db.close()

        creator_response = test_client.post(
            "/api/creators",
            json={
                "creatorName": "Test Creator",
                "creatorType": "Musician",
                "bio": "Test profile for automated API tests.",
                "instagram": "@testcreator",
                "goals": ["Grow followers"],
                "niche": "Music",
                "contentFormats": ["Reel"],
                "postingFrequency": "3-5 times per week",
                "targetAudience": "People interested in music",
            },
        )

        assert creator_response.status_code == 200, (
            creator_response.text
        )

        try:
            yield test_client
        finally:
            # Remove only data created in the dedicated test database.
            db = SessionLocal()

            try:
                db.query(ContentDraft).delete()
                db.query(Creator).delete()
                db.commit()
            finally:
                db.close()


def create_test_draft(client: TestClient) -> dict:
    """Create a draft through the public API."""
    response = client.post(
        "/api/content-drafts",
        json={
            "title": "Test Music Reel",
            "topic": "Behind the scenes music production",
            "hook": "Here is how I made this beat!",
            "caption": "A look into my music-making process.",
            "call_to_action": "Follow for more music.",
            "hashtags": ["music", "producer"],
            "content_format": "Reel",
            "platform": "Instagram",
            "visual_direction": "Show the music production setup.",
            "rationale": "Share the creative process.",
            "status": "draft",
        },
    )

    assert response.status_code == 201, response.text
    return response.json()


def test_create_content_draft(client: TestClient):
    draft = create_test_draft(client)

    assert draft["title"] == "Test Music Reel"
    assert draft["platform"] == "Instagram"
    assert draft["status"] == "draft"
    assert draft["id"]


def test_list_content_drafts(client: TestClient):
    create_test_draft(client)

    response = client.get("/api/content-drafts")

    assert response.status_code == 200
    drafts = response.json()
    assert len(drafts) == 1
    assert drafts[0]["title"] == "Test Music Reel"


def test_update_content_draft(client: TestClient):
    draft = create_test_draft(client)

    response = client.patch(
        f"/api/content-drafts/{draft['id']}",
        json={"title": "Updated Music Reel"},
    )

    assert response.status_code == 200
    assert response.json()["title"] == "Updated Music Reel"


def test_publication_timestamp_lifecycle(client: TestClient):
    draft = create_test_draft(client)
    draft_id = draft["id"]

    # Mark the draft as published.
    published_response = client.patch(
        f"/api/content-drafts/{draft_id}",
        json={"status": "published"},
    )

    assert published_response.status_code == 200
    assert published_response.json()["published_at"] is not None

    # Moving it back to scheduled should clear the publication timestamp.
    scheduled_response = client.patch(
        f"/api/content-drafts/{draft_id}",
        json={"status": "scheduled"},
    )

    assert scheduled_response.status_code == 200
    assert scheduled_response.json()["status"] == "scheduled"
    assert scheduled_response.json()["published_at"] is None


def test_delete_content_draft(client: TestClient):
    draft = create_test_draft(client)

    response = client.delete(
        f"/api/content-drafts/{draft['id']}"
    )

    assert response.status_code == 204

    missing_response = client.get(
        f"/api/content-drafts/{draft['id']}"
    )

    assert missing_response.status_code == 404


def test_invalid_platform_is_rejected(client: TestClient):
    for unsupported_platform in ("InvalidPlatform", "YouTube", "TikTok"):
        response = client.post(
            "/api/content-drafts",
            json={
                "title": "Invalid Platform Test",
                "topic": "Testing invalid platform validation",
                "hook": "This should be rejected.",
                "caption": "Test caption",
                "call_to_action": "Follow for more",
                "hashtags": [],
                "content_format": "Reel",
                "platform": unsupported_platform,
                "status": "draft",
            },
        )

        assert response.status_code == 422


def test_list_content_drafts_pagination(client: TestClient):
    create_test_draft(client)
    create_test_draft(client)

    first_page = client.get("/api/content-drafts?limit=1&offset=0")
    second_page = client.get("/api/content-drafts?limit=1&offset=1")

    assert first_page.status_code == 200
    assert second_page.status_code == 200
    assert len(first_page.json()) == 1
    assert len(second_page.json()) == 1

    # Each page should contain a different draft.
    assert first_page.json()[0]["id"] != second_page.json()[0]["id"]


def test_list_content_drafts_filter_by_platform(client: TestClient):
    create_test_draft(client)

    response = client.get("/api/content-drafts?platform=Instagram")

    assert response.status_code == 200
    assert all(
        draft["platform"] == "Instagram"
        for draft in response.json()
    )


def test_list_content_drafts_filter_by_status(client: TestClient):
    draft = create_test_draft(client)

    client.patch(
        f"/api/content-drafts/{draft['id']}",
        json={"status": "ready"},
    )

    response = client.get(
        "/api/content-drafts?status_filter=ready"
    )

    assert response.status_code == 200
    assert len(response.json()) == 1
    assert response.json()[0]["status"] == "ready"


def test_list_content_drafts_combined_filters(client: TestClient):
    draft = create_test_draft(client)

    client.patch(
        f"/api/content-drafts/{draft['id']}",
        json={"status": "ready"},
    )

    response = client.get(
        "/api/content-drafts"
        "?platform=Instagram&status_filter=ready"
    )

    assert response.status_code == 200
    assert len(response.json()) == 1
    assert response.json()[0]["platform"] == "Instagram"
    assert response.json()[0]["status"] == "ready"


def test_list_content_drafts_rejects_invalid_platform(
    client: TestClient,
):
    for unsupported in ("Facebook", "YouTube", "TikTok"):
        response = client.get(
            f"/api/content-drafts?platform={unsupported}"
        )
        assert response.status_code == 422


def test_list_content_drafts_rejects_invalid_status(
    client: TestClient,
):
    response = client.get(
        "/api/content-drafts?status_filter=invalid"
    )

    assert response.status_code == 422


def test_list_content_drafts_rejects_invalid_pagination(
    client: TestClient,
):
    invalid_limit = client.get("/api/content-drafts?limit=0")
    negative_offset = client.get("/api/content-drafts?offset=-1")
    excessive_limit = client.get("/api/content-drafts?limit=101")

    assert invalid_limit.status_code == 422
    assert negative_offset.status_code == 422
    assert excessive_limit.status_code == 422


def test_latest_creator_returns_chronologically_newest_profile(
    client: TestClient,
):
    """Verify that /api/creators/latest returns the newest profile regardless of random UUID order."""
    second_creator = client.post(
        "/api/creators",
        json={
            "creatorName": "Newest Instagram Creator",
            "creatorType": "Photographer",
            "bio": "Street and portrait photographer on Instagram.",
            "instagram": "@newestcreator",
            "goals": ["Increase Engagement"],
            "niche": "Street Photography",
            "contentFormats": ["Carousel", "Reel"],
            "postingFrequency": "Daily",
            "targetAudience": "Visual artists and photography lovers",
        },
    )
    assert second_creator.status_code == 200

    latest_response = client.get("/api/creators/latest")
    assert latest_response.status_code == 200
    assert latest_response.json()["creatorName"] == "Newest Instagram Creator"
