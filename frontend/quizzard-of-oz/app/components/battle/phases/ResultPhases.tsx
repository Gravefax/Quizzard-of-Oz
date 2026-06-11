'use client';

import { PlayerInfo, RoundResultData, GameOverData } from '@/app/lib/interfaces/battle/BattleInterfaces';
import { getRoundOutcomeMeta } from '../BattleArena.utils';

// ROUNDS_TO_WIN is always 3 — fixed slots avoid array-index keys
const STAR_SLOTS = ['slot-1', 'slot-2', 'slot-3'] as const;

/**
 * RoundResultPhase Component
 *
 * Displays the results of a completed round with both players' score comparison.
 * Shows who won the round and (if not game over) who will pick the next category.
 *
 * Features:
 * - Win/loss/tie outcome with animated styling
 * - Score comparison (correct answers per player)
 * - Next picker announcement if game continues
 * - Final score and win totals
 *
 * Duration: ~3-4 seconds before proceeding to next round or game over.
 */
interface RoundResultPhaseProps {
  readonly roundResult: RoundResultData;
  readonly player: PlayerInfo;
  readonly nextPicker: string;
}

export function RoundResultPhase({
  roundResult,
  player,
  nextPicker,
}: RoundResultPhaseProps) {
  const outcomeMeta = getRoundOutcomeMeta(roundResult.outcome);

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-md round-panel">
      {/* ── Outcome Headline ── */}
      <div
        style={{
          fontFamily: "'Bebas Neue', Impact, sans-serif",
          fontSize: '3.2rem',
          letterSpacing: '0.1em',
          lineHeight: 1,
          color: outcomeMeta.color,
        }}
        className={outcomeMeta.cssClass}
      >
        {outcomeMeta.label}
      </div>

      {/* ── Score Comparison ── */}
      <div className="arena-card w-full" style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
          {/* Your Score */}
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ color: 'rgba(140,200,230,0.5)', fontSize: '0.65rem', letterSpacing: '0.14em', marginBottom: '6px' }}>
              {player.yourUsername.toUpperCase()}
            </div>
            <div
              style={{
                fontFamily: "'Bebas Neue', Impact, sans-serif",
                fontSize: '2.8rem',
                color: 'rgba(0,212,255,0.9)',
                textShadow: '0 0 18px rgba(0,212,255,0.3)',
              }}
            >
              {roundResult.yourScore}
            </div>
            <div style={{ color: 'rgba(140,200,230,0.35)', fontSize: '0.65rem', letterSpacing: '0.1em' }}>
              RICHTIG
            </div>
          </div>

          {/* VS */}
          <div style={{ color: 'rgba(255,200,0,0.5)', fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: '1.4rem' }}>
            VS
          </div>

          {/* Opponent Score */}
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ color: 'rgba(140,200,230,0.5)', fontSize: '0.65rem', letterSpacing: '0.14em', marginBottom: '6px' }}>
              {player.opponentUsername.toUpperCase()}
            </div>
            <div
              style={{
                fontFamily: "'Bebas Neue', Impact, sans-serif",
                fontSize: '2.8rem',
                color: 'rgba(255,90,50,0.9)',
                textShadow: '0 0 18px rgba(255,60,20,0.25)',
              }}
            >
              {roundResult.opponentScore}
            </div>
            <div style={{ color: 'rgba(140,200,230,0.35)', fontSize: '0.65rem', letterSpacing: '0.1em' }}>
              RICHTIG
            </div>
          </div>
        </div>
      </div>

      {/* ── Next Round Info ── */}
      {!roundResult.gameOver && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: 'rgba(140,200,230,0.45)',
            fontSize: '0.75rem',
            letterSpacing: '0.08em',
          }}
        >
          <div
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: 'rgba(255,60,20,0.6)',
              flexShrink: 0,
            }}
          />
          <span>
            Nächste Runde: <strong style={{ color: 'rgba(255,160,100,0.75)' }}>{nextPicker}</strong> wählt die Kategorie
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * GameOverPhase Component
 *
 * Displays the final battle results with winner announcement and final scores.
 * Shows both players' final win counts displayed as stars.
 * Includes a button to return to the main lobby.
 *
 * Features:
 * - Victory/Defeat headline with animated styling
 * - Final winner announcement
 * - Star indicators showing final round wins (0-3)
 * - Return to lobby button
 *
 * Duration: Until player clicks "Zurück zur Lobby" or closes window.
 */
interface GameOverPhaseProps {
  readonly gameOver: GameOverData;
  readonly player: PlayerInfo;
  readonly onReturnToLobby: () => void;
}

export function GameOverPhase({
  gameOver,
  player,
  onReturnToLobby,
}: GameOverPhaseProps) {
  let winnerMessage: string;
  if (gameOver.forfeit) {
    winnerMessage = gameOver.message ?? 'Gegner hat das Spiel verlassen – du gewinnst!';
  } else if (gameOver.youWon) {
    winnerMessage = `Du hast ${player.opponentUsername} besiegt!`;
  } else {
    winnerMessage = `${gameOver.winner} hat gewonnen.`;
  }

  return (
    <div className="flex flex-col items-center gap-7 w-full max-w-md reveal">
      {/* ── Battle Ended Label ── */}
      <div
        style={{
          fontFamily: "'Bebas Neue', Impact, sans-serif",
          fontSize: '1rem',
          letterSpacing: '0.3em',
          color: 'rgba(255,60,20,0.6)',
        }}
      >
        ⚔ BATTLE BEENDET ⚔
      </div>

      {/* ── Outcome ── */}
      <div
        style={{
          fontFamily: "'Bebas Neue', Impact, sans-serif",
          fontSize: '3.8rem',
          letterSpacing: '0.06em',
          lineHeight: 1,
          color: gameOver.youWon ? '#FFD200' : 'rgba(255,100,60,0.85)',
        }}
        className={gameOver.youWon ? 'outcome-win' : ''}
      >
        {gameOver.youWon ? 'VICTORY' : 'DEFEAT'}
      </div>

      {/* ── Winner Message ── */}
      <div style={{ color: 'rgba(140,200,230,0.5)', fontSize: '0.82rem', letterSpacing: '0.06em' }}>
        {winnerMessage}
      </div>

      {/* ── Final Score Card ── */}
      <div className="arena-card w-full" style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {/* Your Final Score */}
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ color: 'rgba(140,200,230,0.45)', fontSize: '0.62rem', letterSpacing: '0.14em', marginBottom: '6px' }}>
              {player.yourUsername.toUpperCase()}
            </div>
            <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
              {STAR_SLOTS.map((slotId, i) => (
                <span
                  key={slotId}
                  style={{
                    fontSize: '1.4rem',
                    color: i < gameOver.yourWins ? 'rgba(255,200,0,0.9)' : 'rgba(255,255,255,0.1)',
                    filter: i < gameOver.yourWins ? 'drop-shadow(0 0 6px rgba(255,200,0,0.5))' : 'none',
                  }}
                >
                  ★
                </span>
              ))}
            </div>
          </div>

          {/* VS */}
          <div style={{ color: 'rgba(255,200,0,0.4)', fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: '1.2rem', padding: '0 12px' }}>
            VS
          </div>

          {/* Opponent Final Score */}
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ color: 'rgba(140,200,230,0.45)', fontSize: '0.62rem', letterSpacing: '0.14em', marginBottom: '6px' }}>
              {player.opponentUsername.toUpperCase()}
            </div>
            <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
              {STAR_SLOTS.map((slotId, i) => (
                <span
                  key={slotId}
                  style={{
                    fontSize: '1.4rem',
                    color: i < gameOver.opponentWins ? 'rgba(255,200,0,0.9)' : 'rgba(255,255,255,0.1)',
                    filter: i < gameOver.opponentWins ? 'drop-shadow(0 0 6px rgba(255,200,0,0.5))' : 'none',
                  }}
                >
                  ★
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Return Button ── */}
      <button
        onClick={onReturnToLobby}
        style={{
          background: 'rgba(255,60,20,0.08)',
          border: '1px solid rgba(255,60,20,0.35)',
          borderRadius: '0.875rem',
          padding: '12px 36px',
          color: 'rgba(255,140,90,0.85)',
          fontSize: '0.85rem',
          fontWeight: 600,
          letterSpacing: '0.08em',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(255,60,20,0.16)';
          e.currentTarget.style.borderColor = 'rgba(255,80,40,0.7)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(255,60,20,0.08)';
          e.currentTarget.style.borderColor = 'rgba(255,60,20,0.35)';
        }}
      >
        Zurück zur Lobby
      </button>
    </div>
  );
}
