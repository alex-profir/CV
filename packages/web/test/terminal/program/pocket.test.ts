// The Stop key (009 FR-039), in the pocket terminal at 375 and 320 px.
import { describe, expect, test, vi } from 'vitest';
import { tokenValue } from '@cv/tokens';
import { siteText } from '../../../src/site-text.ts';
import { framesHeld, lastOutput, openProgramTerminal, startLine, statusOf, writeFile } from '../../helpers/program.ts';
import { linesRun } from '../../helpers/terminal.ts';

vi.setConfig({ testTimeout: 120_000 });

const KEYS = '.pocket-keys button.pocket-key';
const STOP = `${KEYS}[aria-label="${siteText.terminal.program.stop}"]`;
const until = (work: () => Promise<boolean>) => expect.poll(work, { timeout: 10_000, interval: 25 }).toBe(true);

const names = (page: Parameters<typeof framesHeld>[0]) => page.locator(KEYS).evaluateAll((keys) => keys.map((key) => key.getAttribute('aria-label')));

// WCAG's contrast of two `#rrggbb` colors.
function contrast(a: string, b: string): number {
  const luminance = (hex: string) => {
    const [r, g, b2] = [1, 3, 5].map((at) => Number.parseInt(hex.slice(at, at + 2), 16) / 255).map((value) => (value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r! + 0.7152 * g! + 0.0722 * b2!;
  };
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light! + 0.05) / (dark! + 0.05);
}

describe.each([[375, 812], [320, 568]])('009-terminal-node-FR-039, 006-terminal-FR-024 and 006-terminal-FR-078: at %d px', (width, height) => {
  const open = () => openProgramTerminal('mobile', { width, height });

  test('Stop takes the place of `clear`, the grid does not move, and with nothing running the key is `clear`', async () => {
    const page = await open();
    const idle = await names(page);
    expect(idle).toContain('clear');
    const clearAt = idle.indexOf('clear');
    const boxes = () => page.locator(KEYS).evaluateAll((keys) => keys.map((key) => { const { x, y, width: w, height: h } = key.getBoundingClientRect(); return [x, y, w, h]; }));
    const before = await boxes();
    await startLine(page, 'node -e "while (true) {}"');
    await until(async () => (await page.locator(STOP).count()) === 1);
    const during = await names(page);
    expect(during[clearAt]).toBe(siteText.terminal.program.stop);
    expect(during.includes('clear')).toBe(false);
    expect(await boxes()).toEqual(before);
    expect(await page.locator(STOP).textContent()).toBe(siteText.terminal.program.stopKey);
    await page.locator(STOP).tap();
    await linesRun(page);
    expect(await names(page)).toEqual(idle);
  });

  test('it is at least 44 by 44 CSS px, in the toolbar, with dark text on the error color at 4.5:1', async () => {
    const page = await open();
    await startLine(page, 'node -e "while (true) {}"');
    await until(async () => (await page.locator(STOP).count()) === 1);
    const size = (await page.locator(STOP).boundingBox())!;
    expect(size.width).toBeGreaterThanOrEqual(44);
    expect(size.height).toBeGreaterThanOrEqual(44);
    expect(await page.locator(STOP).evaluate((key) => key.closest('[role="toolbar"]') !== null)).toBe(true);
    const colors = await page.locator(STOP).evaluate((key) => {
      const style = getComputedStyle(key);
      return [style.backgroundColor, style.color];
    });
    const hex = (color: string) => `#${color.match(/\d+/g)!.slice(0, 3).map((part) => Number(part).toString(16).padStart(2, '0')).join('')}`;
    expect(hex(colors[0]!)).toBe(tokenValue('color.terminal-error'));
    expect(contrast(hex(colors[0]!), hex(colors[1]!))).toBeGreaterThanOrEqual(4.5);
  });

  test('it does what Ctrl+C does: ends the program, keeps its output, status 130', async () => {
    const page = await open();
    await writeFile(page, 'then.js', "console.log('before');\nwhile (true) {}\n");
    await startLine(page, 'node then.js');
    await until(async () => (await lastOutput(page)).includes('before'));
    const pressed = Date.now();
    await page.locator(STOP).tap();
    await linesRun(page);
    expect(Date.now() - pressed).toBeLessThan(1000);
    expect(await lastOutput(page)).toContain('before');
    expect(await framesHeld(page)).toBe(0);
    expect(await statusOf(page)).toBe('130');
  });

  test('past a handler, the second press ends it', async () => {
    const page = await open();
    await writeFile(page, 'h.js', "process.on('SIGINT', () => console.log('no'));\nconsole.log('ready');\nsetInterval(() => {}, 1000);\n");
    await startLine(page, 'node h.js');
    await until(async () => (await lastOutput(page)).includes('ready'));
    await page.locator(STOP).tap();
    await until(async () => (await lastOutput(page)).includes('no'));
    await page.locator(STOP).tap();
    await linesRun(page);
    expect(await statusOf(page)).toBe('130');
  });

  test('in the arrow-key order, and with focus on it when the program ends it becomes `clear` in place', async () => {
    const page = await open();
    await startLine(page, `node -e "setTimeout(() => {}, 1500)"`);
    await until(async () => (await page.locator(STOP).count()) === 1);
    const clearAt = (await names(page)).indexOf(siteText.terminal.program.stop);
    await page.locator(KEYS).nth(clearAt - 1).focus();
    await page.keyboard.press('ArrowRight');
    expect(await page.evaluate(() => document.activeElement?.getAttribute('aria-label'))).toBe(siteText.terminal.program.stop);
    await linesRun(page);
    expect(await page.evaluate(() => document.activeElement?.getAttribute('aria-label'))).toBe('clear');
    expect(await page.locator(KEYS).nth(clearAt).evaluate((key) => key === document.activeElement)).toBe(true);
  });
});
