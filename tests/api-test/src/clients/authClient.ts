
import {ApiWrapper} from "../utils/apiWrapper";
import {APIRequestContext} from "@playwright/test";
import {ApiResponse, LoginResponse, RegisterResponse} from "../utils/types";

export class AuthClient {
    private api : ApiWrapper;

    constructor(request: APIRequestContext) {
        this.api =  new ApiWrapper(request)
    }

    async login(email: string, password: string):Promise<ApiResponse<LoginResponse>>{
        return this.api.post("auth/login", { email, password})
    }

    async register(email: string, password: string):Promise<ApiResponse<RegisterResponse>>{
        return this.api.post("auth/register", {email, password})
    }
    async logout():Promise<ApiResponse<void>>{
        return this.api.post<void>("/auth/logout")
    }
    async logoutAll(token:string):Promise<ApiResponse<void>>{
        return this.api.post<void>("/auth/logout-all",undefined, {
            "Authorization": `Bearer ${token}`
        })
    }
    async refresh(): Promise<ApiResponse<LoginResponse>> {
        return this.api.post<LoginResponse>("/auth/refresh");
    }
}

