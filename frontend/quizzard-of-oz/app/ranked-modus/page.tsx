'use client';

import { useRouter } from 'next/navigation';
import Queue from '@/app/components/Queue';
import LoginButton from '@/app/components/login-button/LoginButton';
import useAuthStore from '@/app/stores/authStore';

function LoginCardContent() {
  return (
    <div className="login-card flex flex-col items-center gap-6 px-10 py-10 w-full max-w-sm text-center">
      {/* Icon */}
      <div
        style={{
          fontSize: '3rem',
          animation: 'shieldPulse 3s ease-in-out infinite',
        }}
      >
        ⚔
      </div>

      {/* Title */}
      <div>
        <h2
          style={{
            fontFamily: "'Bebas Neue', Impact, 'Arial Black', sans-serif",
            fontSize: '2rem',
            letterSpacing: '0.1em',
            color: '#FFD0B0',
          }}
        >
          Login erforderlich
        </h2>
        <p
          className="mt-2 text-sm leading-relaxed"
          style={{ color: 'rgba(140,200,230,0.5)' }}
        >
          Ranked Battle erfordert einen Account,
          <br />um dein Rang zu verfolgen.
        </p>
      </div>

      {/* Divider */}
      <div
        style={{
          width: '100%',
          height: '1px',
          background: 'linear-gradient(90deg, transparent, rgba(255,60,20,0.25), transparent)',
        }}
      />

      {/* Google Login */}
      <div>
        <p
          className="text-xs mb-3"
          style={{ color: 'rgba(140,200,230,0.35)', letterSpacing: '0.06em' }}
        >
          Mit Google anmelden
        </p>
        <LoginButton />
      </div>
    </div>
  );
}

export default function RankedPage() {
  const router = useRouter();
  const credential = useAuthStore((state) => state.credential);
  const isLoggedIn = !!credential;

  if (isLoggedIn) {
    return <Queue ranked />;
  }

  return (
    <>
      <style>{`
        @keyframes shieldPulse {
          0%,100% { text-shadow: 0 0 20px rgba(255,60,20,0.3), 0 0 50px rgba(255,60,20,0.1); }
          50%     { text-shadow: 0 0 35px rgba(255,60,20,0.6), 0 0 80px rgba(255,60,20,0.2); }
        }
        @keyframes cardReveal {
          0%   { opacity: 0; transform: translateY(20px) scale(0.97); }
          100% { opacity: 1; transform: translateY(0)    scale(1); }
        }
        .login-card {
          background: rgba(10,18,32,0.75);
          border: 1px solid rgba(255,60,20,0.22);
          border-radius: 1.5rem;
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
          animation: cardReveal 0.5s cubic-bezier(0.22,1,0.36,1) both;
        }
        .back-btn {
          border: 1px solid rgba(0,212,255,0.16);
          border-radius: 0.625rem;
          color: rgba(140,200,230,0.5);
          transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
        }
        .back-btn:hover {
          background: rgba(0,212,255,0.07);
          border-color: rgba(0,212,255,0.38);
          color: rgba(160,215,240,0.85);
        }
      `}</style>

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 text-center relative">
        <button
          className="back-btn absolute top-6 left-6 px-4 py-2 text-sm flex items-center gap-1.5"
          onClick={() => router.push('/')}
        >
          ← Zurück
        </button>

        <LoginCardContent />
      </div>
    </>
  );
}
