from unittest.mock import MagicMock
from uuid import uuid4

from app.crud import ranking as crud_ranking
from app.models.ranking import Ranking


def _build_query_mock():
    query = MagicMock()
    query.join.return_value = query
    query.filter.return_value = query
    query.order_by.return_value = query
    query.offset.return_value = query
    query.limit.return_value = query
    return query


def test_get_or_create_ranking_returns_existing():
    db = MagicMock()
    existing = Ranking(user_id=uuid4())
    db.query.return_value.filter.return_value.first.return_value = existing

    result = crud_ranking.get_or_create_ranking(db, existing.user_id)

    assert result is existing
    db.add.assert_not_called()
    db.commit.assert_not_called()


def test_get_or_create_ranking_creates_new():
    db = MagicMock()
    db.query.return_value.filter.return_value.first.return_value = None
    user_id = uuid4()

    result = crud_ranking.get_or_create_ranking(db, user_id)

    assert isinstance(result, Ranking)
    assert result.user_id == user_id
    db.add.assert_called_once_with(result)
    db.commit.assert_called_once_with()
    db.refresh.assert_called_once_with(result)


def test_save_rankings_adds_commits_and_refreshes_all():
    db = MagicMock()
    r1 = Ranking(user_id=uuid4())
    r2 = Ranking(user_id=uuid4())

    crud_ranking.save_rankings(db, r1, r2)

    assert db.add.call_count == 2
    db.add.assert_any_call(r1)
    db.add.assert_any_call(r2)
    db.commit.assert_called_once_with()
    assert db.refresh.call_count == 2


def test_list_leaderboard_page_with_username_filter_applies_query_and_pagination():
    db = MagicMock()
    query = _build_query_mock()
    expected = [(Ranking(user_id=uuid4()), "Alpha")]
    query.all.return_value = expected
    db.query.return_value = query

    result = crud_ranking.list_leaderboard_page(
        db,
        page=2,
        page_size=50,
        username_query="alp",
    )

    assert result == expected
    query.filter.assert_called_once()
    query.offset.assert_called_once_with(50)
    query.limit.assert_called_once_with(50)


def test_count_rankings_with_filter_uses_base_query_count(monkeypatch):
    db = MagicMock()
    query = MagicMock()
    query.count.return_value = 7

    def fake_base_query(inner_db, username_query=None):
        assert inner_db is db
        assert username_query == "br"
        return query

    monkeypatch.setattr(crud_ranking, "_leaderboard_base_query", fake_base_query)

    result = crud_ranking.count_rankings(db, username_query="br")

    assert result == 7
    query.count.assert_called_once_with()


def test_leaderboard_tiebreak_values_for_losses_zero_uses_wins():
    ranking = Ranking(user_id=uuid4(), elo_rating=1111, wins=9, losses=0, total_matches=9)

    values = crud_ranking.leaderboard_tiebreak_values(ranking)

    assert values[0] == 1111
    assert values[1] == 9


def test_leaderboard_tiebreak_values_for_losses_nonzero_uses_ratio():
    ranking = Ranking(user_id=uuid4(), elo_rating=1111, wins=9, losses=3, total_matches=12)

    values = crud_ranking.leaderboard_tiebreak_values(ranking)

    assert values[1] == 3

