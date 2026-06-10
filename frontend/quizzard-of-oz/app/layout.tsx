import type { Metadata } from "next";
import "./globals.css";
import Navbar from "./Navbar";
import GoogleAuthProvider from "./providers/GoogleAuthProvider";
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
      <body className="min-h-full flex flex-col">
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
      </body>
    </html>
  );
}
