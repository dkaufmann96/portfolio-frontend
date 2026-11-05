import { test, expect } from '@playwright/test';

const pages = [
    { path: '/', title: /Daniel Kaufmann/ },
    { path: '/experience/', title: /Experience|Daniel Kaufmann/ },
    { path: '/projects/', title: /Projects/ },
    { path: '/contact/', title: /Contact/ },
];

for (const { path, title } of pages) {
    test.describe(path, () => {
        test('loads with SEO metadata', async ({ page }) => {
            const res = await page.goto(path);
            expect(res.status()).toBe(200);
            await expect(page).toHaveTitle(title);
            await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
                'href',
                new RegExp(`^https://danielkaufmann\\.at${path === '/' ? '/$' : path}`),
            );
            await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /og-image\.png$/);
            await expect(page.locator('h1')).toHaveCount(1);
        });

        test('has no broken internal links or images', async ({ page, request }) => {
            await page.goto(path);
            const hrefs = await page.$$eval('a[href^="/"]', (as) => as.map((a) => a.getAttribute('href')));
            const srcs = await page.$$eval('img[src^="/"]', (is) => is.map((i) => i.getAttribute('src')));
            for (const url of new Set([...hrefs, ...srcs])) {
                const res = await request.get(url);
                expect(res.status(), `${url} on ${path}`).toBeLessThan(400);
            }
        });
    });
}

test('static assets exist', async ({ request }) => {
    for (const url of ['/robots.txt', '/sitemap-index.xml', '/favicon.svg', '/og-image.png', '/cv.pdf']) {
        const res = await request.get(url);
        expect(res.status(), url).toBe(200);
    }
});

test('terminal escapes user input', async ({ page }) => {
    await page.goto('/');
    await page.locator('#terminal-trigger').click();
    await page.locator('#terminal-input').fill('<img src=x onerror=window.__xss=1>');
    await page.locator('#terminal-input').press('Enter');
    await expect(page.locator('#terminal-output')).toContainText('command not found: <img src=x');
    expect(await page.evaluate(() => window.__xss)).toBeUndefined();
    await expect(page.locator('#terminal-output img')).toHaveCount(0);
});
