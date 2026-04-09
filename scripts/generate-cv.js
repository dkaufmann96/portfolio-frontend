#!/usr/bin/env node
/**
 * Generates public/cv.pdf by rendering the /cv page of the built Astro site
 * with Playwright. Run after `astro build`.
 */

import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const distDir = join(__dirname, '..', 'dist');
const outputPath = join(__dirname, '..', 'public', 'cv.pdf');

const MIME = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.gif': 'image/gif',
    '.woff2': 'font/woff2',
};

// Minimal static file server for the built dist/ directory
function startServer(port) {
    return new Promise((resolve, reject) => {
        const server = createServer((req, res) => {
            let pathname = req.url.split('?')[0];
            if (pathname === '/' || pathname === '') pathname = '/index.html';
            if (!extname(pathname)) pathname += '/index.html';

            const filePath = join(distDir, pathname);
            if (existsSync(filePath)) {
                const ext = extname(filePath);
                res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
                res.end(readFileSync(filePath));
            } else {
                res.writeHead(404);
                res.end('Not found');
            }
        });

        server.listen(port, '127.0.0.1', () => resolve(server));
        server.on('error', reject);
    });
}

(async () => {
    const port = 4399;
    console.log('Starting local server...');
    const server = await startServer(port);

    const browser = await chromium.launch();
    const page = await browser.newPage();

    try {
        await page.goto(`http://127.0.0.1:${port}/cv/`, { waitUntil: 'networkidle' });

        await page.pdf({
            path: outputPath,
            format: 'A4',
            printBackground: true,
            margin: { top: '0', bottom: '0', left: '0', right: '0' },
        });

        console.log(`CV PDF generated → public/cv.pdf`);
    } finally {
        await browser.close();
        server.close();
    }
})().catch(err => {
    console.error('CV generation failed:', err.message);
    process.exit(1);
});
