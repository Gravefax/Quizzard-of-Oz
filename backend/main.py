import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded

from app import models as _models  # noqa: F401
from app.database import Base, engine
from app.rate_limit import limiter, rate_limit_exceeded_handler
from app.routers import auth, battle, quiz, ranking, trivia, user
from app.services.trivia_service import close_trivia_resources
from app.settings import get_app_settings

LOG_FORMAT = "%(asctime)s.%(msecs)03d | %(levelname)s | %(name)s | %(message)s"
DATE_FORMAT = "%Y-%m-%d %H:%M:%S"


def _configure_logging() -> None:
    """Use a consistent timestamped format for application and uvicorn logs."""
    formatter = logging.Formatter(LOG_FORMAT, DATE_FORMAT)

    for logger_name in ("uvicorn.error", "uvicorn.access"):
        target_logger = logging.getLogger(logger_name)
        for handler in target_logger.handlers:
            handler.setFormatter(formatter)

Base.metadata.create_all(bind=engine)

@asynccontextmanager
async def lifespan(application: FastAPI):
    _ = application
    _configure_logging()
    yield
    close_trivia_resources()


app = FastAPI(title="SQS Team 11 API", version="1.0.0", lifespan=lifespan)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_app_settings().cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(user.router)
app.include_router(auth.router)
app.include_router(quiz.router)
app.include_router(battle.router)
app.include_router(ranking.router)
app.include_router(trivia.router)


@app.get("/")
def root():
    return {"message": "API is running"}


@app.get("/health")
def health():
    return {"status": "ok"}
