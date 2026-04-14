from __future__ import annotations

import logging
import os
from uuid import UUID
from typing import Annotated

from fastapi import APIRouter, Header, HTTPException, status, Depends, Response, Request
from sqlalchemy.orm import Session
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
from datetime import datetime, timedelta, timezone

from app.database import get_db
from app.crud import session as crud_session
from app.crud import user as crud_user
from app.schemas.login_response import LoginResponse

router = APIRouter(prefix="/auth", tags=["auth"])
logger = logging.getLogger(__name__)

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLOCK_SKEW_SECONDS = int(os.getenv("GOOGLE_CLOCK_SKEW_SECONDS", "10"))

SESSION_EXP_MINUTES = int(os.getenv("SESSION_EXP_MINUTES", str(60 * 24 * 14)))
COOKIE_SECURE = os.getenv("COOKIE_SECURE", "false").lower() == "true"
COOKIE_SAMESITE = os.getenv("COOKIE_SAMESITE", "lax")
COOKIE_DOMAIN = os.getenv("COOKIE_DOMAIN")
SESSION_COOKIE_NAME = os.getenv("SESSION_COOKIE_NAME", "session_id")


def _set_cookie(response: Response, *, key: str, value: str, max_age_seconds: int):
    response.set_cookie(
        key=key,
        value=value,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        max_age=max_age_seconds,
        path="/",
        domain=COOKIE_DOMAIN,
    )


def set_session_cookie(response: Response, session_id: UUID):
    _set_cookie(
        response,
        key=SESSION_COOKIE_NAME,
        value=str(session_id),
        max_age_seconds=SESSION_EXP_MINUTES * 60,
    )


def clear_session_cookie(response: Response):
    _set_cookie(response, key=SESSION_COOKIE_NAME, value="", max_age_seconds=0)


def _session_expiry() -> datetime:
    return datetime.now(timezone.utc) + timedelta(minutes=SESSION_EXP_MINUTES)


def _get_valid_session(request: Request, db: Session):
    raw_session = request.cookies.get(SESSION_COOKIE_NAME)
    if not raw_session:
        raise HTTPException(status_code=401, detail="Missing session")

    try:
        session_id = UUID(raw_session)
    except ValueError as exc:
        raise HTTPException(status_code=401, detail="Invalid session") from exc

    session = crud_session.get_session(db, session_id)
    if not session:
        raise HTTPException(status_code=401, detail="Session not found")

    expires_at = getattr(session, "expires_at", None)
    if not isinstance(expires_at, datetime):
        crud_session.delete_session(db, session_id)
        raise HTTPException(status_code=401, detail="Invalid session")

    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if expires_at < datetime.now(timezone.utc):
        crud_session.delete_session(db, session_id)
        raise HTTPException(status_code=403, detail="Session expired")

    return session


@router.post(
    "/google/login",
    status_code=status.HTTP_200_OK,
    response_model=LoginResponse,
    responses={
        400: {"description": "Missing or malformed Authorization header"},
        401: {"description": "Invalid or missing token"},
    },
)
def login(
    db: Annotated[Session, Depends(get_db)],
    response: Response,
    authorization: Annotated[str | None, Header()] = None,
):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=400, detail="Missing bearer token")

    token = authorization.split(" ", 1)[1].strip()
    if not token:
        raise HTTPException(status_code=400, detail="Missing bearer token")

    try:
        # If no client ID is configured, signature/expiry are still validated.
        payload = id_token.verify_oauth2_token(
            token,
            google_requests.Request(),
            GOOGLE_CLIENT_ID or None,
            clock_skew_in_seconds=GOOGLE_CLOCK_SKEW_SECONDS,
        )

        user = crud_user.get_user_by_google_sub(db, payload["sub"])

        if not user:
            username = (
                payload.get("name")
                or (payload.get("given_name", "") + " " + payload.get("family_name", "")).strip()
                or payload.get("email", "Unknown")
            )

            user = crud_user.create_user(
                db,
                username=username,
                google_sub=payload["sub"],
                email=payload["email"],
            )

        expires_at = _session_expiry()
        session = crud_session.create_session(db, user_id=user.id, expires_at=expires_at)

        set_session_cookie(response, session.id)
        return LoginResponse(
            username=user.username,
            email=user.email,
            expires_at=int(expires_at.timestamp()),
        )

    except ValueError as exc:
        logger.warning("Google token verification failed: %s", exc)
        raise HTTPException(status_code=401, detail="Invalid token") from exc


@router.get(
    "/google/refresh",
    status_code=status.HTTP_200_OK,
    response_model=LoginResponse,
    responses={
        401: {"description": "Invalid or missing session"},
        403: {"description": "Session has expired"},
    },
)
def refresh(
    request: Request,
    response: Response,
    db: Annotated[Session, Depends(get_db)],
):
    session = _get_valid_session(request, db)

    user = crud_user.get_user(db, session.user_id)
    if not user:
        crud_session.delete_session(db, session.id)
        raise HTTPException(status_code=401, detail="User not found")

    new_expires_at = _session_expiry()
    crud_session.extend_session(db, session, expires_at=new_expires_at)
    set_session_cookie(response, session.id)

    return LoginResponse(
        username=user.username,
        email=user.email,
        expires_at=int(new_expires_at.timestamp()),
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(request: Request, response: Response, db: Annotated[Session, Depends(get_db)]):
    raw_session = request.cookies.get(SESSION_COOKIE_NAME)
    if raw_session:
        try:
            crud_session.delete_session(db, UUID(raw_session))
        except ValueError:
            pass

    clear_session_cookie(response)
