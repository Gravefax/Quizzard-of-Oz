'use client';

import { PlayerInfo, ScoreInfo } from '@/app/lib/interfaces/battle/BattleInterfaces';
import { IconStar } from '@/app/components/Icons';

/**
 * BattleArenaHeader Component
 *
 * Displays the score header with both players' usernames, win stars, and current round number.
 * Only shown during active battle phases (not during connecting or waiting for opponent).
 *
 * Features:
 * - Player names with truncation handling
 * - Animated star indicators for round wins (first to 3)
 * - Current round number display
 * - Responsive layout with decorative divider
 */
interface BattleArenaHeaderProps {
  readonly player: PlayerInfo | null;
  readonly scores: ScoreInfo;
  readonly currentRound: number;
  readonly shouldShow: boolean;
}

// ROUNDS_TO_WIN is always 3 — fixed slots avoid array-index keys
const STAR_SLOTS = ['slot-1', 'slot-2', 'slot-3'] as const;

export function BattleArenaHeader({
  player,
  scores,
  currentRound,
  shouldShow,
}: BattleArenaHeaderProps) {
  if (!player || !shouldShow) {
    return null;
  }

  return (
    <div className="score-header">
      {/* ── Your Score ── */}
      <div className="score-player">
        <div className="username">{player.yourUsername}</div>
        <div className="win-stars">
          {STAR_SLOTS.map((slotId, i) => (
            <span
              key={slotId}
              className={`win-star ${i < scores.yourWins ? 'earned' : 'empty'}`}
              style={i < scores.yourWins ? { animationDelay: `${i * 0.12}s` } : {}}
            >
              <IconStar filled size={16} />
            </span>
          ))}
        </div>
      </div>

      {/* ── Round Center Display ── */}
      <div className="score-center">
        <div style={{ color: 'var(--oz-battle-runde-label)', fontSize: '0.6rem', letterSpacing: '0.2em', fontWeight: 700 }}>
          RUNDE
        </div>
        <div
          style={{
            fontFamily: "'Bebas Neue', Impact, sans-serif",
            fontSize: '1.6rem',
            letterSpacing: '0.08em',
            color: 'var(--oz-battle-round-num)',
            lineHeight: 1,
          }}
        >
          {currentRound}
        </div>
      </div>

      <div className="score-divider" />

      {/* ── Opponent Score ── */}
      <div className="score-player right">
        <div className="username">{player.opponentUsername}</div>
        <div className="win-stars" style={{ justifyContent: 'flex-end' }}>
          {STAR_SLOTS.map((slotId, i) => (
            <span
              key={slotId}
              className={`win-star ${i < scores.opponentWins ? 'earned' : 'empty'}`}
              style={i < scores.opponentWins ? { animationDelay: `${i * 0.12}s` } : {}}
            >
              <IconStar filled size={16} />
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
