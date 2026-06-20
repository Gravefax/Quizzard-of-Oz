from unittest.mock import MagicMock, patch
from uuid import uuid4

import pytest

with patch("sqlalchemy.create_engine"):
    with patch("app.database.Base.metadata.create_all"):
        from main import app

from fastapi.testclient import TestClient

client = TestClient(app)


@pytest.fixture
def override_db():
    """Override database dependency."""
    db = MagicMock()
    db.add = MagicMock()
    db.commit = MagicMock()
    db.refresh = MagicMock()
    
    def get_db_override():
        return db
    
    app.dependency_overrides[MagicMock] = get_db_override
    yield db
    app.dependency_overrides.clear()


def test_create_user_success(override_db):
    """Create new user successfully."""
    from app.database import get_db

    user_id = str(uuid4())
    
    # Mock CRUD functions
    with patch("app.routers.user.user_service.get_user_by_username") as mock_get_existing:
        with patch("app.routers.user.user_service.create_user") as mock_create:
            mock_get_existing.return_value = None
            new_user = MagicMock()
            new_user.id = user_id
            new_user.username = "newuser"
            new_user.email = "new@example.com"
            mock_create.return_value = new_user
            
            app.dependency_overrides[get_db] = lambda: override_db
            
            response = client.post(
                "/users/",
                json={"username": "newuser", "email": "new@example.com"},
            )
            
            assert response.status_code == 201
            assert response.json()["username"] == "newuser"
            mock_create.assert_called_once()


def test_create_user_duplicate_username(override_db):
    """Reject user creation with duplicate username."""
    from app.database import get_db
    
    app.dependency_overrides[get_db] = lambda: override_db
    
    with patch("app.routers.user.user_service.get_user_by_username") as mock_get_existing:
        existing = MagicMock()
        existing.username = "taken"
        mock_get_existing.return_value = existing  # User exists
        
        response = client.post(
            "/users/",
            json={"username": "taken", "email": "user@example.com"},
        )
        
        assert response.status_code == 400
        assert "already taken" in response.json()["detail"].lower()


def test_get_user_success(override_db):
    """Retrieve existing user by ID."""
    from app.database import get_db
    
    user_id = str(uuid4())
    app.dependency_overrides[get_db] = lambda: override_db
    
    with patch("app.routers.user.user_service.get_user") as mock_get:
        user = MagicMock()
        user.id = user_id
        user.username = "testuser"
        user.email = "test@example.com"
        mock_get.return_value = user
        
        response = client.get(f"/users/{user_id}")
        
        assert response.status_code == 200
        assert response.json()["username"] == "testuser"
        mock_get.assert_called_once()


def test_get_user_not_found(override_db):
    """Return 404 when user not found."""
    from app.database import get_db
    
    user_id = str(uuid4())
    app.dependency_overrides[get_db] = lambda: override_db
    
    with patch("app.routers.user.user_service.get_user") as mock_get:
        mock_get.return_value = None
        
        response = client.get(f"/users/{user_id}")
        
        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()
