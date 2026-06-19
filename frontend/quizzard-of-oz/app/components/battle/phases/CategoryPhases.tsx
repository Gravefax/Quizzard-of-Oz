'use client';

import { IconCrossedSwords } from '@/app/components/Icons';

/**
 * PickCategoryPhase Component
 *
 * Shown when it's the current player's turn to pick a quiz category.
 * Displays 3 available categories as interactive buttons.
 *
 * The picker (determined by backend) must select one category to proceed.
 * This triggers the start of 3 questions in the chosen category.
 *
 * Duration: Until player clicks a category button or the server deadline expires.
 *
 * A server-synced countdown is shown. When it reaches zero (or after a pick),
 * the buttons are disabled so no duplicate selection is sent — the backend
 * auto-picks a category once the deadline passes.
 */
interface PickCategoryPhaseProps {
  readonly categories: string[];
  readonly onCategoryPicked: (category: string) => void;
  readonly timeLeft: number;
  readonly totalTime: number;
  readonly disabled: boolean;
}

export function PickCategoryPhase({
  categories,
  onCategoryPicked,
  timeLeft,
  totalTime,
  disabled,
}: PickCategoryPhaseProps) {
  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-md reveal">
      <div className="text-center">
        <div style={{ color: 'var(--oz-battle-fire-label)', fontSize: '0.65rem', letterSpacing: '0.25em', marginBottom: '6px' }}>
          DU WÄHLST
        </div>
        <div
          style={{
            fontFamily: "'Bebas Neue', Impact, sans-serif",
            fontSize: '2rem',
            letterSpacing: '0.1em',
            color: 'var(--oz-battle-round-num)',
          }}
        >
          Wähle eine Kategorie
        </div>
        <div style={{ color: 'var(--oz-battle-muted)', fontSize: '0.75rem', marginTop: '4px' }}>
          Die Kategorie bestimmt deine 3 Fragen
        </div>
      </div>

      {/* ── Countdown ── */}
      <CategoryCountdown timeLeft={timeLeft} totalTime={totalTime} />

      {/* ── Category Buttons ── */}
      <div className="flex flex-col gap-3 w-full">
        {categories.map((cat, i) => (
          <button
            key={cat}
            className="category-btn"
            style={{ animationDelay: `${i * 0.08}s` }}
            disabled={disabled}
            onClick={() => onCategoryPicked(cat)}
          >
            <div
              style={{
                fontFamily: "'Bebas Neue', Impact, sans-serif",
                fontSize: '1.4rem',
                letterSpacing: '0.12em',
                color: 'var(--oz-battle-warm-text)',
              }}
            >
              {cat}
            </div>
            <div style={{ color: 'var(--oz-battle-cat-sublabel)', fontSize: '0.68rem', letterSpacing: '0.1em', marginTop: '2px' }}>
              Kategorie auswählen
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * CategoryCountdown Component
 *
 * Shared server-synced countdown for the category-pick phase. Both the picker
 * and the waiting player render the same remaining time, so the deadline stays
 * visually in sync across clients.
 */
interface CategoryCountdownProps {
  readonly timeLeft: number;
  readonly totalTime: number;
}

export function CategoryCountdown({ timeLeft, totalTime }: CategoryCountdownProps) {
  const pct = totalTime > 0 ? Math.max(0, Math.min(100, (timeLeft / totalTime) * 100)) : 0;
  const low = timeLeft <= 5;

  return (
    <div className="w-full" aria-label="Verbleibende Zeit für die Kategoriewahl">
      <div
        style={{
          textAlign: 'center',
          fontFamily: "'Bebas Neue', Impact, sans-serif",
          fontSize: '1.4rem',
          letterSpacing: '0.1em',
          marginBottom: '6px',
          color: low ? 'var(--oz-battle-runde-label)' : 'var(--oz-battle-timer-normal)',
        }}
      >
        {timeLeft}
      </div>
      <div className="timer-bar-track">
        <div
          className="timer-bar-fill"
          style={{
            width: `${pct}%`,
            background: low
              ? 'linear-gradient(90deg, var(--oz-battle-runde-label), var(--oz-battle-fire-btn-color))'
              : 'linear-gradient(90deg, var(--oz-battle-timer-normal), var(--oz-battle-cyan-btn-color))',
          }}
        />
      </div>
    </div>
  );
}

/**
 * WaitingForCategoryPhase Component
 *
 * Shown when the opponent is picking a category.
 * Displays the opponent's name and a waiting indicator.
 *
 * Duration: Until opponent submits a category or the server deadline auto-picks
 * one (server broadcasts the choice). The same countdown the picker sees is
 * shown here, so the waiting player never gets stuck on this screen.
 */
interface WaitingForCategoryPhaseProps {
  readonly pickerName: string;
  readonly timeLeft: number;
  readonly totalTime: number;
}

export function WaitingForCategoryPhase({
  pickerName,
  timeLeft,
  totalTime,
}: WaitingForCategoryPhaseProps) {
  return (
    <div className="flex flex-col items-center gap-5 w-full max-w-md reveal">
      <div
        style={{
          color: 'var(--oz-battle-warm-text)',
          filter: 'drop-shadow(0 0 14px rgba(255,200,0,0.3))',
          animation: 'spinSlow 3s linear infinite',
        }}
      >
        <IconCrossedSwords size={44} />
      </div>
      <div
        style={{
          fontFamily: "'Bebas Neue', Impact, sans-serif",
          fontSize: '1.6rem',
          letterSpacing: '0.1em',
          color: 'var(--oz-battle-muted-title)',
        }}
      >
        {pickerName} wählt Kategorie
      </div>
      <div style={{ color: 'var(--oz-battle-sublabel)', fontSize: '0.75rem', letterSpacing: '0.08em' }}>
        Warte auf Auswahl...
      </div>

      <CategoryCountdown timeLeft={timeLeft} totalTime={totalTime} />
    </div>
  );
}
