'use client';

import { IconBolt, IconAlertTriangle } from '@/app/components/Icons';

export function ConnectingPhase() {
  return (
    <div className="flex flex-col items-center gap-5 reveal">
      <div
        style={{
          width: '48px',
          height: '48px',
          border: '3px solid var(--oz-battle-cat-badge-bg)',
          borderTop: '3px solid var(--oz-battle-runde-label)',
          borderRadius: '50%',
          animation: 'spinSlow 0.9s linear infinite',
        }}
      />
      <div style={{ color: 'var(--oz-battle-muted)', fontSize: '0.88rem', letterSpacing: '0.08em' }}>
        Verbinde mit Battle...
      </div>
    </div>
  );
}

export function WaitingForOpponentPhase() {
  return (
    <div className="flex flex-col items-center gap-5 reveal">
      <div
        style={{
          width: '48px',
          height: '48px',
          border: '3px solid var(--oz-battle-cat-badge-bg)',
          borderTop: '3px solid var(--oz-battle-runde-label)',
          borderRadius: '50%',
          animation: 'spinSlow 0.9s linear infinite',
        }}
      />
      <div
        style={{
          fontFamily: "'Bebas Neue', Impact, sans-serif",
          fontSize: '1.6rem',
          letterSpacing: '0.12em',
          color: 'var(--oz-battle-muted-title)',
        }}
      >
        Warte auf Gegner
      </div>
    </div>
  );
}

interface CategoryChosenPhaseProps {
  readonly category: string;
}

export function CategoryChosenPhase({ category }: CategoryChosenPhaseProps) {
  return (
    <div className="flex flex-col items-center gap-4 pop-in">
      <div style={{ color: 'var(--oz-battle-fire-label)', fontSize: '0.65rem', letterSpacing: '0.25em' }}>
        KATEGORIE
      </div>
      <div
        style={{
          fontFamily: "'Bebas Neue', Impact, sans-serif",
          fontSize: '3.5rem',
          letterSpacing: '0.06em',
          color: 'var(--oz-battle-warm-text)',
          textShadow: '0 0 30px rgba(255,60,20,0.3)',
        }}
      >
        {category}
      </div>
      <div style={{ color: 'var(--oz-battle-muted)', fontSize: '0.8rem' }}>
        Bereite dich vor...
      </div>
    </div>
  );
}

interface OpponentDisconnectedPhaseProps {
  readonly onReturnToLobby: () => void;
}

export function OpponentDisconnectedPhase({ onReturnToLobby }: OpponentDisconnectedPhaseProps) {
  return (
    <div className="flex flex-col items-center gap-6 text-center reveal">
      <IconBolt size={40} style={{ color: 'rgba(255,200,0,0.85)' }} />
      <div
        style={{
          fontFamily: "'Bebas Neue', Impact, sans-serif",
          fontSize: '2rem',
          letterSpacing: '0.1em',
          color: 'rgba(255,200,0,0.85)',
        }}
      >
        Gegner hat aufgegeben
      </div>
      <div style={{ color: 'var(--oz-battle-muted)', fontSize: '0.82rem' }}>
        Dein Gegner hat die Verbindung getrennt.
      </div>
      <button
        onClick={onReturnToLobby}
        style={{
          background: 'var(--oz-battle-cyan-btn-bg)',
          border: '1px solid var(--oz-battle-cyan-btn-border)',
          borderRadius: '0.875rem',
          padding: '12px 36px',
          color: 'var(--oz-battle-cyan-btn-color)',
          fontSize: '0.85rem',
          fontWeight: 600,
          letterSpacing: '0.08em',
          cursor: 'pointer',
        }}
      >
        Zurück zur Lobby
      </button>
    </div>
  );
}

interface ErrorPhaseProps {
  readonly errorMessage: string;
  readonly onReturnToLobby: () => void;
}

export function ErrorPhase({ errorMessage, onReturnToLobby }: ErrorPhaseProps) {
  return (
    <div className="flex flex-col items-center gap-6 text-center reveal" style={{ maxWidth: '320px' }}>
      <IconAlertTriangle size={36} style={{ color: 'var(--oz-battle-dialog-title)' }} />
      <div
        style={{
          fontFamily: "'Bebas Neue', Impact, sans-serif",
          fontSize: '1.6rem',
          letterSpacing: '0.08em',
          color: 'var(--oz-battle-dialog-title)',
        }}
      >
        Verbindungsfehler
      </div>
      <p style={{ color: 'var(--oz-battle-muted)', fontSize: '0.82rem', lineHeight: 1.6 }}>
        {errorMessage}
      </p>
      <button
        onClick={onReturnToLobby}
        style={{
          background: 'var(--oz-battle-fire-btn-bg)',
          border: '1px solid var(--oz-battle-fire-btn-border)',
          borderRadius: '0.875rem',
          padding: '11px 32px',
          color: 'var(--oz-battle-fire-btn-color)',
          fontSize: '0.82rem',
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        Zur Lobby
      </button>
    </div>
  );
}
