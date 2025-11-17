import { test as base } from '@playwright/test';
import {AuthClient} from "../clients/authClient";
import {TaskClient} from "../clients/taskClient";

type Fixtures = {
    authClient: AuthClient,
    taskClient: TaskClient,
}

export const test = base.extend<Fixtures>({
    authClient: async ({ request }, use) => {
        await use(new AuthClient(request))
    },

    taskClient: async({ request }, use) =>{
        await use(new TaskClient(request))
    },
})

export { expect } from '@playwright/test'