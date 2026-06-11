import type { Metadata } from "next";
import "./globals.css";
import Navbar from "./Navbar";
import GoogleAuthProvider from "./providers/GoogleAuthProvider";
import ThemeProvider from "./providers/ThemeProvider";
import ConfigErrorFallback from "./components/ConfigErrorFallback";
import { googleClientId } from "./lib/auth/authClient";

const hasGoogleClientId = !!googleClientId && googleClientId !== "your_client_id_here";

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
          {hasGoogleClientId ? (
            <GoogleAuthProvider clientId={googleClientId}>
              <Navbar />
              {children}
            </GoogleAuthProvider>
          ) : (
            <ConfigErrorFallback
              message="NEXT_PUBLIC_GOOGLE_CLIENT_ID ist nicht gesetzt. Bitte setze eine gueltige Google OAuth Web Client ID in frontend/quizzard-of-oz/.env.local."
            />
          )}
        </ThemeProvider>
      </body>
    </html>
  );
}
