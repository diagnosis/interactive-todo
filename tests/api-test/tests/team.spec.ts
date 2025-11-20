import { test, expect } from "../src/fixtures/clients";
import { loginTestUser } from "./testUsers";
import { TeamClient } from "../src/clients/teamClient";
import { AuthClient } from "../src/clients/authClient";

const uniqueEmail = (prefix: string) =>
    `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;

const uniqueTeamName = (prefix: string) =>
    `${prefix}-team-${Date.now()}-${Math.random().toString(16).slice(2)}`;

async function registerAndLogin(authClient: AuthClient) {
    const email = uniqueEmail("teamuser");
    const password = process.env.COMMON_PASS!;
    const register = await authClient.register(email, password);
    expect(register.status).toBe(201);

    const login = await authClient.login(email, password);
    expect(login.status).toBe(200);

    return {
        email,
        password,
        token: login.data.access_token,
        userId: login.data.user.id,
    };
}

test.describe("Teams - Management", () => {
    test("task manager can create a team and see it in /teams/mine", async ({
                                                                                authClient,
                                                                                teamClient,
                                                                            }) => {
        const manager = await loginTestUser(authClient, "taskManager");
        const teamName = uniqueTeamName("QA TEAM");

        const createResult = await teamClient.create(manager.token, { name: teamName });
        expect(createResult.status).toBe(201);

        const team = createResult.data;
        expect(team.name).toBe(teamName);
        expect(team.owner_id).toBe(manager.userId);

        const mine = await teamClient.listMine(manager.token);
        expect(mine.status).toBe(200);
        expect(mine.data.teams.map((t) => t.id)).toContain(team.id);
    });

    test("regular employee cannot create team", async ({ authClient, teamClient }) => {
        const user = await registerAndLogin(authClient);

        const createResult = await teamClient.create(user.token, { name: "Should Fail" });
        expect(createResult.status).toBe(403);
    });

    test("manager can add users as team members and they can see themselves in /teams/{id}/members", async ({
                                                                                                                authClient,
                                                                                                                teamClient,
                                                                                                            }) => {
        const manager = await loginTestUser(authClient, "taskManager");

        const teamRes = await teamClient.create(manager.token, {
            name: uniqueTeamName("DEV TEAM"),
        });
        expect(teamRes.status).toBe(201);
        const team = teamRes.data;

        const member1 = await registerAndLogin(authClient);
        const member2 = await registerAndLogin(authClient);

        const add1 = await teamClient.addMember(
            manager.token,
            team.id,
            member1.userId,
            "member"
        );
        expect(add1.status).toBe(200);

        const add2 = await teamClient.addMember(
            manager.token,
            team.id,
            member2.userId,
            "member"
        );
        expect(add2.status).toBe(200);

        const membersAsManager = await teamClient.listMembers(manager.token, team.id);
        expect(membersAsManager.status).toBe(200);
        const memberIds = membersAsManager.data.members.map((m: any) => m.user_id);
        expect(memberIds).toContain(member1.userId);
        expect(memberIds).toContain(member2.userId);

        const membersAsMember = await teamClient.listMembers(member1.token, team.id);
        expect(membersAsMember.status).toBe(200);
    });

    test("cannot create duplicate team name (case-insensitive)", async ({
                                                                            authClient,
                                                                            teamClient,
                                                                        }) => {
        const manager = await loginTestUser(authClient, "taskManager");

        const baseName = `DupTeam-${Date.now()}`;
        const name1 = baseName; // e.g. "DupTeam-123"
        const name2 = baseName.toUpperCase(); // e.g. "DUPTEAM-123"

        const first = await teamClient.create(manager.token, { name: name1 });
        expect(first.status).toBe(201);

        const second = await teamClient.create(manager.token, { name: name2 });
        // depending on backend, this should be 409 (CONFLICT)
        expect(second.status).toBe(409);
        // optional: assert error shape if you’ve wired CodeConflict
        // expect(second.error?.code).toBe("CONFLICT");
    });

    test("non-member cannot list team members", async ({ authClient, teamClient }) => {
        const manager = await loginTestUser(authClient, "taskManager");
        const outsider = await registerAndLogin(authClient);

        const teamRes = await teamClient.create(manager.token, {
            name: uniqueTeamName("PRIVATE TEAM"),
        });
        expect(teamRes.status).toBe(201);
        const team = teamRes.data;

        const membersAsOutsider = await teamClient.listMembers(outsider.token, team.id);
        expect(membersAsOutsider.status).toBe(403);
    });

    test("only owner/manager can add members", async ({ authClient, teamClient }) => {
        const manager = await loginTestUser(authClient, "taskManager");

        const teamRes = await teamClient.create(manager.token, {
            name: uniqueTeamName("OWNER ONLY"),
        });
        expect(teamRes.status).toBe(201);
        const team = teamRes.data;

        const member = await registerAndLogin(authClient);
        const anotherUser = await registerAndLogin(authClient);

        const addMemberResult = await teamClient.addMember(
            manager.token,
            team.id,
            member.userId,
            "member"
        );
        expect(addMemberResult.status).toBe(200);

        const failAdd = await teamClient.addMember(
            member.token,
            team.id,
            anotherUser.userId,
            "member"
        );
        expect(failAdd.status).toBe(403);
    });
});