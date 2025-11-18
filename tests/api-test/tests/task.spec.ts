import {expect, test} from "../src/fixtures/clients";
import {loginTestUser} from "./testUsers";
import { TaskStatus} from "../src/utils/types";

const uniqueEmail = (prefix:string)=> `${prefix}-${Date.now()}@example.com`
const currentISODate = (date: number, days: number ) => new Date(date + 24 * 60 * 60 * 1000 * days).toISOString()
test.describe("Tasks - CRUD Operations",  ()=>{

    test("user can create task", async ({taskClient, authClient})=>{
        const email = uniqueEmail("test")
        await authClient.register(email, process.env.COMMON_PASS)
        const loginResults = await authClient.login(email, process.env.COMMON_PASS)
        const token = loginResults.data.access_token

        const result = await taskClient.create(token, {
            title: "Automation task",
            description: "test description",
            due_at: currentISODate(Date.now(), 5)
        })
        expect(result.status).toBe(201)
        expect(result.data.title).toBe("Automation task")
    })
    test("reporter can view their task", async ({ authClient, taskClient}) =>{
        const reporter = await loginTestUser(authClient, 'reporter')

        const result = await taskClient.listAsReporter(reporter.token)
        expect(result.status).toBe(200)
        console.log(result.status)
    })
    test("outsider cannot view task", async ({ authClient, taskClient }) => {

        const reporter = await loginTestUser(authClient, 'reporter');
        const tasks = await taskClient.listAsReporter(reporter.token);
        const id = tasks.data.tasks[0].id;
        const outsider = await loginTestUser(authClient,"outsider")
        const result = await taskClient.getById(outsider.token, id)
        expect(result.status).toBe(403)
    });
    test("assignee can update task status", async ({authClient, taskClient})=>{
        const assignee = await loginTestUser(authClient, "assignee2")
        const assignedTasks = await taskClient.listAsAssignee(assignee.token)
        const firstTask = assignedTasks.data.tasks[0].id

        const result = await taskClient.updateStatus(assignee.token, firstTask,  "done")
        expect(result.status).toBe(200);
        expect(result.data.status).toBe("done");
    })
    test("only reporter can delete task", async ({authClient, taskClient})=>{
        const reporter = await loginTestUser(authClient, 'reporter')
        const assignee = await loginTestUser(authClient, 'assignee2')

        const task = await taskClient.create(reporter.token, {
            title: "task to delete",
            assignee_id: assignee.userId,
            due_at: currentISODate(Date.now(), 2),
        })

        const failResult = await taskClient.delete(assignee.token, task.data.id)
        expect(failResult.status).toBe(403)

        const passResult = await taskClient.delete(reporter.token, task.data.id)
        expect(passResult.status).toBe(204)
    })
    test("only reporter can reassign task", async({authClient, taskClient})=>{
        const reporter = await loginTestUser(authClient, 'reporter');
        const assignee1 = await loginTestUser(authClient, 'assignee1');
        const assignee2 = await loginTestUser(authClient, 'assignee2');

        const task = await taskClient.create(reporter.token, {
            title: "Reassign Test",
            assignee_id: assignee1.userId,
            due_at: currentISODate(Date.now(), 1)
        });

        const failResult = await taskClient.assign(
            assignee1.token,
            task.data.id,
            assignee2.userId
        );
        expect(failResult.status).toBe(403);

        const successResult = await taskClient.assign(
            reporter.token,
            task.data.id,
            assignee2.userId
        );
        expect(successResult.status).toBe(200);
        expect(successResult.data.assignee_id).toBe(assignee2.userId);
    })


})