'use client';

interface ConfigErrorFallbackProps {
  readonly message: string;
}

export default function ConfigErrorFallback({ message }: Readonly<ConfigErrorFallbackProps>) {
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-xl w-full rounded-xl border p-6 text-center">
        <h1 className="text-xl font-semibold mb-3">Konfigurationsfehler</h1>
        <p className="text-sm leading-relaxed">{message}</p>
      </div>
    </main>
  );
}
