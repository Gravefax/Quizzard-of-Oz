import type { Metadata } from "next";
import "./globals.css";
import Navbar from "./Navbar";
import GoogleAuthProvider from "./providers/GoogleAuthProvider";
import { googleClientId } from "./lib/auth/authClient";



if (!googleClientId || googleClientId === "your_client_id_here") {
  throw new Error(
    "Missing GOOGLE_CLIENT_ID. Set a real Google OAuth Web Client ID in frontend/quizzard-of-oz/.env"
  );
}

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
        <GoogleAuthProvider clientId={googleClientId}>
            <Navbar />
            {children}
        </GoogleAuthProvider>
      </body>
    </html>
  );
}
