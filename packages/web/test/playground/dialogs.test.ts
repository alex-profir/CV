// alert, prompt and confirm (spec US2): logged, never shown as dialogs, and
// the code goes on.
import { describe, expect, test, vi } from 'vitest';
import { fill, siteText } from '../../src/site-text.ts';
import { openPlaygroundPage, readLogs, run, setCode, waitChecked, waitForCode } from '../helpers/playground.ts';

vi.setConfig({ testTimeout: 180_000 });

const logs = siteText.playground.logs;

describe('008-typescript-playground-FR-043: alert, prompt and confirm are logged, and the code goes on', () => {
  test('alert logs an alert entry; prompt and confirm log their notes and return null and false', async () => {
    const page = await openPlaygroundPage();
    let dialogs = 0;
    page.on('dialog', () => (dialogs += 1));
    const code = ['alert("hi");', 'const answer = prompt("name?");', 'const sure = confirm("sure?");', 'console.log(answer, sure);'].join('\n');
    await setCode(page, code);
    await waitForCode(page, code);
    await waitChecked(page);
    await run(page);
    const rows = (await readLogs(page)).slice(1, -1);
    expect(rows).toEqual([
      { level: 'alert', text: 'hi', line: null },
      { level: 'note', text: fill(logs.prompt, { name: 'prompt' }), line: null },
      { level: 'note', text: fill(logs.confirm, { name: 'confirm' }), line: null },
      { level: 'log', text: 'null false', line: null },
    ]);
    expect(dialogs).toBe(0);
  });
});
