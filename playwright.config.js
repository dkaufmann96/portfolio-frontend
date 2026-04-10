import { defineConfig } from '@playwright/test';

export default defineConfig({
    testDir: './tests',
    timeout: 15000,
    retries: 0,
    use: {
        baseURL: 'http://localhost:4322',
        browserName: 'chromium',
        headless: true,
    },
    webServer: {
        command: 'npm run dev -- --port 4322',
        port: 4322,
        reuseExistingServer: true,
    },
});
