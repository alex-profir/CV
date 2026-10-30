// Each shell shows exactly the apps that declare it (FR-003).
import { describe, expect, test } from 'vitest';
import { appsFor } from '../src/index.ts';
import type { AppDeclaration, ShellName } from '../src/index.ts';
import { APPS as SITE_APPS } from '../../web/src/apps/index.ts';

const Stub = () => null;
const app = (id: string, shells: ShellName[]): AppDeclaration => ({ id, name: id, shells, needsNetwork: false, Icon: Stub, Content: Stub });

const FIXTURE = [app('both', ['desktop', 'mobile']), app('desk', ['desktop']), app('phone', ['mobile'])];

describe('005-os-shell-FR-003: both shells read one app list, each showing the apps that declare it', () => {
  test('appsFor returns exactly the apps declaring the shell, in list order', () => {
    expect(appsFor(FIXTURE, 'desktop').map((entry) => entry.id)).toEqual(['both', 'desk']);
    expect(appsFor(FIXTURE, 'mobile').map((entry) => entry.id)).toEqual(['both', 'phone']);
    expect(appsFor([], 'desktop')).toEqual([]);
  });

  test('the ids in the fixture and in the real list are unique', () => {
    for (const list of [FIXTURE, SITE_APPS]) {
      const ids = list.map((entry) => entry.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  test('the real list holds the CV app on both shells', () => {
    expect(appsFor(SITE_APPS, 'desktop')[0]!.id).toBe('cv');
    expect(appsFor(SITE_APPS, 'mobile')[0]!.id).toBe('cv');
  });
});

describe('006-terminal-FR-001: the Terminal is an app of both shells, after the CV', () => {
  test('appsFor on a [cv, terminal] list gives [cv, terminal] for both shells', () => {
    const list = [app('cv', ['desktop', 'mobile']), app('terminal', ['desktop', 'mobile'])];
    expect(appsFor(list, 'desktop').map((entry) => entry.id)).toEqual(['cv', 'terminal']);
    expect(appsFor(list, 'mobile').map((entry) => entry.id)).toEqual(['cv', 'terminal']);
  });

  test('the real list starts [cv, terminal] on both shells, the Terminal needing no network', () => {
    expect(appsFor(SITE_APPS, 'desktop').map((entry) => entry.id).slice(0, 2)).toEqual(['cv', 'terminal']);
    expect(appsFor(SITE_APPS, 'mobile').map((entry) => entry.id).slice(0, 2)).toEqual(['cv', 'terminal']);
    expect(SITE_APPS.find((entry) => entry.id === 'terminal')?.needsNetwork).toBe(false);
  });
});
