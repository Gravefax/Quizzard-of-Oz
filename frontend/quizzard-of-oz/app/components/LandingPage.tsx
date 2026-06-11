'use client';

import {JSX, useEffect, useState} from 'react';
import { useRouter } from 'next/navigation';
import { fetchLeaderboard } from '@/app/lib/api/ranking';
import type { LeaderboardEntry } from '@/app/models/Leaderboard';
import styles from './LandingPage.module.css';

type ColorType = 'cyan' | 'fire' | 'gold';

const FLOAT_COLORS: Record<ColorType, (opacity: number) => string> = {
  cyan: (o) => `rgba(0, 212, 255, ${o})`,
  fire: (o) => `rgba(255, 60, 20, ${o})`,
  gold: (o) => `rgba(255, 200, 0, ${o})`,
};

// Rising floating elements — question marks, lightning, swords
const FLOAT_DATA: Array<{ id: string; char: string; size: string; left: string; type: ColorType; path: number; dur: number; delay: number }> = [
  { id: 'f-0',  char: '?',  size: '9rem',   left: '3%',  type: 'cyan', path: 0, dur: 11, delay: 0    },
  { id: 'f-1',  char: '?',  size: '4rem',   left: '14%', type: 'cyan', path: 2, dur: 9,  delay: 0.5  },
  { id: 'f-2',  char: '⚡', size: '5rem',   left: '22%', type: 'gold', path: 1, dur: 14, delay: 1.2  },
  { id: 'f-3',  char: '⚔', size: '4.5rem', left: '35%', type: 'fire', path: 3, dur: 10, delay: 0.3  },
  { id: 'f-4',  char: '?',  size: '8rem',   left: '47%', type: 'cyan', path: 4, dur: 12, delay: 1.8  },
  { id: 'f-5',  char: '⚡', size: '3rem',   left: '57%', type: 'gold', path: 0, dur: 8,  delay: 0.8  },
  { id: 'f-6',  char: '⚔', size: '6rem',   left: '66%', type: 'fire', path: 2, dur: 13, delay: 0.2  },
  { id: 'f-7',  char: '?',  size: '5rem',   left: '75%', type: 'cyan', path: 1, dur: 9,  delay: 0.4  },
  { id: 'f-8',  char: '⚡', size: '4rem',   left: '83%', type: 'gold', path: 3, dur: 11, delay: 1.5  },
  { id: 'f-9',  char: '?',  size: '3.5rem', left: '91%', type: 'cyan', path: 4, dur: 10, delay: 0.1  },
  { id: 'f-10', char: '⚔', size: '7rem',   left: '41%', type: 'fire', path: 1, dur: 13, delay: 2.5  },
  { id: 'f-11', char: '⚡', size: '3rem',   left: '28%', type: 'gold', path: 3, dur: 8,  delay: 1    },
];

// Large ambient background elements
const AMB_DATA: Array<{ id: string; char: string; size: string; top: string; left: string; type: ColorType; anim: number; dur: number; delay: number; opacity: number }> = [
  { id: 'a-0', char: '?',  size: '18rem', top: '8%',  left: '4%',  type: 'cyan', anim: 0, dur: 9,  delay: 0,   opacity: 0.05 },
  { id: 'a-1', char: '⚔', size: '8rem',  top: '20%', left: '88%', type: 'fire', anim: 1, dur: 7,  delay: 1.2, opacity: 0.07 },
  { id: 'a-2', char: '?',  size: '24rem', top: '55%', left: '1%',  type: 'cyan', anim: 2, dur: 11, delay: 0.5, opacity: 0.04 },
  { id: 'a-3', char: '⚔', size: '10rem', top: '72%', left: '82%', type: 'fire', anim: 0, dur: 8,  delay: 2,   opacity: 0.06 },
  { id: 'a-4', char: '⚡', size: '12rem', top: '40%', left: '78%', type: 'gold', anim: 1, dur: 10, delay: 0.8, opacity: 0.05 },
  { id: 'a-5', char: '⚡', size: '5rem',  top: '65%', left: '45%', type: 'gold', anim: 2, dur: 6,  delay: 1.5, opacity: 0.09 },
  { id: 'a-6', char: '?',  size: '16rem', top: '12%', left: '56%', type: 'cyan', anim: 0, dur: 12, delay: 3,   opacity: 0.04 },
  { id: 'a-7', char: '⚔', size: '7rem',  top: '48%', left: '22%', type: 'fire', anim: 1, dur: 8,  delay: 0.3, opacity: 0.07 },
];

export default function LandingPage() {
  const router = useRouter();
  const [topPlayers, setTopPlayers] = useState<LeaderboardEntry[]>([]);
  const [topLoading, setTopLoading] = useState(true);

  let topPlayersContent: JSX.Element;
  if (topLoading) {
    topPlayersContent = (
      <p style={{ color: 'rgba(var(--oz-text-secondary-rgb),0.6)', fontSize: '0.85rem' }}>Lade Rangliste ...</p>
    );
  } else if (topPlayers.length === 0) {
    topPlayersContent = (
      <p style={{ color: 'rgba(var(--oz-text-secondary-rgb),0.6)', fontSize: '0.85rem' }}>Noch keine Eintraege verfuegbar.</p>
    );
  } else {
    topPlayersContent = (
      <ol className="space-y-1.5">
        {topPlayers.map((player) => (
          <li key={player.user_id} className="flex items-center justify-between rounded-md px-2 py-1" style={{ background: 'rgba(var(--oz-depth-bg-rgb),0.1)' }}>
            <span style={{ color: 'rgba(var(--oz-text-bright-rgb),0.9)', fontSize: '0.86rem' }}>#{player.rank} {player.username}</span>
            <span style={{ color: 'rgba(0,212,255,0.88)', fontWeight: 700, fontSize: '0.85rem' }}>{player.elo_rating}</span>
          </li>
        ))}
      </ol>
    );
  }

  function handleRanked() {
    router.push('/ranked-modus');
  }

  function handleUebung() {
    router.push('/trainings-modus');
  }

  useEffect(() => {
    let cancelled = false;

    async function loadTopPlayers() {
      try {
        const data = await fetchLeaderboard(1);
        if (!cancelled) {
          setTopPlayers(data.entries.slice(0, 3));
        }
      } catch {
        if (!cancelled) {
          setTopPlayers([]);
        }
      } finally {
        if (!cancelled) {
          setTopLoading(false);
        }
      }
    }

    void loadTopPlayers();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex-1 flex flex-col relative overflow-hidden">

      {/* ── Background layer ── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">

        {/* Subtle dot/grid pattern */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(rgba(0,212,255,0.032) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0,212,255,0.032) 1px, transparent 1px)
            `,
            backgroundSize: '64px 64px',
          }}
        />

        {/* Horizontal scan line */}
        <div
          className="absolute left-0 right-0"
          style={{
            height: '1px',
            background: 'linear-gradient(90deg, transparent 0%, rgba(0,212,255,0.18) 40%, rgba(0,212,255,0.18) 60%, transparent 100%)',
            animation: 'scanDown 9s linear 0.5s infinite',
          }}
        />

        {/* Cyan glow orb — left */}
        <div
          className="absolute"
          style={{
            width: '700px', height: '700px',
            top: '10%', left: '-15%',
            background: 'radial-gradient(circle, rgba(0,212,255,0.065) 0%, transparent 65%)',
            animation: 'ambFloat0 14s ease-in-out infinite',
          }}
        />

        {/* Fire glow orb — right */}
        <div
          className="absolute"
          style={{
            width: '560px', height: '560px',
            top: '5%', right: '-10%',
            background: 'radial-gradient(circle, rgba(255,60,20,0.06) 0%, transparent 65%)',
            animation: 'ambFloat1 12s ease-in-out 1.5s infinite',
          }}
        />

        {/* Center depth orb — subtle vignette, adapts to theme */}
        <div
          className="absolute rounded-full"
          style={{
            width: '600px', height: '600px',
            top: '50%', left: '50%',
            background: 'radial-gradient(circle, rgba(0,212,255,0.03) 0%, rgba(var(--oz-depth-bg-rgb),0.28) 55%, transparent 100%)',
            animation: 'orbPulse 7s ease-in-out infinite',
          }}
        />

        {/* Ambient large background chars */}
        {AMB_DATA.map((item) => (
          <div
            key={item.id}
            className="absolute font-bold select-none"
            style={{
              fontSize: item.size,
              top: item.top,
              left: item.left,
              color: FLOAT_COLORS[item.type](item.opacity),
              lineHeight: 1,
              animation: `ambFloat${item.anim} ${item.dur}s ease-in-out ${item.delay}s infinite`,
            }}
          >
            {item.char}
          </div>
        ))}

        {/* Rising floating chars */}
        {FLOAT_DATA.map((item) => (
          <div
            key={item.id}
            className="absolute font-bold select-none"
            style={{
              fontSize: item.size,
              left: item.left,
              color: FLOAT_COLORS[item.type](0.1),
              lineHeight: 1,
              animation: `floatPath${item.path} ${item.dur}s ease-in-out ${item.delay}s infinite`,
              animationFillMode: 'backwards',
            }}
          >
            {item.char}
          </div>
        ))}
      </div>

      {/* ── Main content ── */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-8">

        {/* Title */}
        <div className="text-center mb-1">
          <h1 className="arena-title text-[5.5rem] md:text-[9rem]">
            Quizzard of Oz
          </h1>
          <span className={styles['neon-line']} style={{ width: '200px' }} />
          <p
            className="text-sm md:text-base mt-1 mb-6"
            style={{ color: 'rgba(var(--oz-text-secondary-rgb),0.75)', letterSpacing: '0.04em' }}
          >
            Beweise dein Wissen. Besiege deine Rivalen.
          </p>
        </div>

        {/* ── Top 3 preview ── */}
        <div className={`w-full max-w-sm mb-4 ${styles['leaderboard-card']} px-4 py-3`}>
          <div className="flex items-center justify-between mb-2">
            <span style={{ color: 'rgba(var(--oz-text-secondary-rgb),0.92)', fontWeight: 700, letterSpacing: '0.04em' }}>Top 3</span>
            <span style={{ color: 'rgba(var(--oz-text-secondary-rgb),0.55)', fontSize: '0.7rem', letterSpacing: '0.08em' }}>LIVE LEADERBOARD</span>
          </div>
          {topPlayersContent}
        </div>

        {/* ── Action buttons ── */}
        <div className="flex flex-col items-center gap-4 w-full max-w-sm">

          {/* RANKED BATTLE — fire CTA */}
          <button
            className={`${styles['battle-btn']} w-full text-center`}
            style={{ padding: '22px 24px 20px' }}
            onClick={handleRanked}
          >
            {/* Icon circle */}
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '52px', height: '52px', borderRadius: '50%', background: 'rgba(255,60,20,0.14)', border: '1px solid rgba(255,90,50,0.4)', marginBottom: '12px', fontSize: '1.4rem', filter: 'drop-shadow(0 0 14px rgba(255,80,40,0.65))' }}>
              ⚔
            </div>
            {/* Title */}
            <div
              style={{
                fontFamily: "'Bebas Neue', Impact, 'Arial Black', sans-serif",
                fontSize: '1.75rem',
                letterSpacing: '0.16em',
                color: 'rgba(var(--oz-fire-rgb),0.9)',
                lineHeight: 1,
                marginBottom: '6px',
              }}
            >
              Ranked Battle
            </div>
            {/* Tagline */}
            <div style={{ color: 'rgba(255,170,120,0.65)', fontSize: '0.7rem', letterSpacing: '0.12em', marginBottom: '14px' }}>
              COMPETE · RANK · DOMINATE
            </div>
            {/* Login badge */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '3px 10px', borderRadius: '999px', background: 'rgba(255,60,20,0.1)', border: '1px solid rgba(255,80,40,0.3)', color: 'rgba(255,100,50,0.7)', fontSize: '0.65rem', letterSpacing: '0.1em' }}>
              <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'rgba(255,100,50,0.7)', display: 'inline-block' }} />{"Login erforderlich"}
            </div>
          </button>

          {/* ÜBUNG */}
          <button
            className={`${styles['gold-card']} w-full`}
            style={{ padding: '14px 20px' }}
            onClick={handleUebung}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              {/* Icon circle */}
              <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '42px', height: '42px', borderRadius: '50%', background: 'rgba(255,200,0,0.1)', border: '1px solid rgba(255,200,0,0.3)', fontSize: '1.1rem', filter: 'drop-shadow(0 0 10px rgba(255,200,0,0.45))' }}>
                🎯
              </div>
              {/* Text */}
              <div style={{ textAlign: 'left', flex: 1 }}>
                <div style={{ color: 'rgba(200,140,0,0.95)', fontSize: '0.95rem', fontWeight: 600, letterSpacing: '0.04em', marginBottom: '2px' }}>
                  Übung
                </div>
                <div style={{ color: 'rgba(var(--oz-text-secondary-rgb),0.55)', fontSize: '0.7rem', letterSpacing: '0.08em' }}>
                  Trainingsmodus · Kein Login nötig
                </div>
              </div>
              {/* Arrow */}
              <div style={{ flexShrink: 0, color: 'rgba(255,200,0,0.5)', fontSize: '1rem' }}>›</div>
            </div>
          </button>

        </div>
      </main>
    </div>
  );
}
