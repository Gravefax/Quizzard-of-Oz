import type { Metadata } from "next";
import "./globals.css";
import Navbar from "./Navbar";

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
        <Navbar />
        {children}
      </body>
    </html>
  );
}
