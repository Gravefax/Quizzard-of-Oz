"use client";

import { useEffect } from "react";
import Link from "next/link";
import LoginButton from "@/app/components/login-button/LoginButton";
import UserMenu from "@/app/components/user-menu/UserMenu";
import useAuthStore from "@/app/stores/authStore";
import { refreshAccessToken, logout } from "@/app/lib/auth/authClient";

export default function Navbar() {
  const credential = useAuthStore((state) => state.credential);
  const clearCredential = useAuthStore((state) => state.clearCredential);
  const setCredential = useAuthStore((state) => state.setCredential);
  const isLoggedIn = !!credential;
  const displayName = credential?.username ?? credential?.email ?? "User";

  useEffect(() => {
    let isMounted = true;
    // Only attempt refresh if no credential
    if (credential) {
      return () => {
        isMounted = false;
      };
    }

    // Attempt to restore session from refresh token
    refreshAccessToken()
      .then((res) => {
        if (!isMounted) return;
        setCredential({
          email: res.email,
          username: res.username ?? res.email,
          expiresAt: res.expires_at,
        });
      })
      .catch(() => {
        // Ignore missing/expired refresh token - user stays logged out
      });

    return () => {
      isMounted = false;
    };
  }, [credential, setCredential]);

  function handleLogout() {
    logout().finally(() => clearCredential());
  }

  return (
    <header
      className="relative z-30 flex justify-between items-center px-8 py-6"
      style={{ borderBottom: "1px solid rgba(var(--oz-violet-light-rgb), 0.1)" }}
    >
      <Link
        href="/"
        className="text-xl font-semibold tracking-widest uppercase"
        style={{
          color: "rgba(var(--oz-violet-text-rgb), 0.65)",
          letterSpacing: "0.22em",
          textDecoration: "none",
          transition: "color 0.2s ease",
          display: "inline-block",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(var(--oz-violet-text-rgb), 1)")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(var(--oz-violet-text-rgb), 0.65)")}
      >
        Quizzard of Oz
      </Link>
      <div className="flex items-center gap-3">
        <Link
          href="/leaderboard"
          className="login-btn inline-flex items-center gap-2 px-6 py-2 font-medium rounded-lg"
          style={{ textDecoration: "none" }}
        >
          <span>🏆</span>
          <span>Leaderboard</span>
        </Link>
        {isLoggedIn ? (
          <UserMenu displayName={displayName} onLogout={handleLogout} />
        ) : (
          <div className="relative">
            <LoginButton />
          </div>
        )}
      </div>
    </header>
  );
}
