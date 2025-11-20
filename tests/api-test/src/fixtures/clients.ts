import { test as base } from '@playwright/test';
import { AuthClient } from "../clients/authClient";
import { TaskClient } from "../clients/taskClient";
import {TeamClient} from "../clients/teamClient";

type Fixtures = {
    authClient: AuthClient,
    taskClient: TaskClient,
    teamClient: TeamClient,
}

console.log("🔷 FIXTURE FILE LOADED");  // ← Add this

export const test = base.extend<Fixtures>({
    authClient: async ({ request }, use) => {
        await use(new AuthClient(request));
    },

    taskClient: async ({ request }, use) => {
        await use(new TaskClient(request));
    },
    teamClient: async ({ request }, use) => {
        await use(new TeamClient(request));
    },
});

export { expect } from '@playwright/test';