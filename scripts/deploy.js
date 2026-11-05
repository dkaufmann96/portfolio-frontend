#!/usr/bin/env node
/**
 * Manual deploy: uploads dist/ to the Hetzner webspace over FTPS.
 * Mirrors the deploy job in .github/workflows/ci.yml for when CI is unavailable.
 *
 * Credentials come from the environment or an untracked .env.deploy file:
 *   FTP_SERVER, FTP_USERNAME, FTP_PASSWORD, FTP_SERVER_DIR (optional, default "./")
 *
 * Usage: npm run deploy                      (build, test, upload)
 *        npm run deploy -- --dry-run         (list what would be uploaded, no connection)
 *        npm run deploy -- --prune           (upload, then delete remote files not in dist/)
 *        npm run deploy -- --prune --dry-run (connect read-only, list what would be deleted)
 *        add --verbose to log the FTP conversation
 *
 * Without --prune nothing is ever deleted. Pruning needs an explicit FTP_SERVER_DIR
 * (not the login root) and always leaves PRUNE_KEEP entries alone.
 */

import { Client } from 'basic-ftp';
import { existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const distDir = join(fileURLToPath(new URL('.', import.meta.url)), '..', 'dist');
const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const verbose = args.has('--verbose');
const prune = args.has('--prune');

// Top-level remote entries that --prune must never touch.
const PRUNE_KEEP = new Set(['.well-known', 'cgi-bin', '.ftp-deploy-sync-state.json']);

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
if (prune && ['', '.', './', '/'].includes(FTP_SERVER_DIR.trim())) {
    console.error(`Refusing to prune: FTP_SERVER_DIR is "${FTP_SERVER_DIR}", the login root. Set it to the web root, e.g. public_html.`);
    process.exit(1);
}

// Local files and directories of dist/, as paths relative to it ("a/b.js").
const localFiles = new Set();
const localDirs = new Set();
(function walk(dir, base = '') {
    for (const name of readdirSync(dir)) {
        const rel = base ? `${base}/${name}` : name;
        if (statSync(join(dir, name)).isDirectory()) {
            localDirs.add(rel);
            walk(join(dir, name), rel);
        } else {
            localFiles.add(rel);
        }
    }
})(distDir);

if (prune && localFiles.size < 5) {
    console.error(`Refusing to prune: dist/ has only ${localFiles.size} files, that looks wrong.`);
    process.exit(1);
}

if (dryRun && !prune) {
    console.log(`Dry run: would upload ${localFiles.size} files to ${FTP_SERVER}:${FTP_SERVER_DIR}`);
    [...localFiles].forEach(f => console.log('  ' + f));
    process.exit(0);
}

// Remote entries that do not exist in dist/. A stale directory is reported as one entry.
async function findStale(client, remoteDir, rel = '') {
    const stale = [];
    for (const entry of await client.list(remoteDir)) {
        if (entry.name === '.' || entry.name === '..') continue;
        const relPath = rel ? `${rel}/${entry.name}` : entry.name;
        if (!rel && PRUNE_KEEP.has(entry.name)) continue;
        const remotePath = `${remoteDir}/${entry.name}`;
        if (entry.isDirectory) {
            if (localDirs.has(relPath)) stale.push(...(await findStale(client, remotePath, relPath)));
            else stale.push({ remotePath, relPath, isDirectory: true });
        } else if (!localFiles.has(relPath)) {
            stale.push({ remotePath, relPath, isDirectory: false });
        }
    }
    return stale;
}

const client = new Client(60000);
client.ftp.verbose = verbose;
try {
    await client.access({
        host: FTP_SERVER,
        user: FTP_USERNAME,
        password: FTP_PASSWORD,
        secure: true,
    });
    await client.ensureDir(FTP_SERVER_DIR);
    const remoteRoot = (await client.pwd()).replace(/\/+$/, '');

    if (!dryRun) {
        await client.uploadFromDir(distDir);
        console.log(`Deployed dist/ to ${FTP_SERVER}:${FTP_SERVER_DIR}`);
    }

    if (prune) {
        const stale = await findStale(client, remoteRoot);
        if (!stale.length) {
            console.log('Prune: nothing to delete.');
        } else {
            console.log(`Prune: ${stale.length} remote entries not in dist/ (under ${remoteRoot}):`);
            stale.forEach(s => console.log(`  ${s.isDirectory ? 'dir ' : 'file'} ${s.relPath}`));
            if (dryRun) {
                console.log('Dry run: nothing deleted.');
            } else {
                for (const s of stale) {
                    if (s.isDirectory) await client.removeDir(s.remotePath);
                    else await client.remove(s.remotePath);
                }
                console.log(`Prune: deleted ${stale.length} entries.`);
            }
        }
    }
} catch (err) {
    console.error('Deploy failed:', err.message);
    process.exitCode = 1;
} finally {
    client.close();
}
