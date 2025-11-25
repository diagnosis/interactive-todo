import apiClient, { handle } from "./apiClient";
import type { ApiResponse, LoginResponse, RegisterPayload } from "../types/auth.ts";

export function getCurrentUser() {
    const raw = localStorage.getItem('current_user');
    if (!raw) return null;
    try {
        return JSON.parse(raw) as LoginResponse['user'];
    } catch {
        return null;
    }
}

const authClient = {
    login: async (email: string, password: string): Promise<ApiResponse<LoginResponse>> => {
        const res = await handle<LoginResponse>(
            apiClient.post("/auth/login", { email, password })
        );

        if (res.data?.access_token) {
            localStorage.setItem("access_token", res.data.access_token);
        }
        if (res.data?.user) {
            localStorage.setItem("current_user", JSON.stringify(res.data.user));
        }

        return res;
    },

    register: async (
        email: string,
        password: string,
        displayName: string,
        wantsManager: boolean,
    ): Promise<ApiResponse<RegisterPayload>> => {
        return handle<RegisterPayload>(
            apiClient.post("/auth/register", {
                email,
                password,
                display_name: displayName,
                wants_manager: wantsManager,
            })
        );
    },

    refresh: async (): Promise<ApiResponse<LoginResponse>> => {
        const res = await handle<LoginResponse>(
            apiClient.post("/auth/refresh")
        );

        if (res.data?.access_token) {
            localStorage.setItem("access_token", res.data.access_token);
        }
        if (res.data?.user) {
            localStorage.setItem("current_user", JSON.stringify(res.data.user));
        }

        return res;
    },

    logout: async (): Promise<ApiResponse<void>> => {
        const res = await handle<void>(
            apiClient.post("/auth/logout")
        );

        localStorage.removeItem("access_token");
        localStorage.removeItem("current_user");
        return res;
    },

    logoutAll: async (): Promise<ApiResponse<void>> => {
        const res = await handle<void>(
            apiClient.post("/auth/logout-all")
        );

        localStorage.removeItem("access_token");
        localStorage.removeItem("current_user");
        return res;
    }
};

export default authClient;