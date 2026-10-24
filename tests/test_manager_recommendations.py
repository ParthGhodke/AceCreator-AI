
import uuid

import pytest
from fastapi.testclient import TestClient

from backend.app.database import SessionLocal
from backend.app.main import app
from backend.app.models.creator import Creator
from backend.app.models.content_draft import ContentDraft
from backend.app.models.creator_strategy import CreatorStrategyRecord
from backend.app.models.manager_recommendation import ManagerRecommendation


@pytest.fixture
def client():
    """Create an isolated API client and clean up test records."""
    with TestClient(app) as test_client:
        db = SessionLocal()

        try:
            db.query(ManagerRecommendation).delete()
            db.query(CreatorStrategyRecord).delete()
            db.query(ContentDraft).delete()
            db.query(Creator).delete()
            db.commit()
        finally:
            db.close()

        try:
            yield test_client
        finally:
            db = SessionLocal()
            try:
                db.query(ManagerRecommendation).delete()
                db.query(CreatorStrategyRecord).delete()
                db.query(ContentDraft).delete()
                db.query(Creator).delete()
                db.commit()
            finally:
                db.close()


@pytest.fixture
def manager_creator(client):
    """Create a creator using the public API."""
    response = client.post(
        "/api/creators",
        json={
            "creatorName": "Manager Test Creator",
            "creatorType": "Musician",
            "bio": "Test profile for AI Manager recommendations.",
            "instagram": "",
            "youtube": "",
            "tiktok": "",
            "otherPlatform": "",
            "goals": ["Grow followers", "Increase engagement"],
            "niche": "Music",
            "contentFormats": ["Reels"],
            "postingFrequency": "3-5 times per week",
            "targetAudience": "Music fans",
        },
    )

    assert response.status_code == 200, response.text
    return response.json()


def create_recommendation(
    creator_id,
    title,
    status="new",
    priority="medium",
):
    """Insert a recommendation directly without calling Groq."""
    db = SessionLocal()

    try:
        recommendation = ManagerRecommendation(
            creator_id=uuid.UUID(str(creator_id)),
            title=title,
            description="Create a short music Reel for the target audience.",
            reasoning="This recommendation is based on the creator profile.",
            evidence=["Creator profile indicates a music niche."],
            priority=priority,
            category="content",
            status=status,
        )
        db.add(recommendation)
        db.commit()
        db.refresh(recommendation)

        return str(recommendation.id)
    finally:
        db.close()


def test_list_recommendations(client, manager_creator):
    creator_id = manager_creator["id"]
    create_recommendation(
        creator_id,
        "Create a behind-the-scenes Reel",
    )

    response = client.get(
        f"/api/creators/{creator_id}/manager/recommendations"
    )

    assert response.status_code == 200, response.text
    data = response.json()
    assert data["total"] == 1
    assert len(data["items"]) == 1
    assert data["items"][0]["title"] == "Create a behind-the-scenes Reel"


def test_filter_recommendations_by_status(client, manager_creator):
    creator_id = manager_creator["id"]

    create_recommendation(
        creator_id,
        "Create a music Reel",
        status="new",
    )
    create_recommendation(
        creator_id,
        "Review previous captions",
        status="completed",
    )

    response = client.get(
        f"/api/creators/{creator_id}/manager/recommendations",
        params={"status_filter": "completed"},
    )

    assert response.status_code == 200, response.text
    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["status"] == "completed"


def test_recommendation_pagination(client, manager_creator):
    creator_id = manager_creator["id"]

    create_recommendation(creator_id, "Create a music Reel")
    create_recommendation(creator_id, "Plan a weekly content series")
    create_recommendation(creator_id, "Improve audience engagement")

    response = client.get(
        f"/api/creators/{creator_id}/manager/recommendations",
        params={"limit": 2, "offset": 0},
    )

    assert response.status_code == 200, response.text
    data = response.json()
    assert data["total"] == 3
    assert len(data["items"]) == 2
    assert data["limit"] == 2
    assert data["offset"] == 0


def test_get_recommendation_by_id(client, manager_creator):
    creator_id = manager_creator["id"]
    recommendation_id = create_recommendation(
        creator_id,
        "Prepare a weekly posting plan",
    )

    response = client.get(
        f"/api/creators/{creator_id}/manager/recommendations/"
        f"{recommendation_id}"
    )

    assert response.status_code == 200, response.text
    assert response.json()["id"] == recommendation_id
    assert response.json()["status"] == "new"


def test_update_recommendation_status(client, manager_creator):
    creator_id = manager_creator["id"]
    recommendation_id = create_recommendation(
        creator_id,
        "Reply to comments consistently",
    )

    response = client.patch(
        f"/api/creators/{creator_id}/manager/recommendations/"
        f"{recommendation_id}",
        json={"status": "in_progress"},
    )

    assert response.status_code == 200, response.text
    assert response.json()["status"] == "in_progress"

    verify_response = client.get(
        f"/api/creators/{creator_id}/manager/recommendations/"
        f"{recommendation_id}"
    )

    assert verify_response.status_code == 200
    assert verify_response.json()["status"] == "in_progress"


def test_missing_recommendation_returns_404(client, manager_creator):
    creator_id = manager_creator["id"]
    missing_id = uuid.uuid4()

    response = client.get(
        f"/api/creators/{creator_id}/manager/recommendations/{missing_id}"
    )

    assert response.status_code == 404


def test_unknown_creator_returns_404(client):
    unknown_creator_id = uuid.uuid4()

    response = client.get(
        f"/api/creators/{unknown_creator_id}/manager/recommendations"
    )

    assert response.status_code == 404


def test_generate_recommendations_without_real_groq(
    client,
    manager_creator,
    monkeypatch,
):
    """Test generation while replacing the AI service with a mock."""
    from backend.app import main

    def mock_generate(db, creator, analytics_summary=None):
        recommendations = [
            ManagerRecommendation(
                creator_id=creator.id,
                title="Create a behind-the-scenes Reel",
                description="Show how you create a music track.",
                reasoning="A practical content idea tailored to the music niche.",
                evidence=["Creator profile identifies music as the niche."],
                priority="high",
                category="content",
                status="new",
            ),
            ManagerRecommendation(
                creator_id=creator.id,
                title="Plan a weekly music series",
                description="Publish a recurring series of music-related Reels.",
                reasoning="A recurring format can help establish consistency.",
                evidence=["The creator profile lists Reels as a content format."],
                priority="medium",
                category="consistency",
                status="new",
            ),
            ManagerRecommendation(
                creator_id=creator.id,
                title="Review audience engagement",
                description="Review available engagement data before choosing topics.",
                reasoning="Use actual performance data to guide future decisions.",
                evidence=[],
                priority="medium",
                category="analytics",
                status="new",
            ),
        ]

        db.add_all(recommendations)
        db.commit()

        for recommendation in recommendations:
            db.refresh(recommendation)

        return recommendations

    monkeypatch.setattr(
        main,
        "generate_and_save_recommendations",
        mock_generate,
    )

    response = client.post(
        f"/api/creators/{manager_creator['id']}"
        "/manager/recommendations/generate"
    )

    assert response.status_code == 201, response.text

    data = response.json()
    assert len(data) == 3
    assert all(item["status"] == "new" for item in data)
    assert all(item["id"] for item in data)


def test_generate_recommendations_for_unknown_creator(client):
    """Unknown creator IDs should return 404."""
    unknown_creator_id = uuid.uuid4()

    response = client.post(
        f"/api/creators/{unknown_creator_id}"
        "/manager/recommendations/generate"
    )

    assert response.status_code == 404


def test_generation_service_failure_returns_502(
    client,
    manager_creator,
    monkeypatch,
):
    """AI service failures should become a controlled API error."""
    from backend.app import main

    def mock_generate_failure(db, creator, analytics_summary=None):
        raise RuntimeError("Mock recommendation generation failure")

    monkeypatch.setattr(
        main,
        "generate_and_save_recommendations",
        mock_generate_failure,
    )

    response = client.post(
        f"/api/creators/{manager_creator['id']}"
        "/manager/recommendations/generate"
    )

    assert response.status_code == 502

    
def test_generate_draft_from_recommendation(
    client,
    manager_creator,
    monkeypatch,
):
    """A recommendation should generate and persist a content draft."""
    from backend.app import main

    creator_id = manager_creator["id"]
    recommendation_id = create_recommendation(
        creator_id,
        "Create a behind-the-scenes music Reel",
    )

    def mock_generate_content_package(
        *,
        topic,
        content_format,
        platform,
        creator_context,
    ):
        assert topic == "Behind the scenes of making a song"
        assert content_format == "Reel"
        assert platform == "Instagram"
        assert "Create a behind-the-scenes music Reel" in creator_context["bio"]

        return {
            "title": "Behind the Music",
            "hook": "Ever wondered how a song comes together?",
            "caption": "Take a look behind the scenes of my music-making process.",
            "call_to_action": "Follow for more music content.",
            "hashtags": ["#Music", "#BehindTheScenes", "#MusicCreator"],
            "visual_direction": "Show short clips from the music production process.",
            "rationale": "A behind-the-scenes Reel gives viewers a personal look at the creative process.",
        }

    monkeypatch.setattr(
        main,
        "generate_content_package",
        mock_generate_content_package,
    )

    response = client.post(
        f"/api/creators/{creator_id}/manager/recommendations/"
        f"{recommendation_id}/generate-draft",
        json={
            "topic": "Behind the scenes of making a song",
            "content_format": "Reel",
            "platform": "Instagram",
        },
    )

    assert response.status_code == 201, response.text

    data = response.json()
    assert data["creator_id"] == creator_id
    assert data["title"] == "Behind the Music"
    assert data["topic"] == "Behind the scenes of making a song"
    assert data["status"] == "draft"
    assert data["platform"] == "Instagram"
    assert data["content_format"] == "Reel"
    assert data["id"]

    # Verify that the draft was persisted and the recommendation is unchanged.
    draft_response = client.get("/api/content-drafts")
    assert draft_response.status_code == 200, draft_response.text
    assert any(
    draft["id"] == data["id"]
    for draft in draft_response.json()
    )

    recommendation_response = client.get(
        f"/api/creators/{creator_id}/manager/recommendations/"
        f"{recommendation_id}"
    )
    assert recommendation_response.status_code == 200
    assert recommendation_response.json()["status"] == "new"


def test_generate_draft_for_missing_recommendation_returns_404(
    client,
    manager_creator,
    monkeypatch,
):
    """A missing recommendation must not trigger AI generation."""
    from backend.app import main

    monkeypatch.setattr(
        main,
        "generate_content_package",
        lambda **kwargs: (_ for _ in ()).throw(
            AssertionError("AI generation should not be called")
        ),
    )

    response = client.post(
        f"/api/creators/{manager_creator['id']}/manager/recommendations/"
        f"{uuid.uuid4()}/generate-draft",
        json={
            "topic": "Behind the scenes of making a song",
            "content_format": "Reel",
            "platform": "Instagram",
        },
    )

    assert response.status_code == 404


def test_generate_draft_rejects_invalid_content_format(
    client,
    manager_creator,
):
    """Unsupported content formats should fail schema validation."""
    response = client.post(
        f"/api/creators/{manager_creator['id']}/manager/recommendations/"
        f"{uuid.uuid4()}/generate-draft",
        json={
            "topic": "Behind the scenes of making a song",
            "content_format": "Podcast",
            "platform": "Instagram",
        },
    )

    assert response.status_code == 422


def test_generate_draft_ai_failure_returns_502(
    client,
    manager_creator,
    monkeypatch,
):
    """AI service errors should return a controlled 502 response."""
    from backend.app import main

    creator_id = manager_creator["id"]
    recommendation_id = create_recommendation(
        creator_id,
        "Create a behind-the-scenes music Reel",
    )

    def mock_generate_failure(**kwargs):
        raise RuntimeError("Simulated Groq failure")

    monkeypatch.setattr(
        main,
        "generate_content_package",
        mock_generate_failure,
    )

    response = client.post(
        f"/api/creators/{creator_id}/manager/recommendations/"
        f"{recommendation_id}/generate-draft",
        json={
            "topic": "Behind the scenes of making a song",
            "content_format": "Reel",
            "platform": "Instagram",
        },
    )

    assert response.status_code == 502

    drafts_response = client.get("/api/content-drafts")
    assert drafts_response.status_code == 200, drafts_response.text
    assert all(
    draft["title"] != "Behind the Music"
    for draft in drafts_response.json()
    )
