'use client';

import {JSX, useEffect, useState} from 'react';
import { useRouter } from 'next/navigation';
import { fetchLeaderboard } from '@/app/lib/api/ranking';
import type { LeaderboardEntry } from '@/app/models/Leaderboard';

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
      <p style={{ color: 'rgba(140,200,230,0.6)', fontSize: '0.85rem' }}>Lade Rangliste ...</p>
    );
  } else if (topPlayers.length === 0) {
    topPlayersContent = (
      <p style={{ color: 'rgba(140,200,230,0.6)', fontSize: '0.85rem' }}>Noch keine Eintraege verfuegbar.</p>
    );
  } else {
    topPlayersContent = (
      <ol className="space-y-1.5">
        {topPlayers.map((player) => (
          <li key={player.user_id} className="flex items-center justify-between rounded-md px-2 py-1" style={{ background: 'rgba(0,0,0,0.16)' }}>
            <span style={{ color: 'rgba(220,245,255,0.9)', fontSize: '0.86rem' }}>#{player.rank} {player.username}</span>
            <span style={{ color: 'rgba(110,215,255,0.88)', fontWeight: 700, fontSize: '0.85rem' }}>{player.elo_rating}</span>
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
    <>
      <style>{`
        /* ── Float paths ── */
        @keyframes floatPath0 {
          0%   { transform: translateY(105vh) translateX(0px)   rotate(-3deg); opacity: 0; }
          8%   { opacity: 1; }
          30%  { transform: translateY(72vh)  translateX(22px)  rotate(4deg);  }
          60%  { transform: translateY(36vh)  translateX(-10px) rotate(-2deg); }
          92%  { opacity: 0.7; }
          100% { transform: translateY(-15vh) translateX(28px)  rotate(6deg);  opacity: 0; }
        }
        @keyframes floatPath1 {
          0%   { transform: translateY(105vh) translateX(0px)   rotate(5deg);  opacity: 0; }
          8%   { opacity: 1; }
          25%  { transform: translateY(76vh)  translateX(-32px) rotate(-4deg); }
          55%  { transform: translateY(40vh)  translateX(-18px) rotate(3deg);  }
          92%  { opacity: 0.7; }
          100% { transform: translateY(-15vh) translateX(-38px) rotate(-6deg); opacity: 0; }
        }
        @keyframes floatPath2 {
          0%   { transform: translateY(105vh) translateX(0px)   rotate(0deg);  opacity: 0; }
          8%   { opacity: 1; }
          20%  { transform: translateY(82vh)  translateX(42px)  rotate(-5deg); }
          50%  { transform: translateY(46vh)  translateX(58px)  rotate(8deg);  }
          80%  { transform: translateY(16vh)  translateX(32px)  rotate(-3deg); }
          92%  { opacity: 0.7; }
          100% { transform: translateY(-15vh) translateX(48px)  rotate(5deg);  opacity: 0; }
        }
        @keyframes floatPath3 {
          0%   { transform: translateY(105vh) translateX(0px)   rotate(-6deg); opacity: 0; }
          8%   { opacity: 1; }
          35%  { transform: translateY(66vh)  translateX(-52px) rotate(3deg);  }
          70%  { transform: translateY(26vh)  translateX(-36px) rotate(-4deg); }
          92%  { opacity: 0.7; }
          100% { transform: translateY(-15vh) translateX(-58px) rotate(7deg);  opacity: 0; }
        }
        @keyframes floatPath4 {
          0%   { transform: translateY(105vh) translateX(0px)   rotate(2deg);  opacity: 0; }
          8%   { opacity: 1; }
          20%  { transform: translateY(82vh)  translateX(26px)  rotate(-3deg); }
          40%  { transform: translateY(60vh)  translateX(-22px) rotate(5deg);  }
          60%  { transform: translateY(38vh)  translateX(36px)  rotate(-2deg); }
          80%  { transform: translateY(18vh)  translateX(-14px) rotate(4deg);  }
          92%  { opacity: 0.7; }
          100% { transform: translateY(-15vh) translateX(22px)  rotate(-5deg); opacity: 0; }
        }

        /* ── Ambient float ── */
        @keyframes ambFloat0 {
          0%,100% { transform: translateY(0px)   translateX(0px)   rotate(-4deg); }
          25%     { transform: translateY(-22px)  translateX(14px)  rotate(3deg);  }
          50%     { transform: translateY(-8px)   translateX(28px)  rotate(-2deg); }
          75%     { transform: translateY(-30px)  translateX(10px)  rotate(5deg);  }
        }
        @keyframes ambFloat1 {
          0%,100% { transform: translateY(0px)   translateX(0px)   rotate(6deg);  }
          30%     { transform: translateY(-18px)  translateX(-20px) rotate(-3deg); }
          60%     { transform: translateY(-35px)  translateX(-8px)  rotate(4deg);  }
          80%     { transform: translateY(-12px)  translateX(-26px) rotate(-5deg); }
        }
        @keyframes ambFloat2 {
          0%,100% { transform: translateY(0px)   translateX(0px)   rotate(0deg);  }
          20%     { transform: translateY(-28px)  translateX(18px)  rotate(-6deg); }
          45%     { transform: translateY(-14px)  translateX(-12px) rotate(4deg);  }
          70%     { transform: translateY(-40px)  translateX(8px)   rotate(-2deg); }
        }

        /* ── Battle button fire pulse ── */
        @keyframes battlePulse {
          0%,100% {
            box-shadow: 0 0 24px rgba(255,60,20,0.28), 0 0 65px rgba(255,60,20,0.09), 0 6px 32px rgba(0,0,0,0.55);
            border-color: rgba(255,80,40,0.6);
          }
          50% {
            box-shadow: 0 0 48px rgba(255,60,20,0.58), 0 0 110px rgba(255,60,20,0.2), 0 6px 32px rgba(0,0,0,0.55);
            border-color: rgba(255,120,60,0.95);
          }
        }

        /* ── Title neon glow ── */
        @keyframes titleGlow {
          0%,100% { text-shadow: 0 0 14px rgba(0,212,255,0.14), 0 0 28px rgba(0,212,255,0.06); }
          50%     { text-shadow: 0 0 20px rgba(0,212,255,0.26), 0 0 44px rgba(0,212,255,0.11), 0 0 70px rgba(0,212,255,0.05); }
        }

        /* ── Orb pulse ── */
        @keyframes orbPulse {
          0%,100% { opacity: 0.9; transform: translate(-50%,-50%) scale(1);    }
          50%     { opacity: 1;   transform: translate(-50%,-50%) scale(1.07); }
        }

        /* ── Badge flash ── */
        @keyframes badgeFlash {
          0%,100% { opacity: 0.85; }
          50%     { opacity: 1; filter: brightness(1.25); }
        }

        /* ── Scan line ── */
        @keyframes scanDown {
          0%   { top: -5%; opacity: 0; }
          4%   { opacity: 1; }
          96%  { opacity: 0.55; }
          100% { top: 105%; opacity: 0; }
        }

        /* ── Underline reveal ── */
        @keyframes lineReveal {
          0%   { width: 0;     opacity: 0; }
          100% { width: 200px; opacity: 1; }
        }

        /* ── Button classes ── */
        .battle-btn {
          background: linear-gradient(160deg, rgba(255,55,15,0.13) 0%, rgba(100,12,0,0.08) 60%, rgba(20,4,0,0.04) 100%);
          border: 1px solid rgba(255,75,35,0.5);
          border-radius: 1.25rem;
          position: relative;
          overflow: hidden;
          animation: battlePulse 2.8s ease-in-out infinite;
          transition: transform 0.22s ease, background 0.22s ease;
        }
        .battle-btn::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 3px;
          background: linear-gradient(90deg, transparent 0%, rgba(255,90,40,0.85) 30%, rgba(255,140,80,1) 50%, rgba(255,90,40,0.85) 70%, transparent 100%);
        }
        .battle-btn::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(to bottom, rgba(255,70,30,0.07) 0%, transparent 45%);
          border-radius: 1.25rem;
          pointer-events: none;
        }
        .battle-btn:hover {
          background: linear-gradient(160deg, rgba(255,55,15,0.22) 0%, rgba(140,20,5,0.14) 60%, rgba(40,6,0,0.07) 100%);
          transform: translateY(-4px) scale(1.01);
        }

        .gold-card {
          background: linear-gradient(145deg, rgba(255,200,0,0.07) 0%, rgba(180,130,0,0.04) 100%);
          border: 1px solid rgba(255,200,0,0.28);
          border-radius: 1rem;
          position: relative;
          overflow: hidden;
          transition: background 0.22s ease, border-color 0.22s ease,
                      transform 0.22s ease, box-shadow 0.22s ease;
        }
        .gold-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, rgba(255,200,0,0.75), transparent);
        }
        .gold-card:hover {
          background: linear-gradient(145deg, rgba(255,200,0,0.13) 0%, rgba(200,150,0,0.08) 100%);
          border-color: rgba(255,200,0,0.6);
          transform: translateY(-3px);
          box-shadow: 0 16px 40px rgba(255,200,0,0.1);
        }

        .leaderboard-card {
          background: linear-gradient(145deg, rgba(0,212,255,0.08) 0%, rgba(0,80,120,0.08) 100%);
          border: 1px solid rgba(0,212,255,0.3);
          border-radius: 1rem;
        }

        /* ── Typography ── */
        .arena-title {
          font-family: 'Bebas Neue', 'Impact', 'Arial Black', sans-serif;
          letter-spacing: 0.06em;
          color: #EAF5FF;
          animation: titleGlow 4s ease-in-out infinite;
          line-height: 0.9;
        }

        .neon-line {
          display: block;
          height: 2px;
          background: linear-gradient(90deg, transparent, rgba(0,212,255,0.9), transparent);
          animation: lineReveal 0.9s cubic-bezier(0.22,1,0.36,1) 0.2s both;
          margin: 12px auto 18px;
        }
      `}</style>

      <div className="min-h-screen relative overflow-hidden">

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

          {/* Center depth orb */}
          <div
            className="absolute rounded-full"
            style={{
              width: '600px', height: '600px',
              top: '50%', left: '50%',
              background: 'radial-gradient(circle, rgba(0,212,255,0.04) 0%, rgba(0,18,40,0.5) 50%, transparent 100%)',
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
        <main className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-73px)] px-4">


          {/* Title */}
          <div className="text-center mb-1">
            <h1 className="arena-title text-[5.5rem] md:text-[9rem]">
              Quizzard of Oz
            </h1>
            <span className="neon-line" style={{ width: '200px' }} />
            <p
              className="text-sm md:text-base mt-1 mb-6" // 'mb-6' für Abstand nach unten
              style={{ color: 'rgba(140, 200, 230, 0.52)', letterSpacing: '0.04em' }}
            >
              Beweise dein Wissen. Besiege deine Rivalen.
            </p>
          </div>

          {/* ── Top 3 preview ── */}
          <div className="w-full max-w-sm mb-4 leaderboard-card px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <span style={{ color: 'rgba(185,230,250,0.92)', fontWeight: 700, letterSpacing: '0.04em' }}>Top 3</span>
              <span style={{ color: 'rgba(120,190,220,0.7)', fontSize: '0.7rem', letterSpacing: '0.08em' }}>LIVE LEADERBOARD</span>
            </div>
            {topPlayersContent}
          </div>

          {/* ── Action buttons ── */}
          <div className="flex flex-col items-center gap-4 w-full max-w-sm">

            {/* RANKED BATTLE — fire CTA */}
            <button
              className="battle-btn w-full text-center"
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
                  color: '#FFD0B0',
                  lineHeight: 1,
                  marginBottom: '6px',
                }}
              >
                Ranked Battle
              </div>
              {/* Tagline */}
              <div style={{ color: 'rgba(255,170,120,0.58)', fontSize: '0.7rem', letterSpacing: '0.12em', marginBottom: '14px' }}>
                COMPETE · RANK · DOMINATE
              </div>
              {/* Login badge */}
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '3px 10px', borderRadius: '999px', background: 'rgba(255,60,20,0.1)', border: '1px solid rgba(255,80,40,0.3)', color: 'rgba(255,160,110,0.6)', fontSize: '0.65rem', letterSpacing: '0.1em' }}>
                <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'rgba(255,100,50,0.7)', display: 'inline-block' }} />{"Login erforderlich"}
              </div>
            </button>

            {/* ÜBUNG */}
            <button
              className="gold-card w-full"
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
                  <div style={{ color: 'rgba(255,228,140,0.92)', fontSize: '0.95rem', fontWeight: 600, letterSpacing: '0.04em', marginBottom: '2px' }}>
                    Übung
                  </div>
                  <div style={{ color: 'rgba(255,215,120,0.42)', fontSize: '0.7rem', letterSpacing: '0.08em' }}>
                    Trainingsmodus · Kein Login nötig
                  </div>
                </div>
                {/* Arrow */}
                <div style={{ flexShrink: 0, color: 'rgba(255,200,0,0.35)', fontSize: '1rem' }}>›</div>
              </div>
            </button>

          </div>
        </main>
      </div>
    </>
  );
}
