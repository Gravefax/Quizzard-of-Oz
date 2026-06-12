'use client';

import { useRouter } from 'next/navigation';
import { IconAlertTriangle } from '@/app/components/Icons';

export default function BattleWsPage() {
  const router = useRouter();

  return (
    <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-8">
      <div
        className="flex flex-col items-center gap-6 text-center reveal"
        style={{ maxWidth: '340px' }}
      >
        <IconAlertTriangle size={42} style={{ color: 'var(--oz-battle-dialog-title)' }} />
        <div
          style={{
            fontFamily: "'Bebas Neue', Impact, sans-serif",
            fontSize: '2rem',
            letterSpacing: '0.1em',
            color: 'var(--oz-battle-dialog-title)',
          }}
        >
          Match wird gerade gespielt
        </div>
        <p
          style={{
            color: 'var(--oz-battle-muted)',
            fontSize: '0.85rem',
            lineHeight: 1.6,
          }}
        >
          Dieses Battle läuft bereits oder existiert nicht mehr. Battles können
          nur über das Hauptmenü betreten werden.
        </p>
        <button
          onClick={() => router.push('/')}
          className="back-btn px-6 py-2.5 text-xs font-semibold tracking-widest uppercase"
        >
          ← Zum Hauptmenü
        </button>
      </div>
    </main>
  );
}
