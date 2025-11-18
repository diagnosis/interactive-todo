import { apiClient } from "./client.ts";

export const authApi = {
    login: async (email: string, password: string) =>{
        const response = await apiClient.post("/auth/login", {
            email,
            password,
        })
        return response.data.data
    },
    register : async(email: string, password: string) => {
        const response = await apiClient.post("/auth/register", {
            email,
            password
        })
        return response.data.data
    },
    logout : async () => {
        await apiClient.post("/auth/logout")
    },
    listUsers: async () => {
        const response = await apiClient.get('/users')
        return response.data.data
    },
}

