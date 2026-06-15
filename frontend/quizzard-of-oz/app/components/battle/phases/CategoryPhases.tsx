'use client';

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
      {/* ── Header ── */}
      <div className="text-center">
        <div style={{ color: 'rgba(255,60,20,0.7)', fontSize: '0.65rem', letterSpacing: '0.25em', marginBottom: '6px' }}>
          DU WÄHLST
        </div>
        <div
          style={{
            fontFamily: "'Bebas Neue', Impact, sans-serif",
            fontSize: '2rem',
            letterSpacing: '0.1em',
            color: '#FFD0B0',
          }}
        >
          Wähle eine Kategorie
        </div>
        <div style={{ color: 'rgba(140,200,230,0.4)', fontSize: '0.75rem', marginTop: '4px' }}>
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
                color: '#FFCDB0',
              }}
            >
              {cat}
            </div>
            <div style={{ color: 'rgba(255,140,90,0.45)', fontSize: '0.68rem', letterSpacing: '0.1em', marginTop: '2px' }}>
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
          color: low ? 'rgba(255,60,20,0.9)' : 'rgba(0,212,255,0.7)',
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
              ? 'linear-gradient(90deg, rgba(255,60,20,0.9), rgba(255,100,40,0.9))'
              : 'linear-gradient(90deg, rgba(0,212,255,0.8), rgba(0,180,220,0.8))',
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
          fontSize: '2.8rem',
          filter: 'drop-shadow(0 0 14px rgba(255,200,0,0.3))',
          animation: 'spinSlow 3s linear infinite',
        }}
      >
        ⚔
      </div>
      <div
        style={{
          fontFamily: "'Bebas Neue', Impact, sans-serif",
          fontSize: '1.6rem',
          letterSpacing: '0.1em',
          color: 'rgba(160,215,240,0.8)',
        }}
      >
        {pickerName} wählt Kategorie
      </div>
      <div style={{ color: 'rgba(140,200,230,0.35)', fontSize: '0.75rem', letterSpacing: '0.08em' }}>
        Warte auf Auswahl...
      </div>

      <CategoryCountdown timeLeft={timeLeft} totalTime={totalTime} />
    </div>
  );
}
