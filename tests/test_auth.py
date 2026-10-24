import pytest
from fastapi.testclient import TestClient

from backend.app.database import SessionLocal
from backend.app.main import app
from backend.app.models.content_draft import ContentDraft
from backend.app.models.creator import Creator
from backend.app.models.creator_strategy import CreatorStrategyRecord
from backend.app.models.manager_recommendation import ManagerRecommendation
from backend.app.models.user import RefreshSession, User
from backend.app.services.auth_service import clear_rate_limits


@pytest.fixture
def client():
    """Isolated test client that cleans users, sessions, creators, and drafts."""
    clear_rate_limits()
    with TestClient(app) as test_client:
        db = SessionLocal()
        try:
            db.query(ManagerRecommendation).delete()
            db.query(CreatorStrategyRecord).delete()
            db.query(ContentDraft).delete()
            db.query(Creator).delete()
            db.query(RefreshSession).delete()
            db.query(User).delete()
            db.commit()
        finally:
            db.close()

        try:
            yield test_client
        finally:
            clear_rate_limits()
            db = SessionLocal()
            try:
                db.query(ManagerRecommendation).delete()
                db.query(CreatorStrategyRecord).delete()
                db.query(ContentDraft).delete()
                db.query(Creator).delete()
                db.query(RefreshSession).delete()
                db.query(User).delete()
                db.commit()
            finally:
                db.close()


def register_test_user(
    client: TestClient,
    email: str = "creator@example.com",
    full_name: str = "Ace Creator",
    password: str = "SecurePass123",
) -> dict:
    response = client.post(
        "/api/auth/register",
        json={
            "email": email,
            "full_name": full_name,
            "password": password,
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


def test_register_and_get_me(client: TestClient):
    data = register_test_user(client)
    assert data["user"]["email"] == "creator@example.com"
    assert data["user"]["full_name"] == "Ace Creator"
    assert data["access_token"]

    me_response = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {data['access_token']}"},
    )
    assert me_response.status_code == 200
    assert me_response.json()["email"] == "creator@example.com"


def test_duplicate_email_registration_returns_409(client: TestClient):
    register_test_user(client, email="dup@example.com")

    duplicate = client.post(
        "/api/auth/register",
        json={
            "email": "DUP@example.com",
            "full_name": "Second User",
            "password": "SecurePass123",
        },
    )
    assert duplicate.status_code == 409


def test_weak_password_is_rejected(client: TestClient):
    response = client.post(
        "/api/auth/register",
        json={
            "email": "weak@example.com",
            "full_name": "Weak User",
            "password": "allletters",  # Missing number
        },
    )
    assert response.status_code == 422


def test_login_and_wrong_password_rejection(client: TestClient):
    register_test_user(client, email="login@example.com", password="Correct99")

    wrong = client.post(
        "/api/auth/login",
        json={"email": "login@example.com", "password": "WrongPassword1"},
    )
    assert wrong.status_code == 401

    valid = client.post(
        "/api/auth/login",
        json={"email": "login@example.com", "password": "Correct99"},
    )
    assert valid.status_code == 200
    assert valid.json()["access_token"]


def test_refresh_token_rotation_and_replay_detection(client: TestClient):
    register_Response = client.post(
        "/api/auth/register",
        json={
            "email": "rotate@example.com",
            "full_name": "Rotate User",
            "password": "SecurePass123",
        },
    )
    assert register_Response.status_code == 201
    initial_refresh_cookie = register_Response.cookies.get("acecreator_refresh")
    assert initial_refresh_cookie

    # First refresh succeeds and rotates the token
    client.cookies.set("acecreator_refresh", initial_refresh_cookie)
    refreshed = client.post("/api/auth/refresh")
    assert refreshed.status_code == 200
    new_refresh_cookie = refreshed.cookies.get("acecreator_refresh")
    assert new_refresh_cookie
    assert new_refresh_cookie != initial_refresh_cookie

    # Replaying the old refresh token must fail with 401
    client.cookies.set("acecreator_refresh", initial_refresh_cookie)
    replay_attempt = client.post("/api/auth/refresh")
    assert replay_attempt.status_code == 401


def test_logout_revokes_refresh_session(client: TestClient):
    reg = client.post(
        "/api/auth/register",
        json={
            "email": "logout@example.com",
            "full_name": "Logout User",
            "password": "SecurePass123",
        },
    )
    refresh_cookie = reg.cookies.get("acecreator_refresh")
    assert refresh_cookie

    client.cookies.set("acecreator_refresh", refresh_cookie)
    logout_res = client.post("/api/auth/logout")
    assert logout_res.status_code == 200

    # Refreshing with the logged-out token must fail
    client.cookies.set("acecreator_refresh", refresh_cookie)
    post_logout_refresh = client.post("/api/auth/refresh")
    assert post_logout_refresh.status_code == 401


def test_unauthenticated_me_returns_401(client: TestClient):
    client.cookies.clear()
    response = client.get("/api/auth/me")
    assert response.status_code == 401


def test_cross_user_creator_and_draft_isolation(client: TestClient):
    """Verify User B cannot read, modify, or delete User A's profile or drafts."""
    user_a = register_test_user(client, email="usera@example.com")
    token_a = user_a["access_token"]
    client.cookies.clear()

    user_b = register_test_user(client, email="userb@example.com")
    token_b = user_b["access_token"]
    client.cookies.clear()

    # User A creates a creator profile
    creator_a_res = client.post(
        "/api/creators",
        headers={"Authorization": f"Bearer {token_a}"},
        json={
            "creatorName": "User A Studio",
            "creatorType": "Musician",
            "bio": "User A makes electronic music on Instagram.",
            "instagram": "@usera",
            "goals": ["Grow Followers"],
            "niche": "Electronic Music",
            "contentFormats": ["Reel"],
            "postingFrequency": "Daily",
            "targetAudience": "Synth and electronic music fans",
        },
    )
    assert creator_a_res.status_code == 200
    creator_a_id = creator_a_res.json()["id"]

    # User A creates a content draft
    draft_a_res = client.post(
        "/api/content-drafts",
        headers={"Authorization": f"Bearer {token_a}"},
        json={
            "title": "User A Secret Reel",
            "topic": "Unreleased synth patch breakdown",
            "hook": "Listen to this analog bassline!",
            "caption": "Full breakdown in caption.",
            "call_to_action": "Save this post.",
            "hashtags": ["#synth", "#music"],
            "content_format": "Reel",
            "platform": "Instagram",
            "status": "draft",
        },
    )
    assert draft_a_res.status_code == 201
    draft_a_id = draft_a_res.json()["id"]

    # User B queries /api/creators/latest -> should 404 since User B has no profile
    latest_b = client.get(
        "/api/creators/latest",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert latest_b.status_code == 404

    # User B lists /api/content-drafts -> should be empty
    drafts_b = client.get(
        "/api/content-drafts",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert drafts_b.status_code == 200
    assert drafts_b.json() == []

    # User B attempts to read, patch, or delete User A's draft -> 403 Forbidden
    get_b = client.get(
        f"/api/content-drafts/{draft_a_id}",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert get_b.status_code == 403

    patch_b = client.patch(
        f"/api/content-drafts/{draft_a_id}",
        headers={"Authorization": f"Bearer {token_b}"},
        json={"title": "Hacked by User B"},
    )
    assert patch_b.status_code == 403

    delete_b = client.delete(
        f"/api/content-drafts/{draft_a_id}",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert delete_b.status_code == 403

    # User B attempts to access User A's strategy history -> 403 Forbidden
    strat_b = client.get(
        f"/api/creators/{creator_a_id}/strategies",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert strat_b.status_code == 403


def test_auth_rate_limiting_returns_429(client: TestClient):
    clear_rate_limits()
    for _ in range(12):
        res = client.post(
            "/api/auth/login",
            json={"email": "nobody@example.com", "password": "wrong"},
        )
        assert res.status_code == 401

    # 13th request within the window should trigger 429 Too Many Requests
    blocked = client.post(
        "/api/auth/login",
        json={"email": "nobody@example.com", "password": "wrong"},
    )
    assert blocked.status_code == 429
