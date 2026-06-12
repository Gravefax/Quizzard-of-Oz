import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-8">
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="arena-title" style={{ fontSize: '8rem' }}>
          404
        </div>
        <div
          style={{
            fontFamily: "'Bebas Neue', Impact, sans-serif",
            fontSize: '1.6rem',
            letterSpacing: '0.1em',
            color: 'var(--oz-surface-heading)',
          }}
        >
          Diese Seite existiert nicht
        </div>
        <p
          style={{
            color: 'var(--oz-battle-muted)',
            fontSize: '0.88rem',
            lineHeight: 1.6,
            maxWidth: '300px',
          }}
        >
          Die aufgerufene URL wurde nicht gefunden.
        </p>
        <Link
          href="/"
          className="back-btn px-6 py-2.5 text-xs font-semibold tracking-widest uppercase"
        >
          ← Zurück zur Hauptseite
        </Link>
      </div>
    </main>
  );
}
