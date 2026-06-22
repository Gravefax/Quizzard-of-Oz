export default function Loading() {
  return (
    <main className="relative z-10 flex-1 flex flex-col items-center justify-center py-8">
      <div className="flex flex-col items-center gap-4">
        <div
          className="text-5xl animate-pulse"
          style={{ filter: 'drop-shadow(0 0 16px rgba(139,92,246,0.5))' }}
        >
          ✦
        </div>
        <p className="text-sm" style={{ color: 'rgba(196,181,253,0.5)' }}>
          Laden…
        </p>
      </div>
    </main>
  );
}
