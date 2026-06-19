from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest

with patch("sqlalchemy.create_engine"):
    with patch("app.database.Base.metadata.create_all"):
        from main import app as _app  # noqa: F401

from app.services.ws_auth import (
    _CLOSE_EXPIRED,
    _CLOSE_UNAUTHORIZED,
    SESSION_COOKIE_NAME,
    _client_label,
    authenticate_ws,
)


def _make_websocket(*, cookies=None, client_host="127.0.0.1", client_port=54321, path="/ws"):
    """Create mock WebSocket."""
    ws = AsyncMock()
    ws.cookies = cookies or {}
    ws.client = MagicMock()
    ws.client.host = client_host
    ws.client.port = client_port
    ws.url = MagicMock()
    ws.url.path = path
    return ws


def _make_user(user_id=None, username="TestUser"):
    """Create mock user."""
    user = MagicMock()
    user.id = user_id or uuid4()
    user.username = username
    return user


def _make_session(user_id, expires_at=None):
    """Create mock session."""
    session = MagicMock()
    session.id = uuid4()
    session.user_id = user_id
    session.expires_at = expires_at or datetime.now(timezone.utc) + timedelta(hours=1)
    return session


class TestClientLabel:
    """Tests for _client_label helper."""
    
    def test_client_label_with_host_port(self):
        """Format client as IP:port."""
        ws = _make_websocket(client_host="192.168.1.100", client_port=12345)
        label = _client_label(ws)
        assert label == "192.168.1.100:12345"
    
    def test_client_label_none_client(self):
        """Return 'unknown' when client is None."""
        ws = AsyncMock()
        ws.client = None
        label = _client_label(ws)
        assert label == "unknown"
    
    def test_client_label_localhost(self):
        """Handle localhost client."""
        ws = _make_websocket(client_host="localhost", client_port=55555)
        label = _client_label(ws)
        assert label == "localhost:55555"


class TestAuthenticateWs:
    """Tests for WebSocket authentication."""
    
    @pytest.mark.asyncio
    async def test_auth_success(self):
        """Successful authentication returns user."""
        user_id = uuid4()
        session_id = str(uuid4())
        
        ws = _make_websocket(cookies={SESSION_COOKIE_NAME: session_id})
        db = MagicMock()
        
        session = _make_session(user_id)
        user = _make_user(user_id=user_id)
        
        with patch("app.services.ws_auth.crud_session.get_session") as mock_get_session:
            with patch("app.services.ws_auth.crud_user.get_user") as mock_get_user:
                mock_get_session.return_value = session
                mock_get_user.return_value = user
                
                result = await authenticate_ws(ws, db)
                
                assert result == user
                ws.close.assert_not_called()  # Should not close on success
    
    @pytest.mark.asyncio
    async def test_auth_missing_cookie(self):
        """Missing session cookie closes with 4001."""
        ws = _make_websocket(cookies={})  # No session cookie
        db = MagicMock()
        
        result = await authenticate_ws(ws, db)
        
        assert result is None
        ws.close.assert_called_once_with(code=_CLOSE_UNAUTHORIZED, reason="Missing session")
    
    @pytest.mark.asyncio
    async def test_auth_invalid_session_id_format(self):
        """Invalid session ID format closes with 4001."""
        ws = _make_websocket(cookies={SESSION_COOKIE_NAME: "not-a-uuid"})
        db = MagicMock()
        
        result = await authenticate_ws(ws, db)
        
        assert result is None
        ws.close.assert_called_once_with(code=_CLOSE_UNAUTHORIZED, reason="Invalid session ID")
    
    @pytest.mark.asyncio
    async def test_auth_session_not_found(self):
        """Session ID not in database closes with 4001."""
        session_id = str(uuid4())
        ws = _make_websocket(cookies={SESSION_COOKIE_NAME: session_id})
        db = MagicMock()
        
        with patch("app.services.ws_auth.crud_session.get_session") as mock_get_session:
            mock_get_session.return_value = None
            
            result = await authenticate_ws(ws, db)
            
            assert result is None
            ws.close.assert_called_once_with(code=_CLOSE_UNAUTHORIZED, reason="Session not found")
    
    @pytest.mark.asyncio
    async def test_auth_session_expired(self):
        """Expired session closes with 4003."""
        user_id = uuid4()
        session_id = str(uuid4())
        
        # Session expired 1 hour ago
        expires_at = datetime.now(timezone.utc) - timedelta(hours=1)
        
        ws = _make_websocket(cookies={SESSION_COOKIE_NAME: session_id})
        db = MagicMock()
        
        session = _make_session(user_id, expires_at=expires_at)
        
        with patch("app.services.ws_auth.crud_session.get_session") as mock_get_session:
            mock_get_session.return_value = session
            
            result = await authenticate_ws(ws, db)
            
            assert result is None
            ws.close.assert_called_once_with(code=_CLOSE_EXPIRED, reason="Session expired")
    
    @pytest.mark.asyncio
    async def test_auth_session_expired_naive_datetime(self):
        """Handle naive datetime (no timezone) for expiry."""
        user_id = uuid4()
        session_id = str(uuid4())
        
        # Naive datetime (no timezone info)
        expires_at = datetime.now() + timedelta(hours=1)
        
        ws = _make_websocket(cookies={SESSION_COOKIE_NAME: session_id})
        db = MagicMock()
        
        session = _make_session(user_id, expires_at=expires_at)
        assert session.expires_at.tzinfo is None  # Verify it's naive
        
        user = _make_user(user_id=user_id)
        
        with patch("app.services.ws_auth.crud_session.get_session") as mock_get_session:
            with patch("app.services.ws_auth.crud_user.get_user") as mock_get_user:
                mock_get_session.return_value = session
                mock_get_user.return_value = user
                
                result = await authenticate_ws(ws, db)
                
                # Should handle naive datetime and succeed
                assert result == user
    
    @pytest.mark.asyncio
    async def test_auth_user_not_found(self):
        """User record deleted closes with 4001."""
        user_id = uuid4()
        session_id = str(uuid4())
        
        ws = _make_websocket(cookies={SESSION_COOKIE_NAME: session_id})
        db = MagicMock()
        
        session = _make_session(user_id)
        
        with patch("app.services.ws_auth.crud_session.get_session") as mock_get_session:
            with patch("app.services.ws_auth.crud_user.get_user") as mock_get_user:
                mock_get_session.return_value = session
                mock_get_user.return_value = None  # User deleted
                
                result = await authenticate_ws(ws, db)
                
                assert result is None
                ws.close.assert_called_once_with(code=_CLOSE_UNAUTHORIZED, reason="User not found")
    
    @pytest.mark.asyncio
    async def test_auth_logging_on_success(self):
        """Success logs with user details."""
        user_id = uuid4()
        session_id = str(uuid4())
        
        ws = _make_websocket(cookies={SESSION_COOKIE_NAME: session_id})
        db = MagicMock()
        
        session = _make_session(user_id)
        user = _make_user(user_id=user_id, username="TestUser")
        
        with patch("app.services.ws_auth.crud_session.get_session") as mock_get_session:
            with patch("app.services.ws_auth.crud_user.get_user") as mock_get_user:
                with patch("app.services.ws_auth.logger") as mock_logger:
                    mock_get_session.return_value = session
                    mock_get_user.return_value = user
                    
                    result = await authenticate_ws(ws, db)
                    
                    assert result == user
                    # Check that success was logged
                    assert any("WS auth success" in str(call) for call in mock_logger.info.call_args_list)
    
    @pytest.mark.asyncio
    async def test_auth_logging_on_missing_cookie(self):
        """Missing cookie logs warning."""
        ws = _make_websocket(cookies={})
        db = MagicMock()
        
        with patch("app.services.ws_auth.logger") as mock_logger:
            result = await authenticate_ws(ws, db)
            
            assert result is None
            # Check that warning was logged
            assert any("missing session" in str(call).lower() for call in mock_logger.warning.call_args_list)
    
    @pytest.mark.asyncio
    async def test_auth_with_empty_cookies(self):
        """Empty cookie name returns None."""
        ws = AsyncMock()
        ws.cookies = {}
        ws.client = MagicMock()
        ws.client.host = "127.0.0.1"
        ws.client.port = 12345
        ws.url = MagicMock()
        ws.url.path = "/ws"
        
        db = MagicMock()
        
        result = await authenticate_ws(ws, db)
        
        assert result is None
        ws.close.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_auth_multiple_validation_steps(self):
        """Auth validates in correct order (session before user)."""
        session_id = str(uuid4())
        ws = _make_websocket(cookies={SESSION_COOKIE_NAME: session_id})
        db = MagicMock()
        
        with patch("app.services.ws_auth.crud_session.get_session") as mock_get_session:
            with patch("app.services.ws_auth.crud_user.get_user") as mock_get_user:
                mock_get_session.return_value = None
                
                result = await authenticate_ws(ws, db)
                
                assert result is None
                # Session was checked but user should not be checked if session fails
                mock_get_session.assert_called_once()
                mock_get_user.assert_not_called()
