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
          <h2 className="text-xl font-semibold mb-2" style={{ color: '#fca5a5' }}>
            Etwas ist schiefgelaufen
          </h2>
          <p className="text-sm" style={{ color: 'rgba(196,181,253,0.5)' }}>
            {error.message || 'Ein unerwarteter Fehler ist aufgetreten.'}
          </p>
        </div>
        <button
          onClick={reset}
          className="px-8 py-3 rounded-xl text-sm font-medium transition-all duration-200"
          style={{
            background: 'rgba(139,92,246,0.2)',
            border: '1px solid rgba(167,139,250,0.3)',
            color: '#ede9fe',
          }}
        >
          Erneut versuchen
        </button>
      </div>
    </main>
  );
}
