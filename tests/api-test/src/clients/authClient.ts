
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
}