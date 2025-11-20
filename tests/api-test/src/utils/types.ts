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

export interface TaskListResponse {
    userId: string;
    tasks: TaskResponse[];
}
export interface TaskResponse {
    id: string;
    team_id: string;        // 🔴 add this to match backend JSON
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
    team_id: string;        // 🔴 NEW – required by backend
    title: string;
    description?: string;
    assignee_id?: string;
    due_at: string;
}


export interface TeamResponse {
    id: string;
    name: string;
    owner_id: string;
    created_at: string;
    updated_at: string;
}
export interface TeamListResponse {
    team_id?: string;
    teams: TeamResponse[];
}

export type TeamRole = "owner" | "admin" | "member";

export interface TeamMember {
    team_id: string;
    user_id: string;
    role: TeamRole;
    created_at: string;
}

export interface TeamMembersResponse {
    team_id: string;
    members: TeamMember[];
}

export interface BasicUser {
    id: string;
    email: string;
    user_type: string;
    created_at?: string;
    updated_at?: string;
}

export interface AddMemberResponse {
    teamID: string;
    member: BasicUser;
}
export interface RemoveMemberResponse {
    message: string;
    team_id: string;
    user_id: string;
}

export interface TeamTaskListResponse {
    user_id: string;
    team_id: string;
    tasks: TaskResponse[];
}