"use client";

import { useKeycloak } from "@/app/providers/KeycloakProvider";

export default function LoginButton() {
  const { keycloak, initialized } = useKeycloak();

  if (!initialized) return null;

  return (
    <button
      type="button"
      onClick={() => keycloak?.login()}
      className="nav-btn nav-btn-user"
      aria-label="Anmelden"
    >
      Anmelden
    </button>
  );
}
