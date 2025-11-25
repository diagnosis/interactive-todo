// src/api/apiClient.ts
import type { ApiError, ApiResponse } from "../types/auth.ts";
import axios, { type AxiosResponse } from "axios";

export const API_BASE_URL =
    import.meta.env.PROD ? "/api" : "http://localhost:8080";

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
    headers: {
        "Content-Type": "application/json",
    },
    withCredentials: true,
});

apiClient.interceptors.request.use(
    (config) => {
        const accessToken = localStorage.getItem("access_token");
        if (accessToken) {
            config.headers["Authorization"] = `Bearer ${accessToken}`;
        }
        return config;
    },
    (error) => Promise.reject(error),
);

let isRefreshing = false;

apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (error.response?.status !== 401) {
            return Promise.reject(error);
        }

        if ((originalRequest as any)._retry) {
            return Promise.reject(error);
        }
        (originalRequest as any)._retry = true;

        const url: string = originalRequest?.url || "";
        if (
            url.includes("/auth/login") ||
            url.includes("/auth/register") ||
            url.includes("/auth/refresh")
        ) {
            return Promise.reject(error);
        }

        if (isRefreshing) {
            return Promise.reject(error);
        }

        isRefreshing = true;

        try {
            const refreshRes = await axios.post(
                `${API_BASE_URL}/auth/refresh`,
                {},
                { withCredentials: true },
            );

            const payload = refreshRes.data?.data ?? refreshRes.data;
            const newToken = payload?.access_token;

            if (newToken) {
                localStorage.setItem("access_token", newToken);
                originalRequest.headers = originalRequest.headers ?? {};
                originalRequest.headers["Authorization"] = `Bearer ${newToken}`;
            }

            return apiClient(originalRequest);
        } catch (refreshErr) {
            localStorage.removeItem("access_token");
            localStorage.removeItem("current_user");
            window.location.href = "/login";
            return Promise.reject(refreshErr);
        } finally {
            isRefreshing = false;
        }
    },
);

export async function handle<T>(
    promise: Promise<AxiosResponse<any>>,
): Promise<ApiResponse<T>> {
    try {
        const res = await promise;
        const payload = res.data?.data ?? res.data;

        return {
            status: res.status,
            data: payload as T,
            error: undefined,
        };
    } catch (error: any) {
        const status = error.response?.status ?? 500;
        const raw = error.response?.data;
        const rawError = raw?.error ?? raw;

        const apiError: ApiError = {
            code: rawError?.code ?? "UNKNOWN_ERROR",
            message: rawError?.message ?? "Unexpected error",
            timestamp: rawError?.timestamp ?? new Date().toISOString(),
        };

        return {
            status,
            data: null as T,
            error: apiError,
        };
    }
}

export default apiClient;