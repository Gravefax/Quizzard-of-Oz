'use client';

import { useEffect } from 'react';

interface ErrorProps {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-8">
      <div className="flex flex-col items-center gap-6 text-center max-w-sm">
        <div className="text-5xl">⚠️</div>
        <div>
          <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--oz-battle-dialog-title)' }}>
            Etwas ist schiefgelaufen
          </h2>
          <p className="text-sm" style={{ color: 'var(--oz-battle-muted)' }}>
            {error.message || 'Ein unerwarteter Fehler ist aufgetreten.'}
          </p>
        </div>
        <button
          onClick={reset}
          className="px-8 py-3 rounded-xl text-sm font-medium transition-all duration-200"
          style={{
            background: 'var(--oz-battle-cyan-btn-bg)',
            border: '1px solid var(--oz-battle-cyan-btn-border)',
            color: 'var(--oz-battle-cyan-btn-color)',
          }}
        >
          Erneut versuchen
        </button>
      </div>
    </main>
  );
}
