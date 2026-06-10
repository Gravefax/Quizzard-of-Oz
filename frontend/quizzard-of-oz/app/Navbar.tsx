"use client";

import { useEffect, useRef, useState } from "react";
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
  const hasExplicitlyLoggedOut = useRef(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mobileOpen) return;

    const handleOutsideClick = (event: MouseEvent) => {
      if (!mobileMenuRef.current?.contains(event.target as Node)) {
        setMobileOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [mobileOpen]);

  useEffect(() => {
    let isMounted = true;
    // Only attempt refresh if no credential and the user has not logged out on purpose
    if (credential || hasExplicitlyLoggedOut.current) {
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
    hasExplicitlyLoggedOut.current = true;
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
      {/* Desktop navigation — unchanged ab md */}
      <div className="hidden md:flex items-center gap-3">
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

      {/* Mobile: Burger-Menü */}
      <div ref={mobileMenuRef} className="md:hidden">
        <button
          type="button"
          aria-label={mobileOpen ? "Menü schließen" : "Menü öffnen"}
          aria-haspopup="menu"
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((prev) => !prev)}
          className="login-btn flex items-center justify-center w-10 h-10 rounded-lg text-lg"
        >
          {mobileOpen ? "✕" : "☰"}
        </button>

        {mobileOpen ? (
          <div
            role="menu"
            className="absolute right-4 top-full mt-2 w-60 rounded-lg border overflow-hidden shadow-lg backdrop-blur-sm"
            style={{
              background: "rgba(var(--oz-menu-bg-rgb), 0.92)",
              borderColor: "rgba(var(--oz-violet-light-rgb), 0.35)",
              boxShadow: "0 14px 28px rgba(var(--oz-violet-shadow-rgb), 0.28)",
            }}
          >
            <Link
              href="/leaderboard"
              role="menuitem"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2 px-4 py-3 text-sm transition-colors hover:bg-white/10"
              style={{ color: "rgba(var(--oz-violet-text-rgb), 1)", textDecoration: "none" }}
            >
              <span>🏆</span>
              <span>Leaderboard</span>
            </Link>
            {isLoggedIn ? (
              <>
                <div
                  className="px-4 py-3 text-sm"
                  style={{
                    borderTop: "1px solid rgba(var(--oz-violet-light-rgb), 0.25)",
                    color: "rgba(var(--oz-violet-text-rgb), 0.65)",
                  }}
                >
                  {displayName}
                </div>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMobileOpen(false);
                    handleLogout();
                  }}
                  className="w-full px-4 py-3 text-left text-sm transition-colors hover:bg-white/10"
                  style={{
                    borderTop: "1px solid rgba(var(--oz-violet-light-rgb), 0.25)",
                    color: "rgba(var(--oz-gold-light-rgb), 0.95)",
                  }}
                >
                  Abmelden
                </button>
              </>
            ) : (
              <div
                className="px-4 py-3"
                style={{ borderTop: "1px solid rgba(var(--oz-violet-light-rgb), 0.25)" }}
              >
                <LoginButton />
              </div>
            )}
          </div>
        ) : null}
      </div>
    </header>
  );
}
