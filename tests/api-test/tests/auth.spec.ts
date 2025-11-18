import {test} from "../src/fixtures/clients";
import {expect} from "@playwright/test";
import {ErrorResponse, LoginResponse, RegisterResponse} from "../src/utils/types";
import {loginTestUser, TEST_USERS} from "./testUsers";
import {describe} from "node:test";
import {AuthClient} from "../src/clients/authClient";


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
describe("Token refresh", ()=> {
    test("can refresh with valid refresh token", async({ authClient})=>{
        await authClient.login(TEST_USERS.reporter.email,
            TEST_USERS.reporter.password)

        const result = await authClient.refresh()

        expect(result.status).toBe(200);
        expect(result.data.access_token).toBeTruthy();
        expect(result.data.expires_in).toBe(900);
    })

    test("refresh fails without cookie", async ({request}) => {
        const authClient = new AuthClient(request)
        const result = await authClient.refresh()
        expect(result.status).toBe(401)
    })

    test("refresh fails after logout", async ({authClient})=> {
        await authClient.login(TEST_USERS.reporter.email, TEST_USERS.reporter.password)

        await authClient.logout()

        const result = await authClient.refresh()

        expect(result.status).toBe(401)
    })

    test("new access token is different from old one", async ({authClient})=>{

        const loginResult = await authClient.login(
            TEST_USERS.reporter.email,
            TEST_USERS.reporter.password
        )
        const oldToken = loginResult.data.access_token

        await new Promise(resolve => setTimeout(resolve, 1000));

        const refreshResult = await authClient.refresh();
        const newToken = refreshResult.data.access_token;

        expect(newToken).toBeTruthy();
        expect(newToken).not.toBe(oldToken);


    })
})





test.describe("Logout", () => {

    test("logout returns 200", async ({ authClient }) => {
        const user = await loginTestUser(authClient, 'reporter');
        const result = await authClient.logout();
        expect(result.status).toBe(200);
    });

    test("logout all devices revokes all tokens", async ({ authClient }) => {
        const loginResult = await authClient.login(
            TEST_USERS.reporter.email,
            TEST_USERS.reporter.password
        );
        const token = loginResult.data.access_token;


        const result = await authClient.logoutAll(token);

        expect(result.status).toBe(200);

        const refreshResult = await authClient.refresh();
        expect(refreshResult.status).toBe(401);
    });
    test("cannot refresh after logout", async ({ authClient }) => {
        // Login
        await authClient.login(
            TEST_USERS.reporter.email,
            TEST_USERS.reporter.password
        );

        // Logout
        await authClient.logout();


        const refreshResult = await authClient.refresh();

        expect(refreshResult.status).toBe(401);
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