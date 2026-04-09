import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import app.models  # noqa: F401
from app.database import engine, Base
from app.routers import quiz
from app.routers import user, auth, battle
from app.routers import trivia
from app.services.trivia_service import close_trivia_resources


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
async def lifespan(app: FastAPI):
    _configure_logging()
    yield
    close_trivia_resources()


app = FastAPI(title="SQS Team 11 API", lifespan=lifespan)

app.add_middleware(
   CORSMiddleware,
  allow_origins=["http://localhost:3000"],
 allow_methods=["*"],
allow_headers=["*"],
allow_credentials=True,
)

app.include_router(user.router)
app.include_router(auth.router)
app.include_router(quiz.router)
app.include_router(battle.router)
app.include_router(trivia.router)


@app.get("/")
def root():
    return {"message": "API is running"}


@app.get("/health")
def health():
    return {"status": "ok"}
