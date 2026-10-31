// Target sizes (FR-034): every control the Terminal shows, in every FR-035
// state of both shells, is at least 24 × 24 px; pocket keys at least 44 × 44.
import { describe, expect, test, vi } from 'vitest';
import type { Page } from 'playwright';
import { TERMINAL_STATES, terminalInState } from '../helpers/terminal.ts';

vi.setConfig({ testTimeout: 300_000 });

type Target = { what: string; width: number; height: number };

// Every shown control in the Terminal and the pocket around it.
const targets = (page: Page, selector: string) =>
  page.locator(selector).evaluateAll((list) =>
    list
      .filter((element) => element.getClientRects().length > 0 && element.closest('[hidden], [inert]') === null)
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return { what: `${element.tagName.toLowerCase()}.${[...element.classList].join('.')} ${element.getAttribute('aria-label') ?? (element.textContent ?? '').trim().slice(0, 30)}`, width: rect.width, height: rect.height };
      }),
  );

const CONTROLS = '#os :is(.terminal, .pocket) :is(button, a[href], input, [tabindex="0"])';

function expectAtLeast(list: Target[], size: number, label: string): void {
  const small = list.filter((target) => target.width < size - 0.5 || target.height < size - 0.5).map((target) => `${target.what}: ${Math.round(target.width)} × ${Math.round(target.height)}`);
  expect(small, label).toEqual([]);
}

describe('006-terminal-FR-034: every control is big enough to hit', () => {
  for (const shell of ['desktop', 'mobile'] as const) {
    for (const state of TERMINAL_STATES[shell]) {
      test(`${shell}, ${state.name}: every control is at least 24 × 24, fold lines too, and pocket keys at least 44 × 44`, async () => {
        const page = await terminalInState(shell, state);
        const all = await targets(page, CONTROLS);
        if (state.name !== 'minimized') expect(all.length, state.name).toBeGreaterThan(0);
        expectAtLeast(all, 24, `${shell}, ${state.name}`);
        expectAtLeast(await targets(page, '#os .terminal button.vim-fold'), 24, `${shell}, ${state.name}: fold lines`);
        if (shell === 'mobile') expectAtLeast(await targets(page, '#os :is(.pocket-keys, .pocket-strip) button.pocket-key'), 44, `${shell}, ${state.name}: keys`);
      });
    }
  }
});
