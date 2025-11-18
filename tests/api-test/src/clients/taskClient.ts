import { ApiWrapper } from "../utils/apiWrapper";
import { APIRequestContext } from "@playwright/test";
import {ApiResponse, CreateTaskData, TaskListResponse, TaskResponse, TaskStatus} from "../utils/types";

export class TaskClient {
    private api: ApiWrapper;

    constructor(request: APIRequestContext) {
        this.api = new ApiWrapper(request);
    }

    async create(token: string, data: CreateTaskData): Promise<ApiResponse<TaskResponse>> {
        return this.api.post<TaskResponse>(
            "/tasks",
            data,
            { 'Authorization': `Bearer ${token}` }
        );
    }

    async getById(token: string, id: string): Promise<ApiResponse<TaskResponse>> {
        return this.api.get<TaskResponse>(
            `/tasks/${id}`,
            { 'Authorization': `Bearer ${token}` }
        );
    }

    async listAsAssignee(token: string): Promise<ApiResponse<TaskListResponse>> {
        return this.api.get<TaskListResponse>(
            "/tasks/assignee",
            { 'Authorization': `Bearer ${token}` }
        );
    }

    async listAsReporter(token: string): Promise<ApiResponse<TaskListResponse>> {
        return this.api.get<TaskListResponse>(
            "/tasks/reporter",
            { 'Authorization': `Bearer ${token}` }
        );
    }

    async updateStatus(
        token: string,
        taskId: string,
        status: TaskStatus
    ): Promise<ApiResponse<TaskResponse>> {
        return this.api.patch<TaskResponse>(
            `/tasks/${taskId}/status`,
            { status },
            { 'Authorization': `Bearer ${token}` }
        );
    }

    async assign(
        token: string,
        taskId: string,
        assigneeId: string
    ): Promise<ApiResponse<TaskResponse>> {
        return this.api.patch<TaskResponse>(
            `/tasks/${taskId}/assign`,
            { assignee_id: assigneeId },
            { 'Authorization': `Bearer ${token}` }
        );
    }

    async delete(token: string, taskId: string): Promise<ApiResponse<void>> {
        return this.api.delete<void>(
            `/tasks/${taskId}`,
            { 'Authorization': `Bearer ${token}` }
        );
    }
}