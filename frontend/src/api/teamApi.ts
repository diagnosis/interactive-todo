import { apiClient } from "./client";

export interface Team {
    id: string;
    name: string;
    owner_id: string;
    created_at: string;
    updated_at: string;
}

export interface TeamMember {
    team_id: string;
    user_id: string;
    role: 'owner' | 'admin' | 'member';
    created_at: string;
}

export interface User {
    id: string;
    email: string;
    user_type: 'regular' | 'task_manager' | 'admin';
}

export const teamApi = {
    listMyTeams: async (): Promise<{ user_id: string; teams: Team[] }> => {
        const response = await apiClient.get("/teams/mine");
        return response.data;
    },

    createTeam: async (name: string): Promise<Team> => {
        const response = await apiClient.post("/teams", { name });
        return response.data;
    },

    listMembers: async (teamId: string): Promise<{ team_id: string; members: TeamMember[] }> => {
        const response = await apiClient.get(`/teams/${teamId}/members`);
        return response.data;
    },

    addMember: async (teamId: string, userId: string, role: 'admin' | 'member'): Promise<void> => {
        await apiClient.post(`/teams/${teamId}/members`, {
            user_id: userId,
            role,
        });
    },

    removeMember: async (teamId: string, userId: string): Promise<void> => {
        await apiClient.delete(`/teams/${teamId}/members/${userId}`);
    },

    listTeamTasks: async (teamId: string) => {
        const response = await apiClient.get(`/teams/${teamId}/tasks`);
        return response.data;
    },

    listAssigneeTasksInTeam: async (teamId: string) => {
        const response = await apiClient.get(`/teams/${teamId}/tasks/assignee`);
        return response.data;
    },

    listReporterTasksInTeam: async (teamId: string) => {
        const response = await apiClient.get(`/teams/${teamId}/tasks/reporter`);
        return response.data;
    },
};
