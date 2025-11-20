import { APIRequestContext } from "@playwright/test";
import { ApiWrapper } from "../utils/apiWrapper";
import {
    ApiResponse,
    TeamResponse,
    TeamListResponse,
    TeamMembersResponse,
    AddMemberResponse,
    RemoveMemberResponse,
    TeamTaskListResponse,
    TeamRole,
} from "../utils/types";

export class TeamClient {
    private api: ApiWrapper;

    constructor(request: APIRequestContext) {
        this.api = new ApiWrapper(request);
    }

    // POST /teams
    async create(
        token: string,
        { name }: { name: string }
    ): Promise<ApiResponse<TeamResponse>> {
        return this.api.post<TeamResponse>(
            "/teams",
            { name },
            { "Authorization": `Bearer ${token}` }
        );
    }

    // GET /teams/mine
    async listMine(token: string): Promise<ApiResponse<TeamListResponse>> {
        return this.api.get<TeamListResponse>(
            "/teams/mine",
            { "Authorization": `Bearer ${token}` }
        );
    }

    // GET /teams/{team_id}/members
    async listMembers(
        token: string,
        teamId: string
    ): Promise<ApiResponse<TeamMembersResponse>> {
        return this.api.get<TeamMembersResponse>(
            `/teams/${teamId}/members`,
            { "Authorization": `Bearer ${token}` }
        );
    }

    // POST /teams/{team_id}/members
    async addMember(
        token: string,
        teamId: string,
        userId: string,
        role: TeamRole
    ): Promise<ApiResponse<AddMemberResponse>> {
        return this.api.post<AddMemberResponse>(
            `/teams/${teamId}/members`,
            { user_id: userId, role },
            { "Authorization": `Bearer ${token}` }
        );
    }

    // DELETE /teams/{team_id}/members/{user_id}
    async removeMember(
        token: string,
        teamId: string,
        userId: string
    ): Promise<ApiResponse<RemoveMemberResponse>> {
        return this.api.delete<RemoveMemberResponse>(
            `/teams/${teamId}/members/${userId}`,
            { "Authorization": `Bearer ${token}` }
        );
    }

    // GET /teams/{team_id}/tasks
    async listTeamTasks(
        token: string,
        teamId: string
    ): Promise<ApiResponse<TeamTaskListResponse>> {
        return this.api.get<TeamTaskListResponse>(
            `/teams/${teamId}/tasks`,
            { "Authorization": `Bearer ${token}` }
        );
    }

    // GET /teams/{team_id}/tasks/assignee
    async listAssigneeTasksInTeam(
        token: string,
        teamId: string
    ): Promise<ApiResponse<TeamTaskListResponse>> {
        return this.api.get<TeamTaskListResponse>(
            `/teams/${teamId}/tasks/assignee`,
            { "Authorization": `Bearer ${token}` }
        );
    }

    // GET /teams/{team_id}/tasks/reporter
    async listReporterTasksInTeam(
        token: string,
        teamId: string
    ): Promise<ApiResponse<TeamTaskListResponse>> {
        return this.api.get<TeamTaskListResponse>(
            `/teams/${teamId}/tasks/reporter`,
            { "Authorization": `Bearer ${token}` }
        );
    }
}

