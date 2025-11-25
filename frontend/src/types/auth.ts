export interface ApiError {
    code: string;
    message: string;
    timestamp: string;
}

export interface ApiResponse<T> {
    status: number;
    data?: T;
    error?: ApiError;
}

export type UserType = "employee" | "admin" | "task_manager"

export interface AuthUser {
    id: string
    email: string
    type: UserType
    display_name: string | null
}

export interface LoginResponse {
    access_token: string
    token_type: string
    expires_in: number
    user: AuthUser
}

export interface RegisterPayload {
    email: string
    password: string
    display_name: string
    wants_manager: boolean
}
export interface UserOption {
    id: string
    email: string
    display_name?: string | null
}

export interface UserSearchResponse {
    users: UserOption[]
}
export interface ProfileUpdatePayload{
    display_name?: string | null
}
export interface UpdatePasswordPayload{
    current_password: string;
    password: string;
}
