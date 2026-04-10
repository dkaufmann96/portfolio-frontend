import { test, expect } from '@playwright/test';

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

/** Open the terminal overlay by clicking the trigger button. */
async function openTerminal(page) {
    await page.locator('#terminal-trigger').click();
    await expect(page.locator('#terminal-overlay')).not.toHaveClass(/hidden/);
    await expect(page.locator('#terminal-input')).toBeFocused();
}

/** Type a command into the terminal and press Enter. */
async function runCommand(page, cmd) {
    const input = page.locator('#terminal-input');
    await input.fill(cmd);
    await input.press('Enter');
}

/** Return the visible text of the last N output lines. */
async function lastLines(page, n = 1) {
    const lines = page.locator('#terminal-output .term-line');
    const count = await lines.count();
    const result = [];
    for (let i = Math.max(0, count - n); i < count; i++) {
        result.push(await lines.nth(i).textContent());
    }
    return result;
}

/** Return every output line's text content as an array. */
async function allLines(page) {
    return page.locator('#terminal-output .term-line').allTextContents();
}

// ---------------------------------------------------------------------------
// setup
// ---------------------------------------------------------------------------

test.beforeEach(async ({ page }) => {
    await page.goto('/');
});

// ===========================================================================
// 1. Opening & closing
// ===========================================================================

test.describe('Terminal open/close', () => {
    test('trigger button is visible', async ({ page }) => {
        await expect(page.locator('#terminal-trigger')).toBeVisible();
    });

    test('clicking trigger opens terminal', async ({ page }) => {
        await openTerminal(page);
        await expect(page.locator('#terminal-overlay')).toBeVisible();
    });

    test('MOTD is printed on first open', async ({ page }) => {
        await openTerminal(page);
        const lines = await allLines(page);
        const text = lines.join('\n');
        expect(text).toContain('Last login:');
        expect(text).toContain('macOS Sequoia 15.4 (portfolio edition)');
        expect(text).toContain("Welcome to Daniel's terminal!");
        expect(text).toContain('help');
    });

    test('Escape closes terminal', async ({ page }) => {
        await openTerminal(page);
        await page.keyboard.press('Escape');
        await expect(page.locator('#terminal-overlay')).toHaveClass(/hidden/);
    });

    test('clicking overlay backdrop closes terminal', async ({ page }) => {
        await openTerminal(page);
        // Click the overlay itself, not the window
        await page.locator('#terminal-overlay').click({ position: { x: 10, y: 10 } });
        await expect(page.locator('#terminal-overlay')).toHaveClass(/hidden/);
    });

    test('close button closes terminal', async ({ page }) => {
        await openTerminal(page);
        await page.locator('#terminal-btn-close').click();
        await expect(page.locator('#terminal-overlay')).toHaveClass(/hidden/);
    });

    test('Ctrl+` opens terminal', async ({ page }) => {
        await page.keyboard.press('Control+Backquote');
        await expect(page.locator('#terminal-overlay')).not.toHaveClass(/hidden/);
    });
});

// ===========================================================================
// 2. Commands
// ===========================================================================

test.describe('Commands', () => {
    test.beforeEach(async ({ page }) => {
        await openTerminal(page);
    });

    test('help lists all commands', async ({ page }) => {
        await runCommand(page, 'help');
        const text = (await allLines(page)).join('\n');
        for (const cmd of ['whoami', 'skills', 'experience', 'projects', 'contact',
            'ls', 'ls -la', 'pwd', 'cd [dir]', 'cat [file]', 'date', 'man [cmd]',
            'cat resume.pdf', 'clear']) {
            expect(text).toContain(cmd);
        }
    });

    test('whoami shows profile info', async ({ page }) => {
        await runCommand(page, 'whoami');
        const text = (await allLines(page)).join('\n');
        expect(text).toContain('Daniel Kaufmann');
        expect(text).toContain('Dynatrace');
        expect(text).toContain('Vienna, Austria');
        expect(text).toContain('TU Wien');
    });

    test('skills shows categories and skill names', async ({ page }) => {
        await runCommand(page, 'skills');
        const text = (await allLines(page)).join('\n');
        expect(text).toContain('Technical Skills');
        expect(text).toContain('Frontend');
        expect(text).toContain('Backend');
        expect(text).toContain('Languages');
        expect(text).toContain('DevOps');
        expect(text).toContain('React');
        expect(text).toContain('TypeScript');
        expect(text).toContain('Deno');
        expect(text).toContain('Docker');
    });

    test('experience shows companies and roles with box-drawing', async ({ page }) => {
        await runCommand(page, 'experience');
        const text = (await allLines(page)).join('\n');
        expect(text).toContain('Experience');
        expect(text).toContain('Dynatrace');
        expect(text).toContain('World4You Internet Services GmbH');
        expect(text).toContain('Advoodle Legal Tech GmbH');
        expect(text).toContain('Software Engineer & Team Captain');
        // Box-drawing chars
        expect(text).toContain('┌─');
        expect(text).toContain('├─');
        expect(text).toContain('└─');
        expect(text).toContain('│');
        // Stack tags
        expect(text).toContain('Stack:');
    });

    test('experience descriptions wrap with pipe prefix', async ({ page }) => {
        await runCommand(page, 'experience');
        // Wait for output to stabilize
        await page.waitForTimeout(200);
        // The description of each role should be wrapped into multiple lines,
        // each prefixed with the pipe character (│ or spaces for the last role).
        // Verify: lines containing description text between a role title and Stack:
        // all start with leading whitespace (the pipe prefix area).
        const lines = await page.locator('#terminal-output .term-line').allTextContents();
        // Check that "Founding full-stack" (Advoodle description, known to be long)
        // does NOT appear on a line that also has "Stack:" — meaning it was split
        const advoodleDescLine = lines.find(l => l.includes('Founding full-stack'));
        expect(advoodleDescLine).toBeDefined();
        // Check the line starts with whitespace (pipe prefix)
        expect(advoodleDescLine).toMatch(/^\s/);
        // Verify that "Stack:" for Advoodle is on its own line
        const advoodleStackLine = lines.find(l => l.includes('Stack:') && l.includes('Laravel'));
        expect(advoodleStackLine).toBeDefined();
        expect(advoodleStackLine).not.toContain('Founding');
    });

    test('projects lists project names and repos', async ({ page }) => {
        await runCommand(page, 'projects');
        const text = (await allLines(page)).join('\n');
        expect(text).toContain('Vienna Districts');
        expect(text).toContain('JWT-Brute');
        expect(text).toContain('github.com/dkaufmann96/vienna-districts');
        expect(text).toContain('github.com/dkaufmann96/jwt-brute');
    });

    test('contact shows email and links', async ({ page }) => {
        await runCommand(page, 'contact');
        const text = (await allLines(page)).join('\n');
        expect(text).toContain('Contact');
        expect(text).toContain('contact@danielkaufmann.at');
        expect(text).toContain('github.com/dkaufmann96');
        expect(text).toContain('gitlab.com/dkaufmann96');
    });

    test('date outputs a date string', async ({ page }) => {
        await runCommand(page, 'date');
        const lines = await lastLines(page, 2);
        // The date output should contain the current year
        expect(lines.some(l => l.includes(String(new Date().getFullYear())))).toBe(true);
    });

    test('clear removes all output', async ({ page }) => {
        await runCommand(page, 'help');
        const beforeCount = await page.locator('#terminal-output .term-line').count();
        expect(beforeCount).toBeGreaterThan(0);
        await runCommand(page, 'clear');
        const afterCount = await page.locator('#terminal-output .term-line').count();
        expect(afterCount).toBe(0);
    });

    test('unknown command shows error', async ({ page }) => {
        await runCommand(page, 'foobar');
        const text = (await allLines(page)).join('\n');
        expect(text).toContain('command not found: foobar');
        expect(text).toContain('help');
    });
});

// ===========================================================================
// 3. Filesystem commands
// ===========================================================================

test.describe('Filesystem', () => {
    test.beforeEach(async ({ page }) => {
        await openTerminal(page);
    });

    test('pwd shows home directory by default', async ({ page }) => {
        await runCommand(page, 'pwd');
        const text = (await allLines(page)).join('\n');
        expect(text).toContain('/Users/daniel/portfolio');
    });

    test('ls lists files and directories', async ({ page }) => {
        await runCommand(page, 'ls');
        const text = (await allLines(page)).join('\n');
        expect(text).toContain('about.txt');
        expect(text).toContain('experience.log');
        expect(text).toContain('skills.json');
        expect(text).toContain('resume.pdf');
        expect(text).toContain('projects');
    });

    test('ls -la shows permissions and sizes', async ({ page }) => {
        await runCommand(page, 'ls -la');
        const text = (await allLines(page)).join('\n');
        expect(text).toContain('drwxr-xr-x');
        expect(text).toContain('-rw-r--r--');
        expect(text).toContain('daniel');
        expect(text).toContain('staff');
        expect(text).toContain('total');
        expect(text).toContain('1.2K');
        expect(text).toContain('about.txt');
    });

    test('cd projects changes directory and updates prompt', async ({ page }) => {
        await runCommand(page, 'cd projects');
        const prompt = await page.locator('#terminal-prompt').textContent();
        expect(prompt).toContain('~/projects');
        const title = await page.locator('#terminal-title').textContent();
        expect(title).toContain('~/projects');
    });

    test('ls after cd projects shows project dirs', async ({ page }) => {
        await runCommand(page, 'cd projects');
        await runCommand(page, 'ls');
        const text = (await allLines(page)).join('\n');
        expect(text).toContain('vienna-districts');
        expect(text).toContain('jwt-brute');
    });

    test('cd ~ returns home', async ({ page }) => {
        await runCommand(page, 'cd projects');
        await runCommand(page, 'cd ~');
        const prompt = await page.locator('#terminal-prompt').textContent();
        expect(prompt).toBe('daniel@portfolio ~ %');
    });

    test('cd .. returns home', async ({ page }) => {
        await runCommand(page, 'cd projects');
        await runCommand(page, 'cd ..');
        const prompt = await page.locator('#terminal-prompt').textContent();
        expect(prompt).toBe('daniel@portfolio ~ %');
    });

    test('cd to nonexistent dir shows error', async ({ page }) => {
        await runCommand(page, 'cd nonexistent');
        const text = (await allLines(page)).join('\n');
        expect(text).toContain('No such file or directory');
    });

    test('pwd after cd projects shows full path', async ({ page }) => {
        await runCommand(page, 'cd projects');
        await runCommand(page, 'pwd');
        const text = (await allLines(page)).join('\n');
        expect(text).toContain('/Users/daniel/portfolio/projects');
    });
});

// ===========================================================================
// 4. cat command
// ===========================================================================

test.describe('cat command', () => {
    test.beforeEach(async ({ page }) => {
        await openTerminal(page);
    });

    test('cat about.txt runs whoami', async ({ page }) => {
        await runCommand(page, 'cat about.txt');
        const text = (await allLines(page)).join('\n');
        expect(text).toContain('Daniel Kaufmann');
    });

    test('cat experience.log runs experience', async ({ page }) => {
        await runCommand(page, 'cat experience.log');
        const text = (await allLines(page)).join('\n');
        expect(text).toContain('Dynatrace');
        expect(text).toContain('┌─');
    });

    test('cat skills.json runs skills', async ({ page }) => {
        await runCommand(page, 'cat skills.json');
        const text = (await allLines(page)).join('\n');
        expect(text).toContain('Technical Skills');
        expect(text).toContain('Frontend');
    });

    test('cat resume.pdf shows opening message and triggers window.open', async ({ page }) => {
        // Track window.open calls
        await page.evaluate(() => {
            window.__openCalls = [];
            window.__origOpen = window.open;
            window.open = function (url, target, features) {
                window.__openCalls.push({ url, target, features });
            };
        });
        await runCommand(page, 'cat resume.pdf');
        const text = (await allLines(page)).join('\n');
        expect(text).toContain('Opening resume.pdf...');
        const calls = await page.evaluate(() => window.__openCalls);
        expect(calls.length).toBe(1);
        expect(calls[0].url).toBe('/cv.pdf');
        // Restore
        await page.evaluate(() => { window.open = window.__origOpen; });
    });

    test('cat nonexistent shows error', async ({ page }) => {
        await runCommand(page, 'cat nonexistent');
        const text = (await allLines(page)).join('\n');
        expect(text).toContain('No such file or directory');
    });

    test('cat on a directory shows error', async ({ page }) => {
        await runCommand(page, 'cat projects');
        const text = (await allLines(page)).join('\n');
        expect(text).toContain('Is a directory');
    });

    test('cat from wrong directory shows error', async ({ page }) => {
        await runCommand(page, 'cd projects');
        await runCommand(page, 'cat about.txt');
        const text = (await allLines(page)).join('\n');
        expect(text).toContain('No such file or directory');
    });
});

// ===========================================================================
// 5. man command
// ===========================================================================

test.describe('man command', () => {
    test.beforeEach(async ({ page }) => {
        await openTerminal(page);
    });

    test('man experience shows man page format', async ({ page }) => {
        await runCommand(page, 'man experience');
        const text = (await allLines(page)).join('\n');
        expect(text).toContain('PORTFOLIO(1)');
        expect(text).toContain('Portfolio Manual');
        expect(text).toContain('NAME');
        expect(text).toContain('experience');
        expect(text).toContain('DESCRIPTION');
    });

    test('man with known commands all work', async ({ page }) => {
        for (const cmd of ['whoami', 'skills', 'ls', 'pwd', 'cd', 'cat', 'date', 'clear', 'help']) {
            await runCommand(page, 'clear');
            await runCommand(page, `man ${cmd}`);
            const text = (await allLines(page)).join('\n');
            expect(text).toContain('PORTFOLIO(1)');
            expect(text).toContain(cmd);
        }
    });

    test('man unknown shows error', async ({ page }) => {
        await runCommand(page, 'man foobar');
        const text = (await allLines(page)).join('\n');
        expect(text).toContain('No manual entry for foobar');
    });
});

// ===========================================================================
// 6. Block cursor
// ===========================================================================

test.describe('Block cursor', () => {
    test.beforeEach(async ({ page }) => {
        await openTerminal(page);
    });

    test('cursor shows space character when input is empty', async ({ page }) => {
        const cursor = page.locator('#term-cursor');
        // The cursor block should contain a space (or nbsp) when input is empty
        const text = await cursor.textContent();
        expect(text.trim().length).toBeLessThanOrEqual(1);
    });

    test('cursor updates when typing', async ({ page }) => {
        const input = page.locator('#terminal-input');
        await input.fill('hello');
        const before = await page.locator('#term-before-cursor').textContent();
        const cursor = await page.locator('#term-cursor').textContent();
        expect(before).toBe('hello');
        expect(cursor.trim()).toBe(''); // space char at end
    });

    test('cursor has green background', async ({ page }) => {
        const bg = await page.locator('#term-cursor').evaluate(el =>
            getComputedStyle(el).backgroundColor
        );
        // #22c55e = rgb(34, 197, 94)
        expect(bg).toBe('rgb(34, 197, 94)');
    });
});

// ===========================================================================
// 7. Keyboard shortcuts
// ===========================================================================

test.describe('Keyboard shortcuts', () => {
    test.beforeEach(async ({ page }) => {
        await openTerminal(page);
    });

    test('Ctrl+L clears screen', async ({ page }) => {
        await runCommand(page, 'help');
        expect(await page.locator('#terminal-output .term-line').count()).toBeGreaterThan(0);
        await page.locator('#terminal-input').press('Control+l');
        expect(await page.locator('#terminal-output .term-line').count()).toBe(0);
    });

    test('Ctrl+A moves cursor to start', async ({ page }) => {
        const input = page.locator('#terminal-input');
        await input.fill('hello world');
        await input.press('Control+a');
        const pos = await input.evaluate(el => el.selectionStart);
        expect(pos).toBe(0);
        expect(await page.locator('#term-cursor').textContent()).toBe('h');
    });

    test('Ctrl+E moves cursor to end', async ({ page }) => {
        const input = page.locator('#terminal-input');
        await input.fill('hello world');
        await input.press('Control+a'); // go to start first
        await input.press('Control+e');
        const pos = await input.evaluate(el => el.selectionStart);
        expect(pos).toBe(11); // "hello world".length
    });

    test('Ctrl+U clears input line', async ({ page }) => {
        const input = page.locator('#terminal-input');
        await input.fill('some text');
        await input.press('Control+u');
        expect(await input.inputValue()).toBe('');
    });

    test('Ctrl+W deletes last word', async ({ page }) => {
        const input = page.locator('#terminal-input');
        await input.fill('hello world');
        // Move cursor to end
        await input.press('End');
        await input.press('Control+w');
        expect(await input.inputValue()).toBe('hello ');
    });
});

// ===========================================================================
// 8. Tab completion
// ===========================================================================

test.describe('Tab completion', () => {
    test.beforeEach(async ({ page }) => {
        await openTerminal(page);
    });

    test('unique prefix completes fully', async ({ page }) => {
        const input = page.locator('#terminal-input');
        await input.fill('exp');
        await input.press('Tab');
        expect(await input.inputValue()).toBe('experience');
    });

    test('ambiguous prefix extends to common prefix', async ({ page }) => {
        // "c" matches cd, cat, clear, contact
        const input = page.locator('#terminal-input');
        await input.fill('c');
        await input.press('Tab');
        const val = await input.inputValue();
        // "c" has matches starting with "c" – the common prefix of
        // "cd ~", "cd projects", "cat …", "clear", "contact" is just "c"
        // so it should display the possible completions
        expect(val).toBe('c');
        // Check that completion options were printed
        const text = (await allLines(page)).join('\n');
        expect(text).toContain('cat');
    });

    test('tab with no matches does nothing', async ({ page }) => {
        const input = page.locator('#terminal-input');
        await input.fill('zzz');
        await input.press('Tab');
        expect(await input.inputValue()).toBe('zzz');
    });

    test('tab completes man pages', async ({ page }) => {
        const input = page.locator('#terminal-input');
        await input.fill('man exp');
        await input.press('Tab');
        expect(await input.inputValue()).toBe('man experience');
    });
});

// ===========================================================================
// 9. Command history
// ===========================================================================

test.describe('Command history', () => {
    test.beforeEach(async ({ page }) => {
        await openTerminal(page);
    });

    test('ArrowUp recalls previous command', async ({ page }) => {
        await runCommand(page, 'whoami');
        await runCommand(page, 'skills');
        const input = page.locator('#terminal-input');
        await input.press('ArrowUp');
        expect(await input.inputValue()).toBe('skills');
        await input.press('ArrowUp');
        expect(await input.inputValue()).toBe('whoami');
    });

    test('ArrowDown goes forward in history', async ({ page }) => {
        await runCommand(page, 'whoami');
        await runCommand(page, 'skills');
        const input = page.locator('#terminal-input');
        await input.press('ArrowUp');
        await input.press('ArrowUp');
        await input.press('ArrowDown');
        expect(await input.inputValue()).toBe('skills');
    });

    test('ArrowDown past end clears input', async ({ page }) => {
        await runCommand(page, 'whoami');
        const input = page.locator('#terminal-input');
        await input.press('ArrowUp');
        await input.press('ArrowDown');
        expect(await input.inputValue()).toBe('');
    });
});

// ===========================================================================
// 10. Traffic light buttons
// ===========================================================================

test.describe('Traffic lights', () => {
    test.beforeEach(async ({ page }) => {
        await openTerminal(page);
    });

    test('dots are colored when focused', async ({ page }) => {
        // terminal-input is focused after open, so :focus-within applies
        const red = await page.locator('.dot-red').evaluate(el =>
            getComputedStyle(el).backgroundColor
        );
        expect(red).toBe('rgb(255, 95, 87)'); // #ff5f57
    });

    test('minimize toggles body visibility', async ({ page }) => {
        await page.locator('#terminal-btn-minimize').click();
        await expect(page.locator('#terminal-window')).toHaveClass(/terminal-minimized/);
        await page.locator('#terminal-btn-minimize').click();
        await expect(page.locator('#terminal-window')).not.toHaveClass(/terminal-minimized/);
    });

    test('maximize makes window fullscreen', async ({ page }) => {
        await page.locator('#terminal-btn-maximize').click();
        await expect(page.locator('#terminal-window')).toHaveClass(/terminal-maximized/);
        const box = await page.locator('#terminal-window').boundingBox();
        const viewport = page.viewportSize();
        expect(box.width).toBe(viewport.width);
        expect(box.height).toBe(viewport.height);
    });

    test('maximize toggle returns to normal', async ({ page }) => {
        await page.locator('#terminal-btn-maximize').click();
        await page.locator('#terminal-btn-maximize').click();
        await expect(page.locator('#terminal-window')).not.toHaveClass(/terminal-maximized/);
    });

    test('double-click header toggles minimize', async ({ page }) => {
        // .terminal-title has pointer-events: none; double-click on header directly
        await page.locator('#terminal-header').dblclick();
        await expect(page.locator('#terminal-window')).toHaveClass(/terminal-minimized/);
        await page.locator('#terminal-header').dblclick();
        await expect(page.locator('#terminal-window')).not.toHaveClass(/terminal-minimized/);
    });
});

// ===========================================================================
// 11. Drag to move
// ===========================================================================

test.describe('Drag', () => {
    test('dragging header repositions window', async ({ page }) => {
        await openTerminal(page);
        const header = page.locator('#terminal-header');
        const win = page.locator('#terminal-window');

        const before = await win.boundingBox();

        await header.hover({ position: { x: 200, y: 15 } });
        await page.mouse.down();
        await page.mouse.move(before.x + 200 - 80, before.y + 15 + 60, { steps: 5 });
        await page.mouse.up();

        const after = await win.boundingBox();
        // The window should have moved
        expect(after.x).not.toBe(before.x);
        expect(after.y).not.toBe(before.y);
    });
});

// ===========================================================================
// 12. Resize
// ===========================================================================

test.describe('Resize', () => {
    test('dragging resize handle changes window size', async ({ page }) => {
        await openTerminal(page);
        const win = page.locator('#terminal-window');

        const before = await win.evaluate(el => ({
            width: el.offsetWidth, height: el.offsetHeight
        }));

        // Use JS-level dispatch for reliable resize
        await page.evaluate(() => {
            const handle = document.querySelector('.terminal-resize-handle');
            const rect = handle.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;
            handle.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: cx, clientY: cy }));
            document.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: cx + 60, clientY: cy + 40 }));
            document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
        });

        const after = await win.evaluate(el => ({
            width: el.offsetWidth, height: el.offsetHeight
        }));
        expect(after.width).toBeGreaterThan(before.width);
        expect(after.height).toBeGreaterThan(before.height);
    });

    test('resize respects minimum dimensions', async ({ page }) => {
        await openTerminal(page);
        const win = page.locator('#terminal-window');

        // Use JS-level dispatch to shrink far below minimum
        await page.evaluate(() => {
            const handle = document.querySelector('.terminal-resize-handle');
            const rect = handle.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;
            handle.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: cx, clientY: cy }));
            document.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: cx - 500, clientY: cy - 500 }));
            document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
        });

        const after = await win.evaluate(el => ({
            width: el.offsetWidth, height: el.offsetHeight
        }));
        expect(after.width).toBeGreaterThanOrEqual(380);
        expect(after.height).toBeGreaterThanOrEqual(200);
    });

    test('resize handle hidden when maximized', async ({ page }) => {
        await openTerminal(page);
        await page.locator('#terminal-btn-maximize').click();
        await expect(page.locator('.terminal-resize-handle')).not.toBeVisible();
    });
});

// ===========================================================================
// 13. Prompt & title bar
// ===========================================================================

test.describe('Prompt and title', () => {
    test.beforeEach(async ({ page }) => {
        await openTerminal(page);
    });

    test('default prompt shows ~ path', async ({ page }) => {
        const prompt = await page.locator('#terminal-prompt').textContent();
        expect(prompt).toBe('daniel@portfolio ~ %');
    });

    test('title bar matches prompt', async ({ page }) => {
        const title = await page.locator('#terminal-title').textContent();
        expect(title).toBe('daniel@portfolio ~ %');
    });

    test('title updates after cd', async ({ page }) => {
        await runCommand(page, 'cd projects');
        const title = await page.locator('#terminal-title').textContent();
        expect(title).toBe('daniel@portfolio ~/projects %');
    });
});

// ===========================================================================
// 14. Styling / Visual
// ===========================================================================

test.describe('Visual styling', () => {
    test.beforeEach(async ({ page }) => {
        await openTerminal(page);
    });

    test('terminal uses monospace font', async ({ page }) => {
        const fontFamily = await page.locator('#terminal-body').evaluate(el =>
            getComputedStyle(el).fontFamily
        );
        expect(fontFamily).toMatch(/Menlo|Monaco|SF Mono|monospace/i);
    });

    test('terminal overlay has backdrop blur', async ({ page }) => {
        const filter = await page.locator('#terminal-overlay').evaluate(el =>
            getComputedStyle(el).backdropFilter
        );
        expect(filter).toContain('blur');
    });

    test('prompt is green', async ({ page }) => {
        const color = await page.locator('#terminal-prompt').evaluate(el =>
            getComputedStyle(el).color
        );
        expect(color).toBe('rgb(34, 197, 94)'); // #22c55e
    });
});

// ===========================================================================
// 15. Accessibility
// ===========================================================================

test.describe('Accessibility', () => {
    test('overlay has dialog role', async ({ page }) => {
        await expect(page.locator('#terminal-overlay')).toHaveAttribute('role', 'dialog');
    });

    test('overlay has aria-modal', async ({ page }) => {
        await expect(page.locator('#terminal-overlay')).toHaveAttribute('aria-modal', 'true');
    });

    test('output has log role', async ({ page }) => {
        await expect(page.locator('#terminal-output')).toHaveAttribute('role', 'log');
    });

    test('input has label', async ({ page }) => {
        await expect(page.locator('#terminal-input')).toHaveAttribute('aria-label', 'Terminal command input');
    });

    test('trigger button has aria-label', async ({ page }) => {
        await expect(page.locator('#terminal-trigger')).toHaveAttribute('aria-label', 'Open terminal');
    });

    test('traffic light buttons have aria-labels', async ({ page }) => {
        await expect(page.locator('#terminal-btn-close')).toHaveAttribute('aria-label', 'Close terminal');
        await expect(page.locator('#terminal-btn-minimize')).toHaveAttribute('aria-label', 'Minimize terminal');
        await expect(page.locator('#terminal-btn-maximize')).toHaveAttribute('aria-label', 'Maximize terminal');
    });
});
