'use client';

import { IconCrossedSwords } from '@/app/components/Icons';

interface PickCategoryPhaseProps {
  readonly categories: string[];
  readonly onCategoryPicked: (category: string) => void;
}

export function PickCategoryPhase({ categories, onCategoryPicked }: PickCategoryPhaseProps) {
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

      <div className="flex flex-col gap-3 w-full">
        {categories.map((cat, i) => (
          <button
            key={cat}
            className="category-btn"
            style={{ animationDelay: `${i * 0.08}s` }}
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

interface WaitingForCategoryPhaseProps {
  readonly pickerName: string;
}

export function WaitingForCategoryPhase({ pickerName }: WaitingForCategoryPhaseProps) {
  return (
    <div className="flex flex-col items-center gap-5 reveal">
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
    </div>
  );
}
