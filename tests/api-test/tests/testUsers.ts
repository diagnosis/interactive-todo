import {AuthClient} from "../src/clients/authClient";

export const TEST_USERS = {
    reporter:{
        email: "reporter@example.com",
        password: "Test1234"
    },
    assignee1: {
        email: "assignee1@example.com",
        password: "Test1234"
    },
    assignee2: {
        email: "assignee2@example.com",
        password: "Test1234"
    },
    assignee3: {
        email: "assignee3@example.com",
        password: "Test1234"
    },
    outsider: {
        email: "outsider@example.com",
        password: "Test1234"
    },
    taskManager:{
    "email":"test-manager@example.com",
        "password":"Test1234"
    },
}



export async function loginTestUser(authClient :AuthClient, userKey: keyof typeof TEST_USERS){
    const user = TEST_USERS[userKey]

    const result = await authClient.login(user.email, user.password)
    return {
        ...user,
        token: result.data.access_token,
        userId: result.data.user.id
    }
}

