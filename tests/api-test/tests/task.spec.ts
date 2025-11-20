import { test, expect } from "../src/fixtures/clients";
import { loginTestUser } from "./testUsers";
import {TaskStatus} from "../src/utils/types";

const uniqueEmail = (prefix: string) =>
    `${prefix}-${Date.now()}@example.com`;
const uniqueTaskTitle = (prefix: string) =>
    `${prefix}-task-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const uniqueTeamName = (prefix: string) =>
    `${prefix}-team-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const currentISODate = (date: number, days: number) =>
    new Date(date + 24 * 60 * 60 * 1000 * days).toISOString();

test.describe("Tasks - CRUD Operations", () => {
    test("user can create task", async ({ taskClient, authClient, teamClient }) => {
        // 1) manager creates a team
        const manager = await loginTestUser(authClient, "taskManager");

        const teamRes = await teamClient.create(manager.token, {
            name: `TASK-TEAM-${Date.now()}`,
        });
        expect(teamRes.status).toBe(201);
        const team = teamRes.data;

        // 2) register & login a fresh user
        const email = uniqueEmail("test");
        const password = process.env.COMMON_PASS!;
        const reg = await authClient.register(email, password);
        expect(reg.status).toBe(201);

        const loginResults = await authClient.login(email, password);
        expect(loginResults.status).toBe(200);

        const token = loginResults.data.access_token;
        const userId = loginResults.data.user.id;

        // 3) manager adds this user as team member
        const addMemberRes = await teamClient.addMember(
            manager.token,
            team.id,
            userId,
            "member"
        );
        expect(addMemberRes.status).toBe(200);

        // 4) user creates task in that team
        const title = uniqueTaskTitle("automation");
        const result = await taskClient.create(token, {
            team_id: team.id,                            // ✅ now sending team_id
            title,
            description: "test description",
            due_at: currentISODate(Date.now(), 5),
        });

        expect(result.status).toBe(201);
        expect(result.data.title).toBe(title);
        expect(result.data.team_id).toBe(team.id);       // once you add team_id to TaskResponse
    });

    test("reporter can view their tasks", async ({ authClient, taskClient }) => {
        const reporter = await loginTestUser(authClient, "reporter");

        const result = await taskClient.listAsReporter(reporter.token);
        expect(result.status).toBe(200);
        expect(Array.isArray(result.data.tasks)).toBe(true);
    });

    test("outsider cannot view someone else's task", async ({
                                                                authClient,
                                                                taskClient,
                                                            }) => {
        const reporter = await loginTestUser(authClient, "reporter");
        const tasks = await taskClient.listAsReporter(reporter.token);

        expect(tasks.status).toBe(200);
        expect(tasks.data.tasks.length).toBeGreaterThan(0);

        const taskId = tasks.data.tasks[0].id;

        const outsider = await loginTestUser(authClient, "outsider");
        const result = await taskClient.getById(outsider.token, taskId);

        expect(result.status).toBe(403);
    });

    test("assignee can update task status", async ({ authClient, taskClient }) => {
        const assignee = await loginTestUser(authClient, "assignee2");

        const assignedTasks = await taskClient.listAsAssignee(assignee.token);
        expect(assignedTasks.status).toBe(200);
        expect(assignedTasks.data.tasks.length).toBeGreaterThan(0);

        const firstTaskId = assignedTasks.data.tasks[0].id;

        const result = await taskClient.updateStatus(
            assignee.token,
            firstTaskId,
            "done"
        );

        expect(result.status).toBe(200);
        expect(result.data.status).toBe("done");
    });

    test("only reporter can delete task", async ({ authClient, taskClient, teamClient }) => {
        // 1) manager creates a team
        const manager = await loginTestUser(authClient, "taskManager");
        const teamRes = await teamClient.create(manager.token, {
            name: uniqueTeamName("DELETE"),
        });
        expect(teamRes.status).toBe(201);
        const team = teamRes.data;

        // 2) login seeded users
        const reporter = await loginTestUser(authClient, "reporter");
        const assignee = await loginTestUser(authClient, "assignee2");

        // 3) manager adds them as team members
        const addReporter = await teamClient.addMember(
            manager.token,
            team.id,
            reporter.userId,
            "member"
        );
        expect(addReporter.status).toBe(200);

        const addAssignee = await teamClient.addMember(
            manager.token,
            team.id,
            assignee.userId,
            "member"
        );
        expect(addAssignee.status).toBe(200);

        // 4) reporter creates task in that team
        const task = await taskClient.create(reporter.token, {
            team_id: team.id,                           // ✅ required now
            title: "task to delete",
            assignee_id: assignee.userId,
            due_at: currentISODate(Date.now(), 2),
        });
        expect(task.status).toBe(201);

        // 5) assignee CANNOT delete
        const failResult = await taskClient.delete(assignee.token, task.data.id);
        expect(failResult.status).toBe(403);

        // 6) reporter CAN delete
        const passResult = await taskClient.delete(reporter.token, task.data.id);
        expect(passResult.status).toBe(204);
    });
    test("only reporter can reassign task", async ({ authClient, taskClient, teamClient }) => {
        // 1) manager creates a team
        const manager = await loginTestUser(authClient, "taskManager");
        const teamRes = await teamClient.create(manager.token, {
            name: uniqueTeamName("REASSIGN"),
        });
        expect(teamRes.status).toBe(201);
        const team = teamRes.data;

        // 2) login seeded users
        const reporter  = await loginTestUser(authClient, "reporter");
        const assignee1 = await loginTestUser(authClient, "assignee1");
        const assignee2 = await loginTestUser(authClient, "assignee2");

        // 3) manager adds them as team members
        for (const u of [reporter, assignee1, assignee2]) {
            const addRes = await teamClient.addMember(
                manager.token,
                team.id,
                u.userId,
                "member"
            );
            expect(addRes.status).toBe(200);
        }

        // 4) reporter creates task assigned to assignee1 in that team
        const task = await taskClient.create(reporter.token, {
            team_id: team.id,              // ✅ required now
            title: "Reassign Test",
            assignee_id: assignee1.userId,
            due_at: currentISODate(Date.now(), 1),
        });
        expect(task.status).toBe(201);

        // 5) assignee1 CANNOT reassign
        const failResult = await taskClient.assign(
            assignee1.token,
            task.data.id,
            assignee2.userId
        );
        expect(failResult.status).toBe(403);

        // 6) reporter CAN reassign
        const successResult = await taskClient.assign(
            reporter.token,
            task.data.id,
            assignee2.userId
        );
        expect(successResult.status).toBe(200);
        expect(successResult.data.assignee_id).toBe(assignee2.userId);
    });

    test("assignee cannot update status of a task they are not assigned to", async ({
                                                                                        authClient,
                                                                                        taskClient,
                                                                                    }) => {
        const reporter = await loginTestUser(authClient, "reporter");
        const assignee2 = await loginTestUser(authClient, "assignee2");

        const reporterTasks = await taskClient.listAsReporter(reporter.token);
        expect(reporterTasks.status).toBe(200);
        expect(reporterTasks.data.tasks.length).toBeGreaterThan(0);

        // pick a task where assignee != assignee2.userId
        const foreignTask = reporterTasks.data.tasks.find(
            (t) => t.assignee_id !== assignee2.userId
        );
        expect(foreignTask, "Need a task not assigned to assignee2").toBeTruthy();

        const result = await taskClient.updateStatus(
            assignee2.token,
            foreignTask!.id,
            "done"
        );

        expect(result.status).toBe(403);
    });

    test("reporter cannot update task status (only assignee can)", async ({
                                                                              authClient,
                                                                              taskClient,
                                                                          }) => {
        const reporter = await loginTestUser(authClient, "reporter");

        const reporterTasks = await taskClient.listAsReporter(reporter.token);
        expect(reporterTasks.status).toBe(200);
        expect(reporterTasks.data.tasks.length).toBeGreaterThan(0);

        const task = reporterTasks.data.tasks[0];

        const result = await taskClient.updateStatus(
            reporter.token,
            task.id,
            "in_progress"
        );

        expect(result.status).toBe(403);
    });

    test("updating status with invalid value returns 400", async ({
                                                                      authClient,
                                                                      taskClient,
                                                                  }) => {
        const assignee = await loginTestUser(authClient, "assignee2");
        const assignedTasks = await taskClient.listAsAssignee(assignee.token);

        expect(assignedTasks.status).toBe(200);
        expect(assignedTasks.data.tasks.length).toBeGreaterThan(0);

        const task = assignedTasks.data.tasks[0];

        const invalidStatus = "totally_invalid" as TaskStatus;

        const result = await taskClient.updateStatus(
            assignee.token,
            task.id,
            invalidStatus
        );

        expect(result.status).toBe(400);
        // if you wired a specific error code/message:
        // expect(result.error?.code).toBe("BAD_REQUEST");
        // expect(result.error?.message).toBe("invalid task status");
    });

});