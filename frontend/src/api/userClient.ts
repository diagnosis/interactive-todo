import type {
    ApiResponse,
    LoginResponse,
    ProfileUpdatePayload,
    UpdatePasswordPayload,
    UserSearchResponse
} from "../types/auth.ts";
import apiClient, {handle} from "./apiClient.ts";



export const userClient = {
    search : async (query:string) :Promise<ApiResponse<UserSearchResponse>> => {
        return handle<UserSearchResponse>(
            apiClient.get("users/search", {params: {q: query}})
        )
    }, 
    updateProfile: async (payload: ProfileUpdatePayload) : Promise<ApiResponse<{user: LoginResponse["user"]}>> =>{
        return handle(apiClient.patch("users/me", payload))
    },
    updatePassword: async (payload: UpdatePasswordPayload): Promise<ApiResponse<{userID:string; message:string}>> => {
        return handle(apiClient.patch("/users/me/password", payload))
    }
}