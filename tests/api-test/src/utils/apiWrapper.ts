import {APIRequestContext, APIResponse} from "@playwright/test";
import {ApiResponse} from "./types";

export class ApiWrapper {
    constructor(private request: APIRequestContext) {}

    async post<T>(
        url: string,
        data?: any,
        headers?: Record<string, string>
    ): Promise<ApiResponse<T>> {
        const response = await this.request.post(url, {
            data,
            headers
        });
        return this.handleResponse<T>(response);
    }

    async get<T>(
        url: string,
        headers?: Record<string, string>
    ): Promise<ApiResponse<T>> {
        const response = await this.request.get(url, { headers });
        return this.handleResponse<T>(response);
    }

    async patch<T>(
        url: string,
        data?: any,
        headers?: Record<string, string>
    ): Promise<ApiResponse<T>> {
        const response = await this.request.patch(url, {
            data,
            headers
        });
        return this.handleResponse<T>(response);
    }

    async delete<T>(
        url: string,
        headers?: Record<string, string>
    ): Promise<ApiResponse<T>> {
        const response = await this.request.delete(url, { headers });
        return this.handleResponse<T>(response);
    }

    private async handleResponse<T>(response: APIResponse): Promise<ApiResponse<T>> {
        const status = response.status();
        const json = await response.json();

        if (!response.ok()) {
            return { status, error: json.error || json };
        }

        return { status, data: json.data || json };
    }
}