'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getWsUrl } from '@/app/lib/utils/wsUrl';

type QueueState = 'idle' | 'connecting' | 'searching' | 'matched' | 'error';

interface QueueProps {
  readonly ranked?: boolean;
}

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const s = (totalSeconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function Queue({ ranked = false }: QueueProps) {
  const router = useRouter();
  const [queueState, setQueueState] = useState<QueueState>('idle');
  const [queueSeconds, setQueueSeconds] = useState(0);
  const [matchId, setMatchId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const wsRef = useRef<WebSocket | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cancelledRef = useRef(false);
  const matchedRef = useRef(false);

  const accent = ranked
    ? { rgb: '255,60,20', dim: 'rgba(255,60,20,0.55)', muted: 'rgba(255,140,90,0.5)' }
    : { rgb: '0,212,255',  dim: 'rgba(0,212,255,0.55)',  muted: 'rgba(140,200,230,0.5)' };

  function startTimer() {
    setQueueSeconds(0);
    timerRef.current = setInterval(() => setQueueSeconds((s) => s + 1), 1000);
  }

  function stopTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function joinQueue() {
    cancelledRef.current = false;
    matchedRef.current = false;
    setQueueState('connecting');

    const ws = new WebSocket(getWsUrl('/battle/queue'));
    wsRef.current = ws;

    ws.onmessage = (event: MessageEvent) => {
      const data: { type: string; match_id?: string } = JSON.parse(event.data as string);

      if (data.type === 'queued') {
        setQueueState('searching');
        startTimer();
      } else if (data.type === 'matched' && data.match_id) {
        stopTimer();
        matchedRef.current = true;
        setMatchId(data.match_id);
        setQueueState('matched');
        setTimeout(() => router.push(`/battle/${data.match_id}`), 2200);
      }
    };

    ws.onclose = (event: CloseEvent) => {
      stopTimer();
      if (cancelledRef.current) return;
      if (matchedRef.current) return;

      if (event.code === 4001 || event.code === 4003) {
        setErrorMsg('Login erforderlich. Bitte melde dich an, um zu spielen.');
        setQueueState('error');
      } else if (event.code === 1006) {
        setErrorMsg('Verbindung zum Server fehlgeschlagen. Ist das Backend erreichbar?');
        setQueueState('error');
      } else {
        setQueueState('idle');
      }
    };
  }

  function cancelQueue() {
    cancelledRef.current = true;
    matchedRef.current = false;
    wsRef.current?.close();
    wsRef.current = null;
    stopTimer();
    setQueueState('idle');
  }

  useEffect(() => {
    return () => {
      cancelledRef.current = true;
      matchedRef.current = false;
      wsRef.current?.close();
      stopTimer();
    };
  }, []);

  const badgeColor = ranked ? 'rgba(255,80,40,0.8)' : 'rgba(0,212,255,0.8)';
  const badgeBorder = ranked ? 'rgba(255,60,20,0.28)' : 'rgba(0,212,255,0.25)';
  const badgeBg = ranked ? 'rgba(255,60,20,0.06)' : 'rgba(0,212,255,0.05)';
  const badgeLabel = ranked ? '⚔ Ranked Battle' : '⚡ Unranked Battle';

  const cornerSize = '28px';
  const cornerThick = '2px';
  const cornerColor = `rgba(${accent.rgb},0.28)`;

  return (
    <>
      <style>{`
        @keyframes radarRing {
          0%   { transform: scale(0.4); opacity: 0.75; }
          100% { transform: scale(2.4); opacity: 0; }
        }
        @keyframes spinSlow {
          to { transform: rotate(360deg); }
        }
        @keyframes matchReveal {
          0%   { opacity: 0; transform: translateY(16px) scale(0.95); }
          100% { opacity: 1; transform: translateY(0)    scale(1); }
        }
        @keyframes matchGlow {
          0%,100% { text-shadow: 0 0 20px rgba(255,210,0,0.45), 0 0 45px rgba(255,210,0,0.18); }
          50%     { text-shadow: 0 0 35px rgba(255,210,0,0.75), 0 0 80px rgba(255,210,0,0.3); }
        }
        @keyframes joinBtnPulse {
          0%,100% {
            box-shadow: 0 0 18px rgba(${accent.rgb},0.25), 0 0 48px rgba(${accent.rgb},0.08);
            border-color: rgba(${accent.rgb},0.52);
          }
          50% {
            box-shadow: 0 0 32px rgba(${accent.rgb},0.5), 0 0 80px rgba(${accent.rgb},0.18);
            border-color: rgba(${accent.rgb},0.92);
          }
        }
        .join-btn {
          background: rgba(${accent.rgb},0.07);
          border: 2px solid rgba(${accent.rgb},0.52);
          border-radius: 1rem;
          animation: joinBtnPulse 2.6s ease-in-out infinite;
          transition: transform 0.2s ease, background 0.2s ease;
        }
        .join-btn:hover {
          background: rgba(${accent.rgb},0.16);
          transform: translateY(-3px) scale(1.015);
        }
        .cancel-btn {
          background: rgba(255,60,20,0.06);
          border: 1px solid rgba(255,60,20,0.35);
          border-radius: 0.75rem;
          color: rgba(255,140,100,0.8);
          transition: background 0.2s ease, border-color 0.2s ease;
        }
        .cancel-btn:hover {
          background: rgba(255,60,20,0.14);
          border-color: rgba(255,80,40,0.7);
        }
        .back-btn {
          border: 1px solid rgba(0,212,255,0.16);
          border-radius: 0.625rem;
          color: rgba(140,200,230,0.5);
          transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
        }
        .back-btn:hover {
          background: rgba(0,212,255,0.07);
          border-color: rgba(0,212,255,0.38);
          color: rgba(160,215,240,0.85);
        }
        .player-card {
          border-radius: 1rem;
          overflow: hidden;
          position: relative;
        }
        .player-card-inner {
          background: rgba(${accent.rgb},0.04);
          border: 1px solid rgba(${accent.rgb},0.18);
          border-radius: 1rem;
          position: relative;
        }
        .player-card-inner::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 3px;
          background: linear-gradient(90deg, transparent, rgba(${accent.rgb},0.6), transparent);
          border-radius: 1rem 1rem 0 0;
        }
        .player-card-empty {
          background: rgba(255,255,255,0.015);
          border: 1px dashed rgba(${accent.rgb},0.16);
          border-radius: 1rem;
        }
        .match-reveal {
          animation: matchReveal 0.55s cubic-bezier(0.22,1,0.36,1) both;
        }
        .deco-line-h {
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(${accent.rgb},0.35), transparent);
        }
        .deco-dot {
          width: 4px; height: 4px;
          border-radius: 50%;
          background: rgba(${accent.rgb},0.5);
        }
      `}</style>

      <div className="flex-1 relative flex flex-col items-center justify-center px-4 py-8 overflow-hidden">

        {/* ── Static background ── */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Subtle grid */}
          <div className="absolute inset-0" style={{
            backgroundImage: `
              linear-gradient(rgba(${accent.rgb},0.025) 1px, transparent 1px),
              linear-gradient(90deg, rgba(${accent.rgb},0.025) 1px, transparent 1px)
            `,
            backgroundSize: '64px 64px',
          }} />
          {/* Center glow */}
          <div className="absolute" style={{
            width: '560px', height: '560px',
            top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            background: `radial-gradient(circle, rgba(${accent.rgb},0.055) 0%, transparent 65%)`,
            pointerEvents: 'none',
          }} />
          {/* Side accent lines */}
          <div className="absolute top-0 bottom-0" style={{ left: '10%', width: '1px', background: `linear-gradient(to bottom, transparent, rgba(${accent.rgb},0.07), transparent)` }} />
          <div className="absolute top-0 bottom-0" style={{ right: '10%', width: '1px', background: `linear-gradient(to bottom, transparent, rgba(${accent.rgb},0.07), transparent)` }} />
        </div>

        {/* ── Corner brackets ── */}
        {/* top-left */}
        <div className="absolute" style={{ top: 16, left: 16, width: cornerSize, height: cornerSize, borderTop: `${cornerThick} solid ${cornerColor}`, borderLeft: `${cornerThick} solid ${cornerColor}` }} />
        {/* top-right */}
        <div className="absolute" style={{ top: 16, right: 16, width: cornerSize, height: cornerSize, borderTop: `${cornerThick} solid ${cornerColor}`, borderRight: `${cornerThick} solid ${cornerColor}` }} />
        {/* bottom-left */}
        <div className="absolute" style={{ bottom: 16, left: 16, width: cornerSize, height: cornerSize, borderBottom: `${cornerThick} solid ${cornerColor}`, borderLeft: `${cornerThick} solid ${cornerColor}` }} />
        {/* bottom-right */}
        <div className="absolute" style={{ bottom: 16, right: 16, width: cornerSize, height: cornerSize, borderBottom: `${cornerThick} solid ${cornerColor}`, borderRight: `${cornerThick} solid ${cornerColor}` }} />

        {queueState !== 'matched' && (
          <button
            className="back-btn absolute top-6 left-14 px-4 py-2 text-sm flex items-center gap-1.5"
            onClick={() => { cancelQueue(); router.push('/'); }}
          >
            ← Zurück
          </button>
        )}

        {/* Badge + decorative header */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="flex items-center gap-3">
            <div className="deco-dot" />
            <div
              className="text-xs font-bold tracking-widest uppercase px-4 py-1.5 rounded-full"
              style={{
                color: badgeColor,
                border: `1px solid ${badgeBorder}`,
                background: badgeBg,
                letterSpacing: '0.26em',
              }}
            >
              {badgeLabel}
            </div>
            <div className="deco-dot" />
          </div>
          <div className="deco-line-h" style={{ width: '180px' }} />
        </div>

        {/* ─── IDLE ─── */}
        {queueState === 'idle' && (
          <div className="flex flex-col items-center gap-7 w-full max-w-md">

            {/* Player cards */}
            <div className="flex items-stretch gap-4 w-full">
              <div className="player-card-inner flex-1 p-5 text-center">
                <div
                  className="text-3xl mb-3"
                  style={{ filter: `drop-shadow(0 0 12px rgba(${accent.rgb},0.4))` }}
                >
                  👤
                </div>
                <div style={{ color: `rgba(160,215,240,0.8)`, fontSize: '0.8rem', fontWeight: 600, letterSpacing: '0.08em' }}>Du</div>
                <div style={{ color: `rgba(${accent.rgb},0.5)`, fontSize: '0.65rem', marginTop: '4px', letterSpacing: '0.1em' }}>BEREIT</div>
              </div>

              {/* VS column */}
              <div className="flex flex-col items-center justify-center gap-1 shrink-0" style={{ width: '52px' }}>
                <div style={{ height: '1px', width: '100%', background: `linear-gradient(90deg, transparent, rgba(255,200,0,0.4))` }} />
                <div
                  style={{
                    fontFamily: "'Bebas Neue', Impact, 'Arial Black', sans-serif",
                    fontSize: '1.9rem',
                    letterSpacing: '0.1em',
                    color: 'rgba(255,200,0,0.75)',
                    textShadow: '0 0 16px rgba(255,200,0,0.3)',
                    lineHeight: 1,
                  }}
                >
                  VS
                </div>
                <div style={{ height: '1px', width: '100%', background: `linear-gradient(90deg, rgba(255,200,0,0.4), transparent)` }} />
              </div>

              <div className="player-card-empty flex-1 p-5 text-center flex flex-col items-center justify-center">
                <div className="text-3xl mb-3" style={{ opacity: 0.25 }}>?</div>
                <div style={{ color: `rgba(160,215,240,0.28)`, fontSize: '0.8rem', fontWeight: 600, letterSpacing: '0.08em' }}>Gegner</div>
                <div style={{ color: `rgba(160,215,240,0.18)`, fontSize: '0.65rem', marginTop: '4px', letterSpacing: '0.1em' }}>WARTEND</div>
              </div>
            </div>

            {/* Decorative info row */}
            <div className="flex items-center gap-3 w-full">
              <div className="deco-line-h flex-1" />
              <div style={{ color: `rgba(${accent.rgb},0.38)`, fontSize: '0.65rem', letterSpacing: '0.15em', whiteSpace: 'nowrap' }}>
                {ranked ? 'RANG · PUNKTE · LEADERBOARD' : 'KEIN DRUCK · KEIN RANG · NUR SPASS'}
              </div>
              <div className="deco-line-h flex-1" />
            </div>

            <button className="join-btn px-10 py-4 w-full text-center" onClick={joinQueue}>
              <div className="text-2xl mb-1.5" style={{ filter: `drop-shadow(0 0 10px ${accent.dim})` }}>
                {ranked ? '⚔' : '⚡'}
              </div>
              <h3 style={{ fontFamily: "'Bebas Neue', Impact, 'Arial Black', sans-serif", fontSize: '1.4rem', letterSpacing: '0.14em', color: 'rgba(160,215,240,0.95)' }}>
                Queue beitreten
              </h3>
              <p style={{ color: accent.muted, fontSize: '0.72rem', marginTop: '3px' }}>
                {ranked ? 'Finde einen Gegner · Rang verdienen' : 'Finde einen Gegner · Kein Druck'}
              </p>
            </button>
          </div>
        )}

        {/* ─── CONNECTING ─── */}
        {queueState === 'connecting' && (
          <div className="flex flex-col items-center gap-5">
            <div style={{
              width: '44px', height: '44px',
              border: `3px solid rgba(${accent.rgb},0.12)`,
              borderTop: `3px solid rgba(${accent.rgb},0.85)`,
              borderRadius: '50%',
              animation: 'spinSlow 0.85s linear infinite',
            }} />
            <div style={{ color: 'rgba(140,200,230,0.55)', fontSize: '0.9rem', letterSpacing: '0.06em' }}>
              Verbinde mit Server...
            </div>
          </div>
        )}

        {/* ─── SEARCHING ─── */}
        {queueState === 'searching' && (
          <div className="flex flex-col items-center gap-9">
            <div className="relative flex items-center justify-center" style={{ width: '148px', height: '148px' }}>
              {[0, 1, 2].map((i) => (
                <div key={i} className="absolute rounded-full" style={{
                  width: '64px', height: '64px',
                  border: `2px solid rgba(${accent.rgb},0.65)`,
                  animation: `radarRing 2.1s ease-out ${i * 0.7}s infinite`,
                }} />
              ))}
              <div className="relative rounded-full flex items-center justify-center" style={{
                width: '60px', height: '60px',
                background: `rgba(${accent.rgb},0.09)`,
                border: `2px solid rgba(${accent.rgb},0.5)`,
                fontSize: '1.7rem',
                zIndex: 1,
              }}>
                {ranked ? '⚔' : '⚡'}
              </div>
            </div>

            <div className="text-center">
              <div style={{ fontFamily: "'Bebas Neue', Impact, 'Arial Black', sans-serif", fontSize: '1.7rem', letterSpacing: '0.1em', color: 'rgba(160,215,240,0.88)' }}>
                Gegner wird gesucht
              </div>
              <div className="mt-2 font-mono" style={{ fontSize: '1.35rem', color: `rgba(${accent.rgb},0.6)`, letterSpacing: '0.12em' }}>
                {formatTime(queueSeconds)}
              </div>
            </div>

            {/* Searching info row */}
            <div className="flex items-center gap-3">
              <div className="deco-line-h" style={{ width: '40px' }} />
              <span style={{ color: `rgba(${accent.rgb},0.35)`, fontSize: '0.65rem', letterSpacing: '0.15em' }}>SUCHE LÄUFT</span>
              <div className="deco-line-h" style={{ width: '40px' }} />
            </div>

            <button className="cancel-btn px-8 py-2.5 text-sm font-medium" onClick={cancelQueue}>
              Abbrechen
            </button>
          </div>
        )}

        {/* ─── MATCHED ─── */}
        {queueState === 'matched' && (
          <div className="flex flex-col items-center gap-6 match-reveal">
            <div style={{ fontFamily: "'Bebas Neue', Impact, 'Arial Black', sans-serif", fontSize: '3rem', letterSpacing: '0.08em', color: '#FFD200', animation: 'matchGlow 1.2s ease-in-out infinite' }}>
              Gegner gefunden!
            </div>
            <div className="deco-line-h" style={{ width: '200px' }} />
            <div className="px-4 py-2 rounded font-mono text-xs" style={{
              background: `rgba(${accent.rgb},0.06)`,
              border: `1px solid rgba(${accent.rgb},0.18)`,
              color: 'rgba(140,200,230,0.5)',
              letterSpacing: '0.07em',
            }}>
              Match ID: {matchId}
            </div>
            <div className="flex items-center gap-2 text-sm" style={{ color: 'rgba(140,200,230,0.42)' }}>
              <div style={{
                width: '14px', height: '14px',
                border: `2px solid rgba(${accent.rgb},0.2)`,
                borderTop: `2px solid rgba(${accent.rgb},0.7)`,
                borderRadius: '50%',
                animation: 'spinSlow 0.85s linear infinite',
              }} />
              Lade Battle...
            </div>
          </div>
        )}

        {/* ─── ERROR ─── */}
        {queueState === 'error' && (
          <div className="flex flex-col items-center gap-6 text-center" style={{ maxWidth: '340px' }}>
            <div style={{ fontSize: '2.5rem' }}>⚠</div>
            <div style={{ fontFamily: "'Bebas Neue', Impact, 'Arial Black', sans-serif", fontSize: '1.6rem', letterSpacing: '0.08em', color: 'rgba(255,130,90,0.9)' }}>
              Verbindung fehlgeschlagen
            </div>
            <p style={{ color: 'rgba(140,200,230,0.48)', fontSize: '0.85rem', lineHeight: 1.6 }}>
              {errorMsg}
            </p>
            <button className="join-btn px-8 py-3 text-sm" onClick={() => setQueueState('idle')}>
              <span style={{ color: 'rgba(160,215,240,0.85)' }}>Erneut versuchen</span>
            </button>
          </div>
        )}
      </div>
    </>
  );
}
