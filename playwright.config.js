import { defineConfig } from '@playwright/test';

export default defineConfig({
    testDir: './tests',
    timeout: 15000,
    retries: 0,
    use: {
        baseURL: 'http://localhost:4322',
        browserName: 'chromium',
        headless: true,
        // Optional: use a pre-installed Chromium instead of the Playwright-managed one
        launchOptions: process.env.PW_CHROMIUM_PATH
            ? { executablePath: process.env.PW_CHROMIUM_PATH }
            : {},
    },
    // Tests run against the production build, which is what actually gets deployed
    webServer: {
        command: 'npm run build && npm run preview -- --port 4322 --host 127.0.0.1',
        port: 4322,
        reuseExistingServer: true,
        timeout: 120000,
    },
});
