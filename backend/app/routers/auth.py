from __future__ import annotations

import logging
import os
from datetime import datetime, timedelta, timezone
from typing import Annotated, Literal, cast
from uuid import UUID

import jwt as pyjwt
from fastapi import APIRouter, Depends, Header, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.rate_limit import limiter
from app.schemas.login_response import LoginResponse
from app.services import session_service, user_service

router = APIRouter(prefix="/auth", tags=["auth"])
logger = logging.getLogger(__name__)

CookieSameSite = Literal["lax", "strict", "none"]

KEYCLOAK_URL = os.getenv("KEYCLOAK_URL")
KEYCLOAK_REALM = os.getenv("KEYCLOAK_REALM", "quizzard")

SESSION_EXP_MINUTES = int(os.getenv("SESSION_EXP_MINUTES", str(60 * 24 * 14)))
COOKIE_SECURE = os.getenv("COOKIE_SECURE", "false").lower() == "true"
COOKIE_DOMAIN = os.getenv("COOKIE_DOMAIN")
SESSION_COOKIE_NAME = os.getenv("SESSION_COOKIE_NAME", "session_id")

_jwks_client: pyjwt.PyJWKClient | None = None


def _cookie_samesite(value: str) -> CookieSameSite:
    normalized = value.lower()
    if normalized in ("lax", "strict", "none"):
        return cast(CookieSameSite, normalized)
    return "lax"


COOKIE_SAMESITE: CookieSameSite = _cookie_samesite(os.getenv("COOKIE_SAMESITE", "lax"))


def _get_jwks_client() -> pyjwt.PyJWKClient:
    global _jwks_client
    if _jwks_client is None:
        jwks_url = f"{KEYCLOAK_URL}/realms/{KEYCLOAK_REALM}/protocol/openid-connect/certs"
        _jwks_client = pyjwt.PyJWKClient(jwks_url, cache_jwk_set=True, lifespan=300)
    return _jwks_client


def _verify_token(token: str) -> dict:
    client = _get_jwks_client()
    try:
        signing_key = client.get_signing_key_from_jwt(token)
        payload = pyjwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256", "RS384", "RS512"],
            options={"verify_aud": False},
        )
    except pyjwt.exceptions.PyJWTError as exc:
        raise ValueError(str(exc)) from exc
    return payload


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

    session = session_service.get_session(db, session_id)
    if not session:
        raise HTTPException(status_code=401, detail="Session not found")

    expires_at = getattr(session, "expires_at", None)
    if not isinstance(expires_at, datetime):
        session_service.delete_session(db, session_id)
        raise HTTPException(status_code=401, detail="Invalid session")

    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if expires_at < datetime.now(timezone.utc):
        session_service.delete_session(db, session_id)
        raise HTTPException(status_code=403, detail="Session expired")

    return session


@router.post(
    "/login",
    status_code=status.HTTP_200_OK,
    response_model=LoginResponse,
    responses={
        400: {"description": "Missing or malformed Authorization header"},
        401: {"description": "Invalid or expired token"},
        429: {"description": "Too many login attempts"},
    },
)
@limiter.limit("5/minute")
def login(
    request: Request,
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
        payload = _verify_token(token)

        sub = payload.get("sub")
        if not sub:
            raise ValueError("Missing sub claim in token")

        user = user_service.get_user_by_keycloak_sub(db, sub)

        if not user:
            username = (
                payload.get("preferred_username")
                or payload.get("name")
                or (payload.get("email") or "").split("@")[0]
                or "user"
            )
            email = payload.get("email") or ""
            user = user_service.create_user(
                db,
                username=username[:50],
                keycloak_sub=sub,
                email=email,
            )

        expires_at = _session_expiry()
        session = session_service.create_session(db, user_id=user.id, expires_at=expires_at)

        set_session_cookie(response, session.id)
        return LoginResponse(
            username=user.username,
            email=user.email,
            expires_at=int(expires_at.timestamp()),
        )

    except ValueError as exc:
        logger.warning("Keycloak token verification failed: %s", exc)
        raise HTTPException(status_code=401, detail="Invalid token") from exc


@router.get(
    "/refresh",
    status_code=status.HTTP_200_OK,
    response_model=LoginResponse,
    responses={
        401: {"description": "Invalid or missing session"},
        403: {"description": "Session has expired"},
        429: {"description": "Too many requests"},
    },
)
@limiter.limit("30/minute")
def refresh(
    request: Request,
    response: Response,
    db: Annotated[Session, Depends(get_db)],
):
    session = _get_valid_session(request, db)

    user = user_service.get_user(db, session.user_id)
    if not user:
        session_service.delete_session(db, session.id)
        raise HTTPException(status_code=401, detail="User not found")

    new_expires_at = _session_expiry()
    session_service.extend_session(db, session, expires_at=new_expires_at)
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
            session_service.delete_session(db, UUID(raw_session))
        except ValueError:
            pass

    clear_session_cookie(response)
