// The CV as typed data (spec US3): `cv` needs no import, has the type 002's
// shape gives it, holds the built CV document, and the CV examples' logs
// follow it. Expected values are computed here from `resume.json`.
import { describe, expect, test, vi } from 'vitest';
import type { Page } from 'playwright';
import { resume } from '@cv/content';
import { examples } from '../../src/apps/playground/examples/index.ts';
import { chooseExample, EDITOR, onMac, openPlaygroundPage, readErrors, readLogs, run, setCode, waitChecked, waitForCode } from '../helpers/playground.ts';

vi.setConfig({ testTimeout: 300_000 });

const logged = async (page: Page) => (await readLogs(page)).filter((row) => row.level === 'log').map((row) => row.text);

async function runCode(page: Page, code: string): Promise<string[]> {
  await setCode(page, code);
  await waitForCode(page, code.split('\n')[0]!);
  await waitChecked(page);
  await run(page);
  return logged(page);
}

async function runExample(page: Page, id: string): Promise<string[]> {
  const example = examples(await onMac(page)).find((entry) => entry.id === id)!;
  await chooseExample(page, example.title);
  await waitForCode(page, example.code.split('\n')[0]!);
  await waitChecked(page);
  await run(page);
  return logged(page);
}

// The CV document, as the code's `cv` logs it: in chunks small enough for a
// log entry, each a JSON array of one string.
const DUMP = 'const text = JSON.stringify(cv);\nfor (let at = 0; at < text.length; at += 3000) console.log([text.slice(at, at + 3000)]);';

describe('008-typescript-playground-FR-029: the CV is the code\'s typed `cv`, the built CV document', () => {
  test('cv needs no import, has the shape\'s type, and an unknown field is an error', async () => {
    const page = await openPlaygroundPage();
    const code = 'const projects = cv.projects;\nconst nope = cv.nope;';
    await setCode(page, code);
    await waitForCode(page, code.split('\n')[0]!);
    await waitChecked(page);
    const errors = await readErrors(page);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/^\D*2:\d+\s.*'nope'.*\sTS2339$/s);
    const name = page.locator(`${EDITOR} .view-line`).filter({ hasText: /^const\s+projects/ }).locator('span span').filter({ hasText: /^projects$/ }).last();
    const at = (await name.boundingBox())!;
    await page.mouse.move(at.x + 4, at.y + at.height / 2);
    await expect.poll(() => page.locator(`${EDITOR} .monaco-hover:not(.hidden)`).first().textContent(), { timeout: 10_000 }).toContain('ResumeProject[] | undefined');
  });

  test('a run logging JSON.stringify(cv) gives resume.json, and a run that changes cv leaves the next run\'s alone', async () => {
    const page = await openPlaygroundPage();
    const chunks = await runCode(page, DUMP);
    expect(JSON.parse(chunks.map((chunk) => JSON.parse(chunk)[0]).join(''))).toEqual(resume);
    expect(await runCode(page, 'console.log(String(cv.basics?.name ?? "").length > 0);\n(cv as { basics?: unknown }).basics = undefined;\nconsole.log(cv.basics === undefined);')).toEqual(['true', 'true']);
    expect(await runCode(page, 'console.log(cv.basics === undefined);')).toEqual(['false']);
  });

  test("the CV examples' logs follow the CV document", async () => {
    const page = await openPlaygroundPage();
    const projects = (resume.projects ?? []).flatMap((project) => (project.startDate === undefined ? [] : [{ name: project.name ?? '', start: project.startDate }]));
    projects.sort((a, b) => b.start.localeCompare(a.start));
    expect(await runExample(page, 'projects-newest-first')).toEqual(projects.map(({ name, start }) => `${start.slice(0, 4)} ${name}`.trim()));

    const groups = resume.skills ?? [];
    const widest = Math.max(0, ...groups.map((group) => (group.name ?? '').length));
    expect(await runExample(page, 'skills-at-a-glance')).toEqual(groups.map((group) => `${(group.name ?? '').padEnd(widest)}  ${group.keywords?.length ?? 0}`.trim()));

    expect(JSON.stringify(resume).toLowerCase()).not.toContain('cobol');
    const word = (groups[0]?.keywords?.[0] ?? '').toLowerCase();
    const found = groups.find((group) => group.keywords?.some((keyword) => keyword.toLowerCase() === word));
    expect(await runExample(page, 'find-a-skill')).toEqual([found === undefined ? 'Not found' : `In ${found.name ?? 'a group'}`, 'Not found']);
  });
});
