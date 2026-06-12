"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import LoginButton from "@/app/components/login-button/LoginButton";
import UserMenu from "@/app/components/user-menu/UserMenu";
import useAuthStore from "@/app/stores/authStore";
import useThemeStore from "@/app/stores/themeStore";
import { loginWithKeycloak, refreshAccessToken, logout } from "@/app/lib/auth/authClient";
import { useKeycloak } from "@/app/providers/KeycloakProvider";
import { IconTrophy, IconSun, IconMoon } from "@/app/components/Icons";

export default function Navbar() {
  const credential = useAuthStore((state) => state.credential);
  const clearCredential = useAuthStore((state) => state.clearCredential);
  const setCredential = useAuthStore((state) => state.setCredential);
  const isLoggedIn = !!credential;
  const displayName = credential?.username ?? credential?.email ?? "User";
  const hasExplicitlyLoggedOut = useRef(false);
  const { theme, toggle: toggleTheme } = useThemeStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const isBattle = pathname?.startsWith('/battle/') ?? false;
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const pendingAction = useRef<(() => void) | null>(null);
  const { keycloak, initialized } = useKeycloak();

  function withBattleGuard(action: () => void) {
    if (isBattle) {
      pendingAction.current = action;
      setShowLeaveConfirm(true);
    } else {
      action();
    }
  }

  function confirmLeave() {
    setShowLeaveConfirm(false);
    pendingAction.current?.();
    pendingAction.current = null;
  }

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
    if (!initialized) return;
    if (credential || hasExplicitlyLoggedOut.current) return;

    let isMounted = true;

    const restore = keycloak?.authenticated && keycloak.token
      ? loginWithKeycloak(keycloak.token)
      : refreshAccessToken();

    restore
      .then((res) => {
        if (!isMounted) return;
        setCredential({
          email: res.email,
          username: res.username ?? res.email,
          expiresAt: res.expires_at,
        });
      })
      .catch(() => {
        // No valid session - user stays logged out
      });

    return () => {
      isMounted = false;
    };
  }, [initialized, keycloak, credential, setCredential]);

  function handleLogout() {
    withBattleGuard(() => {
      hasExplicitlyLoggedOut.current = true;
      logout().finally(() => {
        clearCredential();
        keycloak?.logout({ redirectUri: globalThis.location.origin });
      });
    });
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
        onClick={(e) => {
          if (isBattle) {
            e.preventDefault();
            withBattleGuard(() => globalThis.location.assign('/'));
          }
        }}
      >
        Quizzard of Oz
      </Link>

      {/* Desktop navigation */}
      <div className="hidden md:flex items-center gap-3">
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Light Mode aktivieren' : 'Dark Mode aktivieren'}
          title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          className="nav-btn nav-btn-icon"
        >
          {theme === 'dark' ? <IconSun /> : <IconMoon />}
        </button>
        <Link
          href="/leaderboard"
          className="nav-btn nav-btn-ghost"
          onClick={(e) => {
            if (isBattle) {
              e.preventDefault();
              withBattleGuard(() => globalThis.location.assign('/leaderboard'));
            }
          }}
        >
          <IconTrophy size={16} />
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
          className="nav-btn nav-btn-icon"
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
              onClick={(e) => {
                setMobileOpen(false);
                if (isBattle) {
                  e.preventDefault();
                  withBattleGuard(() => globalThis.location.assign('/leaderboard'));
                }
              }}
              className="flex items-center gap-2 px-4 py-3 text-sm transition-colors hover:bg-white/10"
              style={{ color: "rgba(var(--oz-violet-text-rgb), 1)", textDecoration: "none" }}
            >
              <IconTrophy size={18} />
              <span>Leaderboard</span>
            </Link>
            <button
              type="button"
              role="menuitem"
              onClick={() => { toggleTheme(); setMobileOpen(false); }}
              className="w-full flex items-center gap-2 px-4 py-3 text-sm transition-colors hover:bg-white/10"
              style={{
                borderTop: "1px solid rgba(var(--oz-violet-light-rgb), 0.25)",
                color: "rgba(var(--oz-violet-text-rgb), 1)",
              }}
            >
              {theme === 'dark' ? <IconSun /> : <IconMoon />}
              <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
            </button>
            {isLoggedIn ? (
              <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMobileOpen(false);
                    handleLogout();
                  }}
                  className="w-full px-4 py-3 text-left text-sm transition-colors hover:bg-red-500/10"
                  style={{
                    borderTop: "1px solid rgba(var(--oz-violet-light-rgb), 0.25)",
                    color: "rgba(var(--oz-fire-title-rgb), 0.9)",
                  }}
                >
                  Abmelden
                </button>
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

      {/* Battle Leave Confirmation Dialog */}
      {showLeaveConfirm && (
        <dialog
          aria-modal="true"
          aria-label="Battle verlassen?"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            width: '100%',
            height: '100%',
            maxWidth: '100%',
            maxHeight: '100%',
            margin: 0,
            border: 'none',
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
          }}
        >
          <div
            style={{
              background: 'rgba(var(--oz-menu-bg-rgb), 0.98)',
              border: '1px solid rgba(var(--oz-fire-title-rgb), 0.4)',
              borderRadius: '1rem',
              padding: '28px 32px',
              maxWidth: '340px',
              width: '100%',
              textAlign: 'center',
              boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
            }}
          >
            <div
              style={{
                fontFamily: "'Bebas Neue', Impact, sans-serif",
                fontSize: '1.4rem',
                letterSpacing: '0.1em',
                color: 'rgba(var(--oz-fire-title-rgb), 0.95)',
                marginBottom: '10px',
              }}
            >
              Battle verlassen?
            </div>
            <p
              style={{
                color: 'rgba(var(--oz-text-secondary-rgb), 0.8)',
                fontSize: '0.85rem',
                lineHeight: 1.5,
                marginBottom: '22px',
              }}
            >
              Du verlässt ein laufendes Battle. Das Match wird als Aufgabe gewertet und du verlierst ELO-Punkte.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={confirmLeave}
                style={{
                  background: 'rgba(var(--oz-fire-title-rgb), 0.12)',
                  border: '1px solid rgba(var(--oz-fire-title-rgb), 0.45)',
                  borderRadius: '0.625rem',
                  padding: '10px 24px',
                  color: 'rgba(var(--oz-fire-title-rgb), 0.95)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Verlassen
              </button>
              <button
                type="button"
                onClick={() => { setShowLeaveConfirm(false); pendingAction.current = null; }}
                style={{
                  background: 'rgba(var(--oz-violet-rgb), 0.1)',
                  border: '1px solid rgba(var(--oz-violet-light-rgb), 0.3)',
                  borderRadius: '0.625rem',
                  padding: '10px 24px',
                  color: 'rgba(var(--oz-violet-text-rgb), 0.9)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Weiterspielen
              </button>
            </div>
          </div>
        </dialog>
      )}
    </header>
  );
}
