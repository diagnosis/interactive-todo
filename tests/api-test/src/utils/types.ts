// src/utils/types.ts
export interface ApiResponse<T> {
    status: number;
    data?: T;
    error?: ErrorResponse;
}

export interface ErrorResponse {
    code: string;
    message: string;
    timestamp: string;
}

export interface LoginResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
    user: {
        id: string;
        email: string;
        type: string;
    };
}

export interface RegisterResponse {
    user_id: string;
    email: string;
    user_type: string;
    created_at: string;
}

export type TaskStatus = "open" | "in_progress" | "done" | "canceled";

export interface TaskResponse {
    id: string;
    title: string;
    description: string;
    reporter_id: string;
    assignee_id: string;
    status: TaskStatus;
    due_at: string;
    created_at: string;
    updated_at: string;
}

export interface CreateTaskData {
    title: string;
    description?: string;
    assignee_id?: string;
    due_at: string;
}
