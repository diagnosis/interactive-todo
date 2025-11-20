import { apiClient } from "./client.ts";

export const taskApi = {
    listAsReporter: async () => {
        const response = await apiClient.get("/tasks/reporter")
        return response.data.data
    },
    listAsAssignee :async () =>{
        const response = await apiClient.get("/tasks/assignee")
        return response.data.data
    },

    create: async (data : {
        team_id: string,
        title : string,
        description?: string,
        assignee_id?: string,
        due_at: string,
    }) => {
        const response = await apiClient.post("/tasks", data)
        return response.data.data
    },

    updateStatus: async (taskId: string, status: string) =>{
        const response =
            await apiClient.patch(`/tasks/${taskId}/status`, {status})
        return response.data.data
    },

    assign: async (taskId: string, assignee_id:string) =>{
        const response =
            await apiClient.patch(`/tasks/${taskId}/assign`, {assignee_id})
        return  response.data.data
    },

    delete: async (taskId: string) => {
        const response = await apiClient.delete(`/tasks/${taskId}`)
        return response.data.data
    },
    getTask : async (taskId: string) =>{
        const response = await apiClient.get(`/tasks/${taskId}`)
        return response.data.data
    },

    update: async (taskId: string, data: {
        title?: string,
        description?: string,
        due_at?: string,
    }) => {
        const response = await apiClient.patch(`/tasks/${taskId}/update-details`, data)
        return response.data.data
    }

}