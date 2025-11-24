// src/api/taskClient.ts
import apiClient, { handle } from "./apiClient"
import type { ApiResponse } from "../types/auth"
import type {
    PatchTaskInput,
    Task,
    TaskListResponse,
    TaskRequest,
    TaskStatus,
} from "../types/taskAndTeam"

export const taskClient = {
    listAssigneeTasksInTeam: async (
        teamId: string
    ): Promise<ApiResponse<TaskListResponse>> =>
        handle<TaskListResponse>(apiClient.get(`/teams/${teamId}/tasks/assignee`)),

    listReporterTasksInTeam: async (
        teamId: string
    ): Promise<ApiResponse<TaskListResponse>> =>
        handle<TaskListResponse>(apiClient.get(`/teams/${teamId}/tasks/reporter`)),

    listTeamTasks: async (
        teamId: string
    ): Promise<ApiResponse<TaskListResponse>> =>
        handle<TaskListResponse>(apiClient.get(`/teams/${teamId}/tasks`)),

    create: async (payload: TaskRequest): Promise<ApiResponse<Task>> =>
        handle<Task>(apiClient.post("/tasks", payload)),

    get: async (id: string): Promise<ApiResponse<Task>> =>
        handle<Task>(apiClient.get(`/tasks/${id}`)),

    delete: async (id: string): Promise<ApiResponse<void>> =>
        handle<void>(apiClient.delete(`/tasks/${id}`)),

    updateTask: async (
        id: string,
        status: TaskStatus
    ): Promise<ApiResponse<Task>> =>
        handle<Task>(apiClient.patch(`/tasks/${id}/status`, { status })),

    // 👇 separate assign endpoint
    assignTask: async (
        id: string,
        assignee_id: string | null
    ): Promise<ApiResponse<Task>> =>
        handle<Task>(apiClient.patch(`/tasks/${id}/assign`, { assignee_id })),

    patchTask: async (
        id: string,
        payload: PatchTaskInput
    ): Promise<ApiResponse<Task>> =>
        handle<Task>(apiClient.patch(`/tasks/${id}/update-details`, payload)),
}