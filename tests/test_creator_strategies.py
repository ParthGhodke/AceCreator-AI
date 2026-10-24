
from datetime import datetime, timedelta, timezone
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from backend.app.database import SessionLocal
from backend.app.main import app
from backend.app.models.content_draft import ContentDraft
from backend.app.models.creator import Creator
from backend.app.models.creator_strategy import CreatorStrategyRecord


@pytest.fixture
def client():
    """Use the isolated test database and clean up test data."""
    with TestClient(app) as test_client:
        db = SessionLocal()

        try:
            db.query(CreatorStrategyRecord).delete()
            db.query(ContentDraft).delete()
            db.query(Creator).delete()
            db.commit()
        finally:
            db.close()

        creator_response = test_client.post(
            "/api/creators",
            json={
                "creatorName": "Strategy Test Creator",
                "creatorType": "Musician",
                "bio": "Test profile for strategy API tests.",
                "instagram": "",
                "youtube": "",
                "tiktok": "",
                "otherPlatform": "",
                "goals": ["Grow followers"],
                "niche": "Music",
                "contentFormats": ["Reels"],
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
            db = SessionLocal()

            try:
                db.query(CreatorStrategyRecord).delete()
                db.query(ContentDraft).delete()
                db.query(Creator).delete()
                db.commit()
            finally:
                db.close()


def get_creator_id(client: TestClient) -> str:
    """Retrieve the test creator's ID through the public API."""
    response = client.get("/api/creators/latest")

    assert response.status_code == 200, response.text
    return response.json()["id"]


def create_strategy_record(
    creator_id: str,
    title: str,
    created_at: datetime,
) -> str:
    """Insert a saved strategy without making an external AI call."""
    db = SessionLocal()

    try:
        strategy = CreatorStrategyRecord(
            creator_id=creator_id,
            strategy_title=title,
            overview=f"Overview for {title}.",
            primary_goal="Grow followers",
            target_audience="Music enthusiasts",
            content_pillars=[
                {
                    "name": "Behind the Scenes",
                    "percentage": 50,
                    "description": "Show the creative process.",
                    "example_ideas": ["Show a studio session"],
                }
            ],
            weekly_actions=[
                {
                    "day": "Monday",
                    "action": "Publish a music Reel.",
                    "content_format": "Reel",
                }
            ],
            growth_recommendations=[
                "Use relevant music hashtags."
            ],
            success_metrics=[
                "Engagement rate",
                "Follower growth",
            ],
            created_at=created_at,
            updated_at=created_at,
        )

        db.add(strategy)
        db.commit()
        db.refresh(strategy)

        return str(strategy.id)
    finally:
        db.close()


def seed_two_strategies(client: TestClient) -> tuple[str, str, str]:
    """Create two saved versions, with the second being newer."""
    creator_id = get_creator_id(client)
    now = datetime.now(timezone.utc)

    older_id = create_strategy_record(
        creator_id,
        "Original Music Strategy",
        now - timedelta(days=2),
    )
    newer_id = create_strategy_record(
        creator_id,
        "Updated Music Strategy",
        now,
    )

    return creator_id, older_id, newer_id


def test_strategy_history_returns_saved_versions_newest_first(
    client: TestClient,
):
    creator_id, older_id, newer_id = seed_two_strategies(client)

    response = client.get(
        f"/api/creators/{creator_id}/strategies"
    )

    assert response.status_code == 200, response.text

    strategies = response.json()

    assert len(strategies) == 2
    assert strategies[0]["id"] == newer_id
    assert strategies[1]["id"] == older_id
    assert strategies[0]["strategy_title"] == "Updated Music Strategy"


def test_strategy_history_pagination(client: TestClient):
    creator_id, older_id, newer_id = seed_two_strategies(client)

    first_page = client.get(
        f"/api/creators/{creator_id}/strategies?limit=1&offset=0"
    )
    second_page = client.get(
        f"/api/creators/{creator_id}/strategies?limit=1&offset=1"
    )

    assert first_page.status_code == 200
    assert second_page.status_code == 200

    assert len(first_page.json()) == 1
    assert len(second_page.json()) == 1

    assert first_page.json()[0]["id"] == newer_id
    assert second_page.json()[0]["id"] == older_id


def test_strategy_history_rejects_invalid_pagination(
    client: TestClient,
):
    creator_id = get_creator_id(client)

    invalid_limit = client.get(
        f"/api/creators/{creator_id}/strategies?limit=0"
    )
    excessive_limit = client.get(
        f"/api/creators/{creator_id}/strategies?limit=101"
    )
    negative_offset = client.get(
        f"/api/creators/{creator_id}/strategies?offset=-1"
    )

    assert invalid_limit.status_code == 422
    assert excessive_limit.status_code == 422
    assert negative_offset.status_code == 422


def test_get_specific_strategy_version(client: TestClient):
    creator_id, older_id, newer_id = seed_two_strategies(client)

    response = client.get(
        f"/api/creators/{creator_id}/strategies/{older_id}"
    )

    assert response.status_code == 200, response.text

    strategy = response.json()

    assert strategy["id"] == older_id
    assert strategy["strategy_title"] == "Original Music Strategy"
    assert strategy["overview"] == "Overview for Original Music Strategy."
    assert strategy["primary_goal"] == "Grow followers"
    assert len(strategy["content_pillars"]) == 1
    assert len(strategy["weekly_actions"]) == 1
    assert len(strategy["growth_recommendations"]) == 1
    assert len(strategy["success_metrics"]) == 2


def test_missing_strategy_version_returns_404(client: TestClient):
    creator_id = get_creator_id(client)
    missing_strategy_id = str(uuid4())

    response = client.get(
        f"/api/creators/{creator_id}/strategies/{missing_strategy_id}"
    )

    assert response.status_code == 404


def test_unknown_creator_returns_404(client: TestClient):
    unknown_creator_id = str(uuid4())

    history_response = client.get(
        f"/api/creators/{unknown_creator_id}/strategies"
    )
    version_response = client.get(
        f"/api/creators/{unknown_creator_id}/strategies/{uuid4()}"
    )

    assert history_response.status_code == 404
    assert version_response.status_code == 404
