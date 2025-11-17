import { defineConfig } from "@playwright/test";
import * as dotenv from 'dotenv'

dotenv.config()

export default defineConfig({
    testDir: './tests',
    timeout: 30_000,
    fullyParallel: false,
    workers: 1,
    retries: process.env.CI ? 2 : 0,

    reporter :[
        ['list'],
        ['html', { outputFolder: 'playwright-report'}],
    ],

    use : {
        baseURL: process.env.BASE_URL || 'http://localhost:8080',
        extraHTTPHeaders :{
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
    },

    // webServer: {
    //     command: 'cd ../../backend && go run cmd/api/main.go',
    //     url: 'http://localhost:8080/health',
    //     reuseExistingServer: !process.env.CI,
    //     timeout: 120_000,
    // },
})