#Session validation for WebSocket connections. Closes with 4001/4003 on failure

from __future__ import annotations

import logging
import os
from datetime import datetime, timezone
from uuid import UUID

from fastapi import WebSocket
from sqlalchemy.orm import Session

from app.crud import session as crud_session
from app.crud import user as crud_user
from app.models.user import User

# Configuration: Name of the session cookie, typically set via environment
SESSION_COOKIE_NAME = os.getenv("SESSION_COOKIE_NAME", "session_id")

# WebSocket close codes (custom, follow RFC 6455 reserved range 4000-4999)
_CLOSE_UNAUTHORIZED = 4001  # Missing/invalid/non-existent session or user not found
_CLOSE_EXPIRED = 4003       # Session has expired

logger = logging.getLogger("uvicorn.error")

#Return client IP:port for logging, or 'unknown'.
def _client_label(websocket: WebSocket) -> str:
    client = websocket.client
    if client is None:
        return "unknown"
    return f"{client.host}:{client.port}"

"""
    Authenticate a WebSocket connection via session cookie.
    
    Validates the HTTP handshake cookies for a valid, non-expired session ID,
    then retrieves the associated User from the database. On any validation
    failure, closes the WebSocket with the appropriate code and returns None.
    
    This function is the security checkpoint for all WebSocket endpoints.
    It should be called during the WebSocket handshake, before accept().
    
    Parameters:
      websocket (WebSocket): The FastAPI WebSocket connection (not yet accepted).
      db (Session): SQLAlchemy database session for CRUD operations.
    
    Returns:
      User | None: The authenticated User object, or None if validation failed
                   (WebSocket will be closed with code 4001/4003).
    
    Validation Steps (in order):
      1. Read SESSION_COOKIE_NAME from websocket.cookies
         → Fail: WebSocket closed with 4001, reason "Missing session"
      2. Parse session ID as UUID
         → Fail: WebSocket closed with 4001, reason "Invalid session ID"
      3. Retrieve session record from database
         → Fail: WebSocket closed with 4001, reason "Session not found"
      4. Compare session.expires_at (with UTC timezone handling) to current UTC time
         → Fail: WebSocket closed with 4003, reason "Session expired"
      5. Retrieve User record by session.user_id
         → Fail: WebSocket closed with 4001, reason "User not found"
      6. Success: Return User object, log "WS auth success"
    
    Example:
      @router.websocket("/ws")
      async def ws_handler(ws: WebSocket, db: Session = Depends(get_db)):
          user = await authenticate_ws(ws, db)
          if user is None:
              return  # WebSocket already closed
          await ws.accept()
          # ... handle authenticated connection
    
    Logging:
      INFO:  "WS auth started" on attempt, "WS auth success" on completion
      WARNING: "WS auth failed: <reason>" for each validation failure with client IP
      """
async def authenticate_ws(websocket: WebSocket, db: Session) -> User | None:
    logger.info("WS auth started")

    raw_session = websocket.cookies.get(SESSION_COOKIE_NAME)
    if not raw_session:
        logger.warning("WS auth failed: missing session cookie")
        await websocket.close(code=_CLOSE_UNAUTHORIZED, reason="Missing session")
        return None

    try:
        session_id = UUID(raw_session)
    except ValueError:
        logger.warning("WS auth failed: invalid session id")
        await websocket.close(code=_CLOSE_UNAUTHORIZED, reason="Invalid session ID")
        return None

    session = crud_session.get_session(db, session_id)
    if not session:
        logger.warning("WS auth failed: session not found")
        await websocket.close(code=_CLOSE_UNAUTHORIZED, reason="Session not found")
        return None

    expires_at: datetime = session.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        logger.warning("WS auth failed: session expired")
        await websocket.close(code=_CLOSE_EXPIRED, reason="Session expired")
        return None

    user = crud_user.get_user(db, session.user_id)
    if not user:
        logger.warning("WS auth failed: user not found")
        await websocket.close(code=_CLOSE_UNAUTHORIZED, reason="User not found")
        return None

    logger.info("WS auth success")

    return user
