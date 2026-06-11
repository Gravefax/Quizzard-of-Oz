'use client';

import {JSX, useEffect, useState} from 'react';
import { useRouter } from 'next/navigation';

import { fetchLeaderboard, searchLeaderboardByUsername } from '@/app/lib/api/ranking';
import type { LeaderboardEntry } from '@/app/models/Leaderboard';
import lbStyles from './leaderboard.module.css';

const RANK_MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

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

  let tableBodyContent: JSX.Element | JSX.Element[];
  if (loading) {
    tableBodyContent = (
      <tr>
        <td colSpan={6} className="px-4 py-10 text-center" style={{ color: 'rgba(var(--oz-text-secondary-rgb),0.65)' }}>
          Lade Leaderboard …
        </td>
      </tr>
    );
  } else if (error) {
    tableBodyContent = (
      <tr>
        <td colSpan={6} className="px-4 py-10 text-center" style={{ color: '#fca5a5' }}>{error}</td>
      </tr>
    );
  } else if (entries.length === 0) {
    tableBodyContent = (
      <tr>
        <td colSpan={6} className="px-4 py-10 text-center" style={{ color: 'rgba(var(--oz-text-secondary-rgb),0.55)' }}>
          Keine Spieler gefunden.
        </td>
      </tr>
    );
  } else {
    tableBodyContent = entries.map((entry) => {
      const isTop3 = entry.rank <= 3;
      const rankColor = entry.rank === 1
        ? 'rgba(var(--oz-gold-title-rgb),0.95)'
        : entry.rank === 2
          ? 'rgba(var(--oz-text-secondary-rgb),0.85)'
          : entry.rank === 3
            ? 'rgba(200,140,80,0.9)'
            : 'rgba(var(--oz-text-secondary-rgb),0.6)';

      return (
        <tr
          key={entry.user_id}
          style={{
            borderTop: '1px solid rgba(255,200,0,0.07)',
            background: isTop3 ? 'rgba(255,200,0,0.025)' : 'transparent',
            transition: 'background 0.15s ease',
          }}
        >
          <td className="px-4 py-3 font-semibold" style={{ color: rankColor, fontSize: '0.9rem' }}>
            {RANK_MEDAL[entry.rank] ?? `#${entry.rank}`}
          </td>
          <td className="px-4 py-3" style={{ color: 'rgba(var(--oz-text-bright-rgb),0.9)' }}>{entry.username}</td>
          <td className="px-4 py-3 font-bold" style={{ color: 'rgba(var(--oz-gold-title-rgb),0.95)' }}>{entry.elo_rating}</td>
          <td className="px-4 py-3" style={{ color: 'rgba(52,211,153,0.8)' }}>{entry.wins}</td>
          <td className="px-4 py-3" style={{ color: 'rgba(248,113,113,0.8)' }}>{entry.losses}</td>
          <td className="px-4 py-3" style={{ color: 'rgba(var(--oz-text-secondary-rgb),0.65)' }}>{entry.total_matches}</td>
        </tr>
      );
    });
  }

  return (
    <div className="flex-1 flex flex-col relative overflow-hidden">

      {/* ── Background layer ── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Dot grid */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,200,0,0.022) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,200,0,0.022) 1px, transparent 1px)
            `,
            backgroundSize: '64px 64px',
          }}
        />
        {/* Scan line */}
        <div
          className="absolute left-0 right-0"
          style={{
            height: '1px',
            background: 'linear-gradient(90deg, transparent 0%, rgba(255,200,0,0.12) 40%, rgba(255,200,0,0.12) 60%, transparent 100%)',
            animation: 'scanDown 10s linear 0.5s infinite',
          }}
        />
        {/* Gold orb — left */}
        <div
          className="absolute"
          style={{
            width: '650px', height: '650px',
            top: '0%', left: '-20%',
            background: 'radial-gradient(circle, rgba(255,200,0,0.055) 0%, transparent 65%)',
            animation: 'ambFloat0 15s ease-in-out infinite',
          }}
        />
        {/* Cyan orb — right */}
        <div
          className="absolute"
          style={{
            width: '520px', height: '520px',
            top: '10%', right: '-14%',
            background: 'radial-gradient(circle, rgba(0,212,255,0.05) 0%, transparent 65%)',
            animation: 'ambFloat1 13s ease-in-out 1.5s infinite',
          }}
        />
        {/* Center depth orb — adapts to theme */}
        <div
          className="absolute"
          style={{
            width: '500px', height: '500px',
            top: '50%', left: '50%',
            background: 'radial-gradient(circle, rgba(255,200,0,0.03) 0%, rgba(var(--oz-depth-bg-rgb),0.25) 55%, transparent 100%)',
            animation: 'orbPulse 8s ease-in-out infinite',
          }}
        />
      </div>

      {/* ── Content ── */}
      <div className="relative z-10 flex-1 px-4 py-8 md:px-8">
        <div className="mx-auto w-full max-w-5xl">

          {/* Back button */}
          <button
            className="back-btn mb-6 px-4 py-2 text-sm flex items-center gap-1.5"
            onClick={() => router.push('/')}
          >
            ← Zurück
          </button>

          {/* Header card */}
          <div className={`${lbStyles['lb-header-card']} mb-6 p-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between`}>
            <div>
              <h1 className="arena-title" style={{ fontSize: '3.5rem' }}>Leaderboard</h1>
              <p
                className="mt-1 text-sm"
                style={{ color: 'rgba(var(--oz-text-secondary-rgb),0.65)', letterSpacing: '0.04em' }}
              >
                Seite {page} von {totalPages} · {totalPlayers} Spieler insgesamt
              </p>
            </div>

            <div className="w-full md:w-72">
              <label
                className="mb-1.5 block text-xs uppercase"
                htmlFor="search-user"
                style={{ color: 'rgba(var(--oz-gold-title-rgb),0.75)', letterSpacing: '0.1em' }}
              >
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
                className={lbStyles['lb-search-input']}
              />
              <p
                className="mt-1 text-xs"
                style={{ color: 'rgba(var(--oz-text-secondary-rgb),0.45)' }}
              >
                Sucht serverseitig im gesamten Leaderboard.
              </p>
            </div>
          </div>

          {/* Table */}
          <div className={lbStyles['lb-table-card']}>
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr style={{ background: 'rgba(255,200,0,0.06)', borderBottom: '1px solid rgba(255,200,0,0.14)' }}>
                  <th className="px-4 py-3 text-xs uppercase" style={{ color: 'rgba(var(--oz-gold-title-rgb),0.85)', letterSpacing: '0.1em', fontWeight: 600 }}>Rang</th>
                  <th className="px-4 py-3 text-xs uppercase" style={{ color: 'rgba(var(--oz-gold-title-rgb),0.85)', letterSpacing: '0.1em', fontWeight: 600 }}>Spieler</th>
                  <th className="px-4 py-3 text-xs uppercase" style={{ color: 'rgba(var(--oz-gold-title-rgb),0.85)', letterSpacing: '0.1em', fontWeight: 600 }}>ELO</th>
                  <th className="px-4 py-3 text-xs uppercase" style={{ color: 'rgba(52,211,153,0.65)', letterSpacing: '0.1em', fontWeight: 600 }}>Wins</th>
                  <th className="px-4 py-3 text-xs uppercase" style={{ color: 'rgba(248,113,113,0.65)', letterSpacing: '0.1em', fontWeight: 600 }}>Losses</th>
                  <th className="px-4 py-3 text-xs uppercase" style={{ color: 'rgba(var(--oz-text-secondary-rgb),0.55)', letterSpacing: '0.1em', fontWeight: 600 }}>Matches</th>
                </tr>
              </thead>
              <tbody>{tableBodyContent}</tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="mt-6 flex items-center justify-between">
            <button
              className={lbStyles['page-btn']}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page <= 1 || loading}
            >
              ← Vorherige
            </button>

            <span
              className="text-sm"
              style={{ color: 'rgba(var(--oz-gold-title-rgb),0.85)', fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.08em', fontSize: '1rem' }}
            >
              Seite {page} / {totalPages}
            </span>

            <button
              className={lbStyles['page-btn']}
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page >= totalPages || loading}
            >
              Nächste →
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
