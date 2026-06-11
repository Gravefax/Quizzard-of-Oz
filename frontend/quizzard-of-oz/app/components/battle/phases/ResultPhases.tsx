'use client';

import { PlayerInfo, RoundResultData, GameOverData } from '@/app/lib/interfaces/battle/BattleInterfaces';
import { getRoundOutcomeMeta } from '../BattleArena.utils';
import { IconCrossedSwords, IconStar } from '@/app/components/Icons';

const STAR_SLOTS = ['slot-1', 'slot-2', 'slot-3'] as const;

interface RoundResultPhaseProps {
  readonly roundResult: RoundResultData;
  readonly player: PlayerInfo;
  readonly nextPicker: string;
}

export function RoundResultPhase({ roundResult, player, nextPicker }: RoundResultPhaseProps) {
  const outcomeMeta = getRoundOutcomeMeta(roundResult.outcome);

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-md round-panel">
      {/* Outcome Headline */}
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

      {/* Score Comparison */}
      <div className="arena-card w-full" style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ color: 'var(--oz-battle-sublabel)', fontSize: '0.65rem', letterSpacing: '0.14em', marginBottom: '6px' }}>
              {player.yourUsername.toUpperCase()}
            </div>
            <div
              style={{
                fontFamily: "'Bebas Neue', Impact, sans-serif",
                fontSize: '2.8rem',
                color: 'var(--oz-battle-your-score)',
              }}
            >
              {roundResult.yourScore}
            </div>
            <div style={{ color: 'var(--oz-battle-sublabel)', fontSize: '0.65rem', letterSpacing: '0.1em' }}>
              RICHTIG
            </div>
          </div>

          <div style={{ color: 'var(--oz-battle-vs)', fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: '1.4rem' }}>
            VS
          </div>

          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ color: 'var(--oz-battle-sublabel)', fontSize: '0.65rem', letterSpacing: '0.14em', marginBottom: '6px' }}>
              {player.opponentUsername.toUpperCase()}
            </div>
            <div
              style={{
                fontFamily: "'Bebas Neue', Impact, sans-serif",
                fontSize: '2.8rem',
                color: 'var(--oz-battle-opp-score)',
              }}
            >
              {roundResult.opponentScore}
            </div>
            <div style={{ color: 'var(--oz-battle-sublabel)', fontSize: '0.65rem', letterSpacing: '0.1em' }}>
              RICHTIG
            </div>
          </div>
        </div>
      </div>

      {/* Next Round Info */}
      {!roundResult.gameOver && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: 'var(--oz-battle-muted)',
            fontSize: '0.75rem',
            letterSpacing: '0.08em',
          }}
        >
          <div
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: 'var(--oz-battle-runde-label)',
              flexShrink: 0,
            }}
          />
          <span>
            Nächste Runde: <strong style={{ color: 'var(--oz-battle-next-name)' }}>{nextPicker}</strong> wählt die Kategorie
          </span>
        </div>
      )}
    </div>
  );
}

interface GameOverPhaseProps {
  readonly gameOver: GameOverData;
  readonly player: PlayerInfo;
  readonly onReturnToLobby: () => void;
}

export function GameOverPhase({ gameOver, player, onReturnToLobby }: GameOverPhaseProps) {
  let winnerMessage: string;
  if (gameOver.forfeit) {
    winnerMessage = gameOver.message ?? 'Gegner hat das Spiel verlassen – du gewinnst!';
  } else if (gameOver.youWon) {
    winnerMessage = `Du hast ${player.opponentUsername} besiegt!`;
  } else {
    winnerMessage = `${gameOver.winner} hat gewonnen.`;
  }

  let outcomeLabel: string;
  if (gameOver.youWon) {
    outcomeLabel = 'VICTORY';
  } else if (gameOver.forfeit) {
    outcomeLabel = 'SURRENDER';
  } else {
    outcomeLabel = 'DEFEAT';
  }

  return (
    <div className="flex flex-col items-center gap-7 w-full max-w-md reveal">
      {/* Battle Ended Label */}
      <div
        style={{
          fontFamily: "'Bebas Neue', Impact, sans-serif",
          fontSize: '1rem',
          letterSpacing: '0.3em',
          color: 'var(--oz-battle-fire-label)',
        }}
      >
        <IconCrossedSwords size={16} style={{ verticalAlign: 'middle', marginRight: '8px' }} />
        BATTLE BEENDET
        <IconCrossedSwords size={16} style={{ verticalAlign: 'middle', marginLeft: '8px' }} />
      </div>

      {/* Outcome */}
      <div
        style={{
          fontFamily: "'Bebas Neue', Impact, sans-serif",
          fontSize: '3.8rem',
          letterSpacing: '0.06em',
          lineHeight: 1,
          color: gameOver.youWon ? '#FFD200' : 'var(--oz-battle-opp-score)',
        }}
        className={gameOver.youWon ? 'outcome-win' : ''}
      >
        {outcomeLabel}
      </div>

      {/* Winner Message */}
      <div style={{ color: 'var(--oz-battle-muted)', fontSize: '0.82rem', letterSpacing: '0.06em' }}>
        {winnerMessage}
      </div>

      {/* Final Score Card */}
      <div className="arena-card w-full" style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ color: 'var(--oz-battle-sublabel)', fontSize: '0.62rem', letterSpacing: '0.14em', marginBottom: '6px' }}>
              {player.yourUsername.toUpperCase()}
            </div>
            <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
              {STAR_SLOTS.map((slotId, i) => (
                <span
                  key={slotId}
                  style={{
                    color: i < gameOver.yourWins ? 'rgba(255,200,0,0.9)' : 'var(--oz-battle-star-empty)',
                    filter: i < gameOver.yourWins ? 'drop-shadow(0 0 6px rgba(255,200,0,0.5))' : 'none',
                  }}
                >
                  <IconStar filled size={22} />
                </span>
              ))}
            </div>
          </div>

          <div style={{ color: 'var(--oz-battle-vs)', fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: '1.2rem', padding: '0 12px' }}>
            VS
          </div>

          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ color: 'var(--oz-battle-sublabel)', fontSize: '0.62rem', letterSpacing: '0.14em', marginBottom: '6px' }}>
              {player.opponentUsername.toUpperCase()}
            </div>
            <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
              {STAR_SLOTS.map((slotId, i) => (
                <span
                  key={slotId}
                  style={{
                    color: i < gameOver.opponentWins ? 'rgba(255,200,0,0.9)' : 'var(--oz-battle-star-empty)',
                    filter: i < gameOver.opponentWins ? 'drop-shadow(0 0 6px rgba(255,200,0,0.5))' : 'none',
                  }}
                >
                  <IconStar filled size={22} />
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Return Button */}
      <button
        onClick={onReturnToLobby}
        style={{
          background: 'var(--oz-battle-fire-btn-bg)',
          border: '1px solid var(--oz-battle-fire-btn-border)',
          borderRadius: '0.875rem',
          padding: '12px 36px',
          color: 'var(--oz-battle-fire-btn-color)',
          fontSize: '0.85rem',
          fontWeight: 600,
          letterSpacing: '0.08em',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--oz-battle-fire-btn-border)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'var(--oz-battle-fire-btn-bg)';
        }}
      >
        Zurück zur Lobby
      </button>
    </div>
  );
}
