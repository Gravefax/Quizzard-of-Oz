import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from types import SimpleNamespace
from uuid import uuid4
from datetime import datetime, timezone

# Patch DB engine creation before importing main
with patch("sqlalchemy.create_engine"):
    with patch("app.database.Base.metadata.create_all"):
        from main import app

from app.routers.battle import queue_ws, battle_ws
from app.database import get_db


@pytest.fixture(autouse=True)
def override_db():
    """Override database dependency with mock."""
    db = MagicMock(name="db")

    def _override():
        yield db

    app.dependency_overrides[get_db] = _override
    yield db
    app.dependency_overrides.clear()


def _make_user(*, user_id=None, username="TestPlayer", email="test@example.com"):
    """Create a mock user object."""
    return SimpleNamespace(
        id=user_id or uuid4(),
        username=username,
        email=email,
    )


def _make_websocket():
    """Create a mock WebSocket."""
    ws = AsyncMock()
    ws.client = SimpleNamespace(host="127.0.0.1", port=54321)
    ws.url.path = "/battle/ws/test-match"
    return ws


@pytest.mark.asyncio
async def test_queue_ws_auth_fails(override_db):
    """Queue WebSocket disconnects if auth fails."""
    ws = _make_websocket()
    
    with patch("app.routers.battle.matchmaking.authenticate", new_callable=AsyncMock) as mock_auth:
        mock_auth.return_value = None
        
        await queue_ws(ws, override_db)
        
        mock_auth.assert_called_once()
        # Should return without accepting or joining
        ws.accept.assert_not_called()


@pytest.mark.asyncio
async def test_queue_ws_success(override_db):
    """Queue WebSocket accepts authenticated user."""
    ws = _make_websocket()
    user = _make_user()
    
    with patch("app.routers.battle.matchmaking.authenticate", new_callable=AsyncMock) as mock_auth:
        with patch("app.routers.battle.matchmaking.join", new_callable=AsyncMock) as mock_join:
            mock_auth.return_value = user
            
            await queue_ws(ws, override_db)
            
            ws.accept.assert_called_once()
            mock_join.assert_called_once_with(ws, user, override_db)


@pytest.mark.asyncio
async def test_battle_ws_auth_fails(override_db):
    """Battle WebSocket disconnects if auth fails."""
    ws = _make_websocket()
    match_id = str(uuid4())
    
    with patch("app.routers.battle.manager.authenticate", new_callable=AsyncMock) as mock_auth:
        mock_auth.return_value = None
        
        await battle_ws(ws, match_id, override_db)
        
        mock_auth.assert_called_once()
        ws.accept.assert_not_called()


@pytest.mark.asyncio
async def test_battle_ws_connect_fails_match_full(override_db):
    """Battle WebSocket closes if match is full."""
    ws = _make_websocket()
    user = _make_user()
    match_id = str(uuid4())
    
    with patch("app.routers.battle.manager.authenticate", new_callable=AsyncMock) as mock_auth:
        with patch("app.routers.battle.manager.connect", new_callable=AsyncMock) as mock_connect:
            mock_auth.return_value = user
            mock_connect.return_value = False
            
            await battle_ws(ws, match_id, override_db)
            
            ws.accept.assert_called_once()
            mock_connect.assert_called_once_with(ws, match_id, user)
            # disconnect should be called in finally block
            ws.close.assert_not_called()  # connect() handles close


@pytest.mark.asyncio
async def test_battle_ws_message_loop_success(override_db):
    """Battle WebSocket processes messages until disconnect."""
    ws = _make_websocket()
    user = _make_user()
    match_id = str(uuid4())
    
    # Simulate receiving two messages then WebSocketDisconnect
    from fastapi import WebSocketDisconnect
    exc = WebSocketDisconnect(code=1000)
    ws.receive_text.side_effect = [
        '{"type": "pick_category", "category": "Science"}',
        '{"type": "answer", "question_id": "q1", "answer": "B"}',
        exc,
    ]
    
    with patch("app.routers.battle.manager.authenticate", new_callable=AsyncMock) as mock_auth:
        with patch("app.routers.battle.manager.connect", new_callable=AsyncMock) as mock_connect:
            with patch("app.routers.battle.manager.handle_message", new_callable=AsyncMock) as mock_handle:
                with patch("app.routers.battle.manager.disconnect", new_callable=AsyncMock) as mock_disconnect:
                    mock_auth.return_value = user
                    mock_connect.return_value = True
                    
                    await battle_ws(ws, match_id, override_db)
                    
                    assert mock_handle.call_count == 2
                    mock_disconnect.assert_called_once_with(ws, match_id, user)


@pytest.mark.asyncio
async def test_battle_ws_exception_handling(override_db):
    """Battle WebSocket catches exceptions and calls disconnect."""
    ws = _make_websocket()
    user = _make_user()
    match_id = str(uuid4())
    
    ws.receive_text.side_effect = RuntimeError("Connection error")
    
    with patch("app.routers.battle.manager.authenticate", new_callable=AsyncMock) as mock_auth:
        with patch("app.routers.battle.manager.connect", new_callable=AsyncMock) as mock_connect:
            with patch("app.routers.battle.manager.disconnect", new_callable=AsyncMock) as mock_disconnect:
                with patch("app.routers.battle.logger.exception") as mock_logger:
                    mock_auth.return_value = user
                    mock_connect.return_value = True
                    
                    await battle_ws(ws, match_id, override_db)
                    
                    # Exception should be logged
                    assert mock_logger.called
                    # Disconnect should still be called
                    mock_disconnect.assert_called_once()


@pytest.mark.asyncio
async def test_battle_ws_disconnect_called_on_normal_close(override_db):
    """Battle WebSocket calls disconnect on WebSocketDisconnect."""
    ws = _make_websocket()
    user = _make_user()
    match_id = str(uuid4())
    
    from fastapi import WebSocketDisconnect
    exc = WebSocketDisconnect(code=1000)
    ws.receive_text.side_effect = exc
    
    with patch("app.routers.battle.manager.authenticate", new_callable=AsyncMock) as mock_auth:
        with patch("app.routers.battle.manager.connect", new_callable=AsyncMock) as mock_connect:
            with patch("app.routers.battle.manager.disconnect", new_callable=AsyncMock) as mock_disconnect:
                with patch("app.routers.battle.logger.info") as mock_logger:
                    mock_auth.return_value = user
                    mock_connect.return_value = True
                    
                    await battle_ws(ws, match_id, override_db)
                    
                    # Log should be called with code
                    assert any("disconnected" in str(call) for call in mock_logger.call_args_list)
                    mock_disconnect.assert_called_once_with(ws, match_id, user)


@pytest.mark.asyncio
async def test_battle_ws_logs_handshake(override_db):
    """Battle WebSocket logs handshake start."""
    ws = _make_websocket()
    match_id = str(uuid4())
    
    with patch("app.routers.battle.manager.authenticate", new_callable=AsyncMock) as mock_auth:
        with patch("app.routers.battle.logger.info") as mock_logger:
            mock_auth.return_value = None
            
            await battle_ws(ws, match_id, override_db)
            
            # Should log handshake start
            calls = [str(call) for call in mock_logger.call_args_list]
            assert any("handshake started" in call for call in calls)


@pytest.mark.asyncio
async def test_battle_ws_logs_auth_failure(override_db):
    """Battle WebSocket logs authentication failure."""
    ws = _make_websocket()
    match_id = str(uuid4())
    
    with patch("app.routers.battle.manager.authenticate", new_callable=AsyncMock) as mock_auth:
        with patch("app.routers.battle.logger.warning") as mock_logger:
            mock_auth.return_value = None
            
            await battle_ws(ws, match_id, override_db)
            
            # Should log auth failure
            calls = [str(call) for call in mock_logger.call_args_list]
            assert any("authentication failed" in call for call in calls)
