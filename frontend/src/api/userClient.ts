import type {ApiResponse, UserSearchResponse} from "../types/auth.ts";
import apiClient, {handle} from "./apiClient.ts";

export const userClient = {
    search : async (query:string) :Promise<ApiResponse<UserSearchResponse>> => {
        return handle<UserSearchResponse>(
            apiClient.get("users/search", {params: {q: query}})
        )
    }
}