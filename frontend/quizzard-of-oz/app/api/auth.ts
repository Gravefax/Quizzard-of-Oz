import LoginResponse from "@/app/models/LoginResponse";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE ?? "/api";

export async function loginWithGoogle(idToken: string): Promise<LoginResponse> {
    const res = await fetch(`${API_BASE_URL}/auth/google/login`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${idToken}`,
        },
        credentials: "include",
    });

    if (res.status === 400) {
        throw new Error("MISSING_TOKEN");
    }

    if (res.status === 401) {
        throw new Error("UNAUTHORIZED");
    }

    if (!res.ok) {
        throw new Error(`LOGIN_FAILED_${res.status}`);
    }

    return (await res.json()) as LoginResponse;
}

export async function refreshAccessToken(): Promise<LoginResponse> {
    const res = await fetch(`${API_BASE_URL}/auth/google/refresh`, {
        method: "GET",
        credentials: "include",
    });

    if (res.status === 401) {
        throw new Error("UNAUTHORIZED");
    }

    if (res.status === 403) {
        throw new Error("TOKEN_EXPIRED");
    }

    if (!res.ok) {
        throw new Error(`REFRESH_FAILED_${res.status}`);
    }

    return (await res.json()) as LoginResponse;
}

export async function logout(): Promise<void> {
    await fetch(`${API_BASE_URL}/auth/logout`, {
        method: "POST",
        credentials: "include",
    });
}
