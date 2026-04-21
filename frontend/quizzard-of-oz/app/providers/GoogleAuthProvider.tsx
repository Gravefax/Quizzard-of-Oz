"use client";

import dynamic from "next/dynamic";

type GoogleAuthProviderProps = {
  clientId: string;
  children: React.ReactNode;
};

const GoogleOAuthProvider = dynamic(
  () =>
    import("@react-oauth/google").then(
      (mod) => mod.GoogleOAuthProvider as React.ComponentType<GoogleAuthProviderProps>
    ),
  { ssr: false }
);

export default function GoogleAuthProvider({
  clientId,
  children,
}: Readonly<GoogleAuthProviderProps>) {
  return <GoogleOAuthProvider clientId={clientId}>{children}</GoogleOAuthProvider>;
}
