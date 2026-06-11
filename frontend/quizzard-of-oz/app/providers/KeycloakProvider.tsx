"use client";

import { createContext, useContext, useEffect, useState } from "react";

type KeycloakInstance = import("keycloak-js").default;

type KeycloakContextValue = {
  keycloak: KeycloakInstance | null;
  initialized: boolean;
};

const KeycloakContext = createContext<KeycloakContextValue>({
  keycloak: null,
  initialized: false,
});

export function useKeycloak() {
  return useContext(KeycloakContext);
}

export default function KeycloakProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [state, setState] = useState<KeycloakContextValue>({
    keycloak: null,
    initialized: false,
  });

  useEffect(() => {
    let cancelled = false;

    import("keycloak-js").then(({ default: Keycloak }) => {
      if (cancelled) return;

      const kc = new Keycloak({
        url: process.env.NEXT_PUBLIC_KEYCLOAK_URL!,
        realm: process.env.NEXT_PUBLIC_KEYCLOAK_REALM!,
        clientId: process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID!,
      });

      kc.init({ checkLoginIframe: false })
        .then(() => {
          if (!cancelled) setState({ keycloak: kc, initialized: true });
        })
        .catch(() => {
          if (!cancelled) setState({ keycloak: kc, initialized: true });
        });
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <KeycloakContext.Provider value={state}>
      {children}
    </KeycloakContext.Provider>
  );
}
