#!/usr/bin/env node
/**
 * Manual deploy: uploads dist/ to the Hetzner webspace over FTPS.
 * Mirrors the deploy job in .github/workflows/ci.yml for when CI is unavailable.
 *
 * Credentials come from the environment or an untracked .env.deploy file:
 *   FTP_SERVER, FTP_USERNAME, FTP_PASSWORD, FTP_SERVER_DIR (optional, default "./")
 *
 * Usage: npm run deploy            (build, test, upload)
 *        npm run deploy -- --dry-run   (show what would be uploaded)
 *
 * Unlike the CI action this does not delete remote files that no longer exist locally.
 */

import { Client } from 'basic-ftp';
import { existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const distDir = join(fileURLToPath(new URL('.', import.meta.url)), '..', 'dist');
const dryRun = process.argv.includes('--dry-run');

const { FTP_SERVER, FTP_USERNAME, FTP_PASSWORD, FTP_SERVER_DIR = './' } = process.env;
const missing = ['FTP_SERVER', 'FTP_USERNAME', 'FTP_PASSWORD'].filter(k => !process.env[k]);
if (missing.length) {
    console.error(`Missing ${missing.join(', ')}. Set them in the environment or in .env.deploy`);
    process.exit(1);
}
if (!existsSync(join(distDir, 'index.html'))) {
    console.error('dist/ is missing or empty. Run `npm run generate:cv` first.');
    process.exit(1);
}

function* walk(dir, base = '') {
    for (const name of readdirSync(dir)) {
        const rel = base ? `${base}/${name}` : name;
        if (statSync(join(dir, name)).isDirectory()) yield* walk(join(dir, name), rel);
        else yield rel;
    }
}

if (dryRun) {
    const files = [...walk(distDir)];
    console.log(`Dry run: would upload ${files.length} files to ${FTP_SERVER}:${FTP_SERVER_DIR}`);
    files.forEach(f => console.log('  ' + f));
    process.exit(0);
}

const client = new Client(30000);
try {
    await client.access({
        host: FTP_SERVER,
        user: FTP_USERNAME,
        password: FTP_PASSWORD,
        secure: true,
    });
    await client.ensureDir(FTP_SERVER_DIR);
    await client.uploadFromDir(distDir);
    console.log(`Deployed dist/ to ${FTP_SERVER}:${FTP_SERVER_DIR}`);
} catch (err) {
    console.error('Deploy failed:', err.message);
    process.exitCode = 1;
} finally {
    client.close();
}
