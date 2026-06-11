'use client';

import { useRouter } from 'next/navigation';
import Queue from '@/app/components/Queue';
import LoginButton from '@/app/components/login-button/LoginButton';
import useAuthStore from '@/app/stores/authStore';
import rankedStyles from './ranked.module.css';

function LoginCardContent() {
  return (
    <div className={`${rankedStyles['login-card']} flex flex-col items-center gap-6 px-10 py-10 w-full max-w-sm text-center`}>
      {/* Icon */}
      <div className={rankedStyles['icon-pulse']} style={{ fontSize: '3rem' }}>
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
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 text-center relative">
      <button
        className="back-btn absolute top-6 left-6 px-4 py-2 text-sm flex items-center gap-1.5"
        onClick={() => router.push('/')}
      >
        ← Zurück
      </button>

      <LoginCardContent />
    </div>
  );
}
