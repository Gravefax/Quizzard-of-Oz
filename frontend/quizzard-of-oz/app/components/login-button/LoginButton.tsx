"use client";

import dynamic from "next/dynamic";
import { loginWithGoogle } from "@/app/lib/auth/authClient";
import useAuthStore from "@/app/stores/authStore";
import AuthCredential from "@/app/models/AuthCredential";

type GoogleCredentialResponse = {
    credential?: string;
};

const GoogleLogin = dynamic(
    () => import("@react-oauth/google").then((mod) => mod.GoogleLogin),
    { ssr: false }
);

export default function LoginButton() {
    const authStore = useAuthStore();

    const toCredential = (result: { email?: string; username?: string; expires_at?: number }): AuthCredential => ({
        email: result.email,
        username: result.username ?? result.email,
        expiresAt: result.expires_at,
    });

    const handleLoginSuccess = async (credentialResponse: GoogleCredentialResponse) => {
        const idToken = credentialResponse.credential;

        if (!idToken) {
            console.error("No token provided");
            return;
        }

        try {
            const result = await loginWithGoogle(idToken);
            authStore.setCredential(toCredential(result));
        } catch (err) {
            if (err instanceof Error && err.message.startsWith("UNAUTHORIZED:")) {
                const reason = err.message.replace("UNAUTHORIZED:", "");
                console.error(`Token ungueltig oder abgelaufen: ${reason}`);
                return;
            }

            console.error("Login fehlgeschlagen", err);
        }
    };
    
    const handleLoginError = () => {
        console.error("Google Login fehlgeschlagen");
    };
    
    return (
        <GoogleLogin onSuccess={handleLoginSuccess} onError={handleLoginError}></GoogleLogin>
    );
}