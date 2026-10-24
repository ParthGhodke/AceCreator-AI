
from fastapi.testclient import TestClient

from backend.app.main import app


client = TestClient(app)


def test_root_endpoint():
    response = client.get("/")

    assert response.status_code == 200
    assert response.json()["message"] == "AceCreator AI API is running"


def test_api_health_endpoint():
    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_database_health_endpoint():
    response = client.get("/api/db-health")

    assert response.status_code == 200
    assert response.json()["database"] == "connected"
