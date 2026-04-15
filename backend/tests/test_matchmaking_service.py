import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

with patch("sqlalchemy.create_engine"):
    with patch("app.database.Base.metadata.create_all"):
        from main import app

from app.services.matchmaking_service import MatchmakingService
from fastapi import WebSocketDisconnect


def _make_websocket(*, user_id=None):
    """Create mock WebSocket."""
    ws = AsyncMock()
    ws.client = MagicMock()
    ws.client.host = "127.0.0.1"
    ws.client.port = 12345
    ws.url = MagicMock()
    ws.url.path = "/queue"
    return ws


def _make_user(user_id=None, username="Player1"):
    """Create mock user."""
    user = MagicMock()
    user.id = user_id or uuid4()
    user.username = username
    return user


def _make_ranking(elo_rating=1000):
    ranking = MagicMock()
    ranking.elo_rating = elo_rating
    return ranking


class TestMatchmakingService:
    """Tests for MatchmakingService."""
    
    def test_init_empty_queue(self):
        """Initialize with empty queue."""
        service = MatchmakingService()
        assert service._queue == []
        assert service._lock is not None
    
    @pytest.mark.asyncio
    async def test_authenticate_delegates(self):
        """authenticate() delegates to authenticate_ws."""
        service = MatchmakingService()
        ws = _make_websocket()
        db = MagicMock()
        user = _make_user()
        
        with patch("app.services.matchmaking_service.authenticate_ws", new_callable=AsyncMock) as mock_auth:
            mock_auth.return_value = user
            
            result = await service.authenticate(ws, db)
            
            assert result == user
            mock_auth.assert_called_once_with(ws, db)
    
    @pytest.mark.asyncio
    async def test_authenticate_failure(self):
        """authenticate() returns None on failure."""
        service = MatchmakingService()
        ws = _make_websocket()
        db = MagicMock()
        
        with patch("app.services.matchmaking_service.authenticate_ws", new_callable=AsyncMock) as mock_auth:
            mock_auth.return_value = None
            
            result = await service.authenticate(ws, db)
            
            assert result is None
    
    @pytest.mark.asyncio
    async def test_join_first_player_queued(self):
        """First player added to queue and told to wait."""
        service = MatchmakingService()
        ws = _make_websocket()
        user = _make_user()
        db = MagicMock()
        
        # Mock receive_text to raise disconnect immediately
        ws.receive_text.side_effect = WebSocketDisconnect(code=1000)
        
        with patch("app.services.matchmaking_service.get_user_ranking") as mock_ranking:
            mock_ranking.return_value = _make_ranking(1000)
            await service.join(ws, user, db)
        
        # Should send "queued" message
        ws.send_json.assert_called()
        args = ws.send_json.call_args_list[0][0][0]
        assert args["type"] == "queued"
    
    @pytest.mark.asyncio
    async def test_notify_matched_sends_match_id_to_both(self):
        """_notify_matched sends match_id to both players."""
        service = MatchmakingService()
        
        ws1 = _make_websocket()
        ws2 = _make_websocket()
        user1 = _make_user()
        user2 = _make_user()
        
        p1 = {"ws": ws1, "user": user1}
        p2 = {"ws": ws2, "user": user2}
        
        with patch("app.services.matchmaking_service.uuid.uuid4") as mock_uuid:
            test_id = str(uuid4())
            mock_uuid.return_value = test_id
            
            await service._notify_matched(p1, p2)
            
            ws1.send_json.assert_called_once()
            ws2.send_json.assert_called_once()
            
            msg1 = ws1.send_json.call_args[0][0]
            msg2 = ws2.send_json.call_args[0][0]
            
            assert msg1["type"] == "matched"
            assert msg2["type"] == "matched"
            assert msg1["match_id"] == str(test_id)
            assert msg2["match_id"] == str(test_id)
    
    @pytest.mark.asyncio
    async def test_remove_takes_player_out_of_queue(self):
        """_remove removes player from queue."""
        service = MatchmakingService()
        
        ws1 = _make_websocket()
        ws2 = _make_websocket()
        user1 = _make_user()
        user2 = _make_user()
        
        # Manually populate queue
        service._queue = [
            {"ws": ws1, "user": user1},
            {"ws": ws2, "user": user2},
        ]
        
        await service._remove(ws1)
        
        assert len(service._queue) == 1
        assert service._queue[0]["ws"] == ws2
    
    @pytest.mark.asyncio
    async def test_remove_nonexistent_player(self):
        """_remove safely handles player not in queue."""
        service = MatchmakingService()
        
        ws1 = _make_websocket()
        ws2 = _make_websocket()
        user1 = _make_user()
        
        service._queue = [{"ws": ws1, "user": user1}]
        
        # Remove ws2 which isn't in queue
        await service._remove(ws2)
        
        # Queue unchanged
        assert len(service._queue) == 1
    
    @pytest.mark.asyncio
    async def test_join_tracks_queue_state(self):
        """Join adds players to queue before matching."""
        service = MatchmakingService()
        
        ws = _make_websocket()
        user = _make_user()
        db = MagicMock()
        
        # Set up immediate disconnect
        ws.receive_text.side_effect = WebSocketDisconnect(code=1000)
        
        with patch("app.services.matchmaking_service.get_user_ranking") as mock_ranking:
            mock_ranking.return_value = _make_ranking(1000)
            await service.join(ws, user, db)
        
        # After join completes, queue should be empty (player removed)
        assert len(service._queue) == 0
    
    def test_queue_structure(self):
        """Queue stores WebSocket and user pairs."""
        service = MatchmakingService()
        
        ws = _make_websocket()
        user = _make_user()
        
        entry = {"ws": ws, "user": user}
        service._queue.append(entry)
        
        assert len(service._queue) == 1
        assert service._queue[0]["ws"] == ws
        assert service._queue[0]["user"] == user

    def test_allowed_elo_delta_starts_with_base_range(self):
        service = MatchmakingService()
        now = 200.0
        assert service._allowed_elo_delta(queued_at=now, now=now) == 75

    def test_allowed_elo_delta_grows_every_five_seconds(self):
        service = MatchmakingService()
        queued_at = 100.0

        assert service._allowed_elo_delta(queued_at=queued_at, now=104.9) == 75
        assert service._allowed_elo_delta(queued_at=queued_at, now=105.0) == 125
        assert service._allowed_elo_delta(queued_at=queued_at, now=110.0) == 175

    def test_attempt_match_prefers_smallest_elo_difference(self):
        service = MatchmakingService()
        ws1, ws2, ws3, ws4 = (_make_websocket(), _make_websocket(), _make_websocket(), _make_websocket())
        u1, u2, u3, u4 = (_make_user(username="u1"), _make_user(username="u2"), _make_user(username="u3"), _make_user(username="u4"))

        service._queue = [
            {"ws": ws1, "user": u1, "elo": 1000, "queued_at": 0.0, "seq": 0},
            {"ws": ws2, "user": u2, "elo": 1070, "queued_at": 0.0, "seq": 1},
            {"ws": ws3, "user": u3, "elo": 1010, "queued_at": 0.0, "seq": 2},
            {"ws": ws4, "user": u4, "elo": 1190, "queued_at": 0.0, "seq": 3},
        ]

        with patch("app.services.matchmaking_service.time.monotonic", return_value=0.0):
            matched = service._attempt_match_locked()

        assert matched is not None
        left, right = matched
        assert abs(int(left["elo"]) - int(right["elo"])) == 10

