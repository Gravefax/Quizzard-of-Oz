from datetime import datetime, timezone
from unittest.mock import MagicMock
from uuid import uuid4

import pytest

from app.models.match_result import ENDED_AS_FORFEIT, ENDED_AS_NORMAL, MatchResult
from app.models.ranking import Ranking
from app.services import ranking_service


@pytest.mark.parametrize("page", [0, -1])
def test_get_leaderboard_page_rejects_invalid_page(page):
    with pytest.raises(ValueError):
        ranking_service.get_leaderboard_page(db=object(), page=page)


def test_apply_match_result_updates_both_players(monkeypatch):
    winner_id = uuid4()
    loser_id = uuid4()
    winner = Ranking(user_id=winner_id, elo_rating=1000, wins=0, losses=0, total_matches=0)
    loser = Ranking(user_id=loser_id, elo_rating=1000, wins=0, losses=0, total_matches=0)

    saved = {}

    def fake_get_or_create(db, user_id):
        return winner if user_id == winner_id else loser

    def fake_save(db, *rankings):
        saved["rankings"] = rankings

    monkeypatch.setattr(ranking_service.crud_ranking, "get_or_create_ranking", fake_get_or_create)
    monkeypatch.setattr(ranking_service.crud_ranking, "save_rankings", fake_save)

    db = MagicMock()
    updated_winner, updated_loser = ranking_service.apply_match_result(
        db=db,
        winner_id=winner_id,
        loser_id=loser_id,
    )

    assert updated_winner is winner
    assert updated_loser is loser
    assert winner.wins == 1
    assert winner.losses == 0
    assert winner.total_matches == 1
    assert winner.last_win_at is not None

    assert loser.wins == 0
    assert loser.losses == 1
    assert loser.total_matches == 1

    assert winner.elo_rating == 1016
    assert loser.elo_rating == 984
    assert saved["rankings"] == (winner, loser)

    # A history entry is recorded; regular matches end as "normal".
    recorded = db.add.call_args.args[0]
    assert isinstance(recorded, MatchResult)
    assert recorded.winner_id == winner_id
    assert recorded.loser_id == loser_id
    assert recorded.ended_as == ENDED_AS_NORMAL


def test_apply_match_result_records_forfeit_in_history(monkeypatch):
    winner_id = uuid4()
    loser_id = uuid4()
    winner = Ranking(user_id=winner_id, elo_rating=1000, wins=0, losses=0, total_matches=0)
    loser = Ranking(user_id=loser_id, elo_rating=1000, wins=0, losses=0, total_matches=0)

    monkeypatch.setattr(
        ranking_service.crud_ranking,
        "get_or_create_ranking",
        lambda db, user_id: winner if user_id == winner_id else loser,
    )
    monkeypatch.setattr(ranking_service.crud_ranking, "save_rankings", lambda db, *r: None)

    db = MagicMock()
    ranking_service.apply_match_result(
        db=db,
        winner_id=winner_id,
        loser_id=loser_id,
        ended_as=ENDED_AS_FORFEIT,
    )

    # Forfeit still counts as a full Elo loss/win …
    assert winner.elo_rating == 1016
    assert loser.elo_rating == 984
    # … but the history entry is labelled as forfeit, not a plain loss.
    recorded = db.add.call_args.args[0]
    assert isinstance(recorded, MatchResult)
    assert recorded.ended_as == ENDED_AS_FORFEIT


def test_get_leaderboard_page_assigns_same_rank_on_full_tie(monkeypatch):
    now = datetime.now(timezone.utc)
    r1 = Ranking(user_id=uuid4(), elo_rating=1200, wins=10, losses=2, total_matches=12, last_win_at=now)
    r2 = Ranking(user_id=uuid4(), elo_rating=1200, wins=10, losses=2, total_matches=12, last_win_at=now)

    monkeypatch.setattr(
        ranking_service.crud_ranking,
        "list_leaderboard_page",
        lambda db, page, page_size, username_query=None: [(r1, "u1"), (r2, "u2")],
    )
    monkeypatch.setattr(ranking_service.crud_ranking, "count_rankings", lambda db, username_query=None: 2)

    rows, total = ranking_service.get_leaderboard_page(db=object(), page=1)

    assert total == 2
    assert rows[0][2] == 1
    assert rows[1][2] == 1


def test_get_leaderboard_page_passes_username_query(monkeypatch):
    captured: dict[str, object] = {}
    ranking = Ranking(user_id=uuid4(), elo_rating=1100, wins=3, losses=1, total_matches=4, last_win_at=None)

    def fake_list(db, page, page_size, username_query=None):
        captured["username_query"] = username_query
        return [(ranking, "Alpha")]

    monkeypatch.setattr(ranking_service.crud_ranking, "list_leaderboard_page", fake_list)
    monkeypatch.setattr(ranking_service.crud_ranking, "count_rankings", lambda db, username_query=None: 1)

    rows, total = ranking_service.get_leaderboard_page(db=object(), page=1, username_query="alp")

    assert total == 1
    assert rows[0][1] == "Alpha"
    assert captured["username_query"] == "alp"


