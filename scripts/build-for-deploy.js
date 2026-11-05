#!/usr/bin/env node
/**
 * Builds the site for a manual deploy. Regenerates public/cv.pdf only when the
 * CV sources changed since the commit that last touched the PDF (uncommitted
 * edits count); otherwise just runs `astro build`, which ships the committed PDF.
 */

import { execFileSync } from 'child_process';

const CV_SOURCES = [
    'src/data/profile.json',
    'src/pages/cv.astro',
    'public/profile.jpeg',
    'scripts/generate-cv.js',
];

const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const run = (cmd, args) => execFileSync(cmd, args, { stdio: 'inherit' });

const pdfCommit = git('log', '-1', '--format=%H', '--', 'public/cv.pdf');
const changed = !pdfCommit || git('diff', '--name-only', pdfCommit, '--', ...CV_SOURCES) !== '';

run('npm', ['run', 'build']);
if (changed) {
    console.log('CV sources changed since the PDF was last generated, regenerating public/cv.pdf');
    run('node', ['scripts/generate-cv.js']);
} else {
    console.log('CV unchanged, keeping the committed public/cv.pdf');
}
