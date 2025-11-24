import type { ApiResponse } from "../types/auth.ts";
import type {
    MemberList, RemovedMemberResponse,
    Team,
    TeamList,
    TeamMember,
    TeamMemberRequest,
} from "../types/taskAndTeam.ts";
import apiClient, { handle } from "./apiClient.ts";

export const teamClient = {
    // POST /teams
    create: async (name: string): Promise<ApiResponse<Team>> =>
        handle<Team>(apiClient.post("/teams", { name })),

    // GET /teams/mine
    listTeamsForUser: async (): Promise<ApiResponse<TeamList>> =>
        handle<TeamList>(apiClient.get("/teams/mine")),

    // GET /teams/{team_id}/members
    listMembers: async (team_id: string): Promise<ApiResponse<MemberList>> =>
        handle<MemberList>(apiClient.get(`/teams/${team_id}/members`)),

    // POST /teams/{team_id}/members
    addMember: async (
        req: TeamMemberRequest
    ): Promise<ApiResponse<TeamMember>> => {
        const { team_id, ...payload } = req;
        return handle<TeamMember>(
            apiClient.post(`/teams/${team_id}/members`, payload),
        );
    },

    // DELETE /teams/{team_id}/members/{user_id}
    deleteMember: async (
        team_id: string,
        user_id: string
    ): Promise<ApiResponse<RemovedMemberResponse>> =>
        handle<RemovedMemberResponse>(apiClient.delete(`/teams/${team_id}/members/${user_id}`)),
};