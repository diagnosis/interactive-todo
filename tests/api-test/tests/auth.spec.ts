import {test} from "../src/fixtures/clients";
import {expect} from "@playwright/test";
import {ErrorResponse, LoginResponse, RegisterResponse} from "../src/utils/types";


const uniqueEmail = (prefix:string)=> `${prefix}-${Date.now()}@example.com`

test.describe("Authentication - Happy Path", ()=>{

    test("successful register return user data", async ( {authClient})=>{
        const email = uniqueEmail("test")
        const result = await authClient.register(email, process.env.COMMON_PASS)
        expect(result.status).toBe(201)
        validateRegisterData(result.data)
    })
    test('successful login returns access token and valid status', async({authClient})=>{
        const email = uniqueEmail("test")
        const registerResult = await authClient.register(email, process.env.COMMON_PASS)
        expect(registerResult.status).toBe(201)
        const loginResult = await authClient.login(email, process.env.COMMON_PASS)
        expect(loginResult.status).toBe(200)
        validateLoginData(loginResult.data)
    })
})
test.describe("Authentication - Validation Errors", () => {

    test("register fails with short password", async ({ authClient }) => {
        const email = uniqueEmail("test")
        const result = await authClient.register(email, "63636")
        expect(result.status).toBe(400)
        expect(result.error.timestamp).toBeTruthy()
        validateError(result.error,"BAD_REQUEST", "Password must be at least 8 characters")
    });

    test("register fails with invalid email format", async ({ authClient }) => {
        const email = "hacer2gmail.com"
        const result = await authClient.register(email, process.env.COMMON_PASS)
        expect(result.status).toBe(400)
        expect(result.error.timestamp).toBeTruthy()
        validateError(result.error,"BAD_REQUEST", "Invalid email address")
    });

    test("register fails with duplicate email", async ({ authClient }) => {
        const email = uniqueEmail("test")
        const result = await authClient.register(email, process.env.COMMON_PASS)
        expect(result.status).toBe(201)
        const secondRegister = await authClient.register(email, process.env.COMMON_PASS)
        expect(secondRegister.status).toBe(409)
        validateError(secondRegister.error, "EMAIL_ALREADY_EXISTS", "Email address already registered")

    });

    test("login fails with wrong password", async ({ authClient }) => {
        const email = uniqueEmail("test")
        const result = await authClient.register(email, process.env.COMMON_PASS)
        expect(result.status).toBe(201)
        const wrongPassword = await authClient.login(email, "WrongPass44")
        expect(wrongPassword.status).toBe(401)
        validateError(wrongPassword.error, "INVALID_CREDENTIALS","Invalid email or password")
    });

    test("login fails with non-existent email", async ({ authClient }) => {

        const wrongPassword = await authClient.login("thisemail@never.exist", "WrongPass44")
        expect(wrongPassword.status).toBe(401)
        validateError(wrongPassword.error, "INVALID_CREDENTIALS","Invalid email or password")
    });
});

function validateRegisterData(result:RegisterResponse){
    expect(result.email).toBeTruthy()
    expect(result.user_id).toBeTruthy()
    expect(result.created_at).toBeTruthy()
    expect(result.user_type).toBeTruthy()
}

function validateLoginData(result:LoginResponse){
    expect(result.access_token).toBeTruthy()
    expect(result.expires_in).toBe(900)
    expect(result.user.email).toBeTruthy()
    expect(result.user.id).toBeTruthy()
    expect(result.token_type).toBe("Bearer")
    expect(result.user.type).toBe("employee")
}
function validateError(result:ErrorResponse,code:string, message:string){
    expect(code).toBe(result.code)
    expect(message).toBe(result.message)
}