"use client";

import { useEffect, useRef, useState } from "react";

type UserMenuProps = {
  displayName: string;
  onLogout: () => void;
};

export default function UserMenu({ displayName, onLogout }: Readonly<UserMenuProps>) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className="login-btn inline-flex items-center gap-2 px-6 py-2 font-medium rounded-lg"
      >
        <span>{displayName}</span>
      </button>

      {isOpen ? (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-52 rounded-lg border overflow-hidden shadow-lg backdrop-blur-sm"
          style={{
            background: "rgba(var(--oz-menu-bg-rgb), 0.92)",
            borderColor: "rgba(var(--oz-violet-light-rgb), 0.35)",
            boxShadow: "0 14px 28px rgba(var(--oz-violet-shadow-rgb), 0.28)",
          }}
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setIsOpen(false);
              onLogout();
            }}
            className="w-full px-4 py-3 text-left text-sm transition-colors hover:bg-white/10"
            style={{
              borderTop: "1px solid rgba(var(--oz-violet-light-rgb), 0.25)",
              color: "rgba(var(--oz-gold-light-rgb), 0.95)",
            }}
          >
            Abmelden
          </button>
        </div>
      ) : null}
    </div>
  );
}


