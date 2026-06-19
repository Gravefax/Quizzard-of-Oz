import type { Metadata } from "next";
import "./globals.css";
import Navbar from "./Navbar";
import KeycloakProvider from "./providers/KeycloakProvider";
import ThemeProvider from "./providers/ThemeProvider";
import ConfigErrorFallback from "./components/ConfigErrorFallback";
import { keycloakUrl, keycloakRealm, keycloakClientId } from "./lib/auth/authClient";

const hasKeycloakConfig =
  !!keycloakUrl &&
  !!keycloakRealm &&
  !!keycloakClientId &&
  keycloakUrl !== "your_keycloak_url_here";

export const metadata: Metadata = {
  title: "Quizard of Oz",
  description: "Das ultimative Quiz-Erlebnis",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" className="h-full antialiased">
      <head>
        {/* Anti-FOUC: Setzt 'light'-Klasse vor dem ersten Paint */}
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            var s = JSON.parse(localStorage.getItem('quizzard-theme') || '{}');
            if (s.state && s.state.theme === 'light') document.documentElement.classList.add('light');
          } catch(e) {}
        ` }} />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          {hasKeycloakConfig ? (
            <KeycloakProvider>
              <Navbar />
              {children}
            </KeycloakProvider>
          ) : (
            <ConfigErrorFallback
              message="Keycloak ist nicht konfiguriert. Bitte setze NEXT_PUBLIC_KEYCLOAK_URL, NEXT_PUBLIC_KEYCLOAK_REALM und NEXT_PUBLIC_KEYCLOAK_CLIENT_ID in frontend/quizzard-of-oz/.env."
            />
          )}
        </ThemeProvider>
      </body>
    </html>
  );
}
