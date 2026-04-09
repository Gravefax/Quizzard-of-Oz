'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { fetchLeaderboard } from '@/app/api/ranking';
import type { LeaderboardEntry, LeaderboardResponse } from '@/app/models/Leaderboard';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE ?? '/api';

async function searchLeaderboardByUsername(
  username: string,
  page = 1,
): Promise<LeaderboardResponse> {
  const params = new URLSearchParams({ username, page: String(page) });
  const res = await fetch(`${API_BASE_URL}/ranking/leaderboard/search?${params.toString()}`, {
    method: 'GET',
    credentials: 'include',
  });

  if (!res.ok) {
    throw new Error(`LEADERBOARD_SEARCH_FAILED_${res.status}`);
  }

  return (await res.json()) as LeaderboardResponse;
}

export default function LeaderboardPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 250);

    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let cancelled = false;

    async function loadLeaderboard() {
      setLoading(true);
      setError(null);
      try {
        const data = debouncedSearch
          ? await searchLeaderboardByUsername(debouncedSearch, page)
          : await fetchLeaderboard(page);
        if (cancelled) {
          return;
        }
        setEntries(data.entries);
        setTotalPlayers(data.total_players);
        setPageSize(data.page_size);
      } catch {
        if (!cancelled) {
          setError('Leaderboard konnte nicht geladen werden.');
          setEntries([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadLeaderboard();

    return () => {
      cancelled = true;
    };
  }, [page, debouncedSearch]);

  const totalPages = Math.max(1, Math.ceil(totalPlayers / pageSize));

  return (
    <div className="min-h-[calc(100vh-73px)] px-4 py-8 md:px-8">
      <div className="mx-auto w-full max-w-5xl">
        <button
          className="mb-6 rounded-md border border-cyan-500/30 px-4 py-2 text-sm text-cyan-200/80 transition hover:border-cyan-400/70 hover:bg-cyan-500/10"
          onClick={() => router.push('/')}
        >
          {'<- Zurueck'}
        </button>

        <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-cyan-500/25 bg-slate-900/70 p-5 backdrop-blur md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-wide text-cyan-100">Leaderboard</h1>
            <p className="mt-2 text-sm text-cyan-200/65">Seite {page} von {totalPages} · {totalPlayers} Spieler insgesamt</p>
          </div>

          <div className="w-full md:w-72">
            <label className="mb-1 block text-xs uppercase tracking-wide text-cyan-200/65" htmlFor="search-user">
              Suche nach Benutzername
            </label>
            <input
              id="search-user"
              type="text"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="z. B. QuizMaster"
              className="w-full rounded-md border border-cyan-500/25 bg-slate-950/60 px-3 py-2 text-sm text-cyan-100 outline-none transition focus:border-cyan-300/80"
            />
            <p className="mt-1 text-xs text-cyan-200/45">Sucht serverseitig im gesamten Leaderboard.</p>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-cyan-500/20 bg-slate-900/65">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-cyan-900/30 text-cyan-100">
              <tr>
                <th className="px-4 py-3">Rang</th>
                <th className="px-4 py-3">Spieler</th>
                <th className="px-4 py-3">ELO</th>
                <th className="px-4 py-3">Wins</th>
                <th className="px-4 py-3">Losses</th>
                <th className="px-4 py-3">Matches</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-cyan-100/70">Lade Leaderboard ...</td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-red-200/90">{error}</td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-cyan-100/70">Keine Spieler gefunden.</td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr key={entry.user_id} className="border-t border-cyan-500/10 text-cyan-50/95">
                    <td className="px-4 py-3">#{entry.rank}</td>
                    <td className="px-4 py-3">{entry.username}</td>
                    <td className="px-4 py-3 font-semibold text-cyan-200">{entry.elo_rating}</td>
                    <td className="px-4 py-3">{entry.wins}</td>
                    <td className="px-4 py-3">{entry.losses}</td>
                    <td className="px-4 py-3">{entry.total_matches}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <button
            className="rounded-md border border-cyan-500/30 px-4 py-2 text-sm text-cyan-200/80 transition hover:border-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            disabled={page <= 1 || loading}
          >
            Vorherige Seite
          </button>

          <span className="text-sm text-cyan-200/70">Seite {page}</span>

          <button
            className="rounded-md border border-cyan-500/30 px-4 py-2 text-sm text-cyan-200/80 transition hover:border-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={page >= totalPages || loading}
          >
            Naechste Seite
          </button>
        </div>
      </div>
    </div>
  );
}



