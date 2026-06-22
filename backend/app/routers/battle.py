import logging

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.battle_manager import BattleManager
from app.services.matchmaking_service import MatchmakingService

router = APIRouter(prefix="/battle", tags=["battle"])

manager = BattleManager()
matchmaking = MatchmakingService()
logger = logging.getLogger("uvicorn.error")


def _client_addr(websocket: WebSocket) -> str:
    """Return the websocket peer address in host:port format."""
    client = websocket.client
    if client is None:
        return "unknown"
    return f"{client.host}:{client.port}"


@router.websocket("/queue")
async def queue_ws(
    websocket: WebSocket,
    db: Session = Depends(get_db),
):
    #Join the matchmaking queue
    user = await matchmaking.authenticate(websocket, db)
    if user is None:
        return

    await websocket.accept()
    await matchmaking.join(websocket, user, db)


@router.websocket("/ws/{match_id}")
async def battle_ws(
    websocket: WebSocket,
    match_id: str,
    db: Session = Depends(get_db),
):
    #Connect player to battle, process messages, cleanup on disconnect.
    logger.info(
        "Battle WS handshake started match_id=%s client=%s path=%s",
        match_id,
        _client_addr(websocket),
        websocket.url.path,
    )

    user = await manager.authenticate(websocket, db)
    if user is None:
        logger.warning(
            "Battle WS authentication failed match_id=%s client=%s",
            match_id,
            _client_addr(websocket),
        )
        return

    await websocket.accept()
    logger.info(
        "Battle WS accepted match_id=%s user_id=%s username=%s client=%s",
        match_id,
        user.id,
        user.username,
        _client_addr(websocket),
    )

    if not await manager.connect(websocket, match_id, user):
        logger.warning(
            "Battle WS connect rejected match_id=%s user_id=%s username=%s",
            match_id,
            user.id,
            user.username,
        )
        return

    try:
        # Message loop: receive incoming messages and dispatch to handlers
        while True:
            raw = await websocket.receive_text()
            await manager.handle_message(match_id, user, raw)
    except WebSocketDisconnect as exc:
        # Normal client disconnect (including reconnect timeout)
        logger.info(
            "Battle WS disconnected match_id=%s user_id=%s username=%s code=%s",
            match_id,
            user.id,
            user.username,
            exc.code,
        )
    except Exception:
        # Unhandled exception during message processing
        logger.exception(
            "Battle WS unhandled error match_id=%s user_id=%s username=%s",
            match_id,
            user.id,
            user.username,
        )
    finally:
        # Always cleanup: remove player, notify opponent, delete match if empty
        logger.info(
            "Battle WS cleanup start match_id=%s user_id=%s username=%s",
            match_id,
            user.id,
            user.username,
        )
        await manager.disconnect(websocket, match_id, user)
