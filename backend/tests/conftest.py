import pytest


@pytest.fixture(autouse=True)
def reset_rate_limiter():
    from app.rate_limit import limiter
    limiter._storage.reset()
    yield
    limiter._storage.reset()
