"use client";

import { useEffect, useState } from "react";
import {GoogleCredentialResponse, GoogleLogin, GoogleOAuthProvider} from "@react-oauth/google";
import { loginWithGoogle } from "@/app/lib/auth/authActions";
import useAuthStore from "@/app/stores/authStore";
import AuthCredential from "@/app/models/AuthCredential";


export default function LoginButton() {
    const [clientId, setClientId] = useState<string>("");
    const authStore = useAuthStore();

    useEffect(() => {
        let isMounted = true;

        fetch("/api/runtime-config", { cache: "no-store" })
            .then(async (res) => {
                if (!res.ok) {
                    throw new Error(`RUNTIME_CONFIG_FAILED_${res.status}`);
                }
                return res.json() as Promise<{ googleClientId?: string }>;
            })
            .then((config) => {
                if (!isMounted) return;
                setClientId(config.googleClientId ?? "");
            })
            .catch((err) => {
                console.error("Runtime config konnte nicht geladen werden", err);
            });

        return () => {
            isMounted = false;
        };
    }, []);

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
            if (err instanceof Error && err.message === "UNAUTHORIZED") {
                console.error("Token ungueltig oder abgelaufen");
                return;
            }

            console.error("Login fehlgeschlagen", err);
        }
    };
    
    const handleLoginError = () => {
        console.error("Google Login fehlgeschlagen");
    };

    if (!clientId) {
        return null;
    }
    
    return (
        <GoogleOAuthProvider clientId={clientId}>
            <GoogleLogin onSuccess={handleLoginSuccess} onError={handleLoginError}></GoogleLogin>
        </GoogleOAuthProvider>
    );
}