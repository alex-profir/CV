// A block's text as a site command prints it and a protected file holds it
// (research R29, data-model.md Site command run): the visible text in
// reading order, list items marked `- `, links, times and controls by their
// text, with no markup.
import { describe, expect, test } from 'vitest';
import { blockText } from '../../../src/apps/terminal/engine/block.ts';
import type { Block, Node } from '../../../src/apps/terminal/engine/block.ts';
import { siteText } from '../../../src/site-text.ts';
import { blockOf, contextFor, nodes } from './context.ts';

const PRINTING = ['about', 'work', 'projects', 'education', 'skills', 'languages', 'interests', 'contact', 'help', 'specs', 'site'] as const;

// The text a node shows, its children joined.
const shown = (node: Node): string => {
  switch (node.kind) {
    case 'text':
    case 'time':
      return node.text;
    case 'command':
      return node.label ?? node.line;
    case 'line':
    case 'heading':
    case 'link':
      return node.children.map(shown).join('');
    default:
      return '';
  }
};

describe('006-terminal-FR-047 and 006-terminal-FR-057: blockText gives a block’s visible lines, as a command prints them', () => {
  for (const name of ['every-field', 'empty-sections'] as const) {
    test(`on the ${name} fixture, every printing command’s block`, async () => {
      const context = contextFor(name);
      for (const command of PRINTING) {
        const block: Block = await blockOf(command, context);
        const lines = blockText(block).split('\n');
        // The same text twice for the same block.
        expect(blockText(block), command).toBe(lines.join('\n'));
        expect(blockText(await blockOf(command, context)), command).toBe(blockText(block));
        // No empty line, no markup, no stray value.
        for (const row of lines) {
          expect(row.trim(), command).not.toBe('');
          expect(row, command).not.toMatch(/<\/[a-z]+>|<[a-z]+ [a-z-]+=|undefined|\[object/);
        }
        // Every heading, link and control shows its text on a line.
        for (const node of nodes(block)) {
          if (node.kind === 'heading' || node.kind === 'link' || node.kind === 'command' || node.kind === 'time') {
            const value = shown(node);
            expect(lines.some((row) => row.includes(value)), `${command}: ${value}`).toBe(true);
          }
          if (node.kind === 'list' && node.req !== 'history') {
            for (const item of node.items) expect(lines, command).toContain(`- ${blockText(item).split('\n')[0]}`);
          }
        }
      }
    });
  }

  test('on the every-field fixture, about, work and skills read as a visitor sees them', async () => {
    const context = contextFor('every-field');
    expect(blockText(await blockOf('about', context)).split('\n')).toEqual(['Field Fixture Person', 'Fixture Label Role', 'Fixture City, Fixture Region, Germany', 'Fixture basics summary text.']);
    expect(blockText(await blockOf('work', context)).split('\n')).toEqual([
      'Fixture Work Position · Fixture Work Company',
      'Mar 2019 – Nov 2021',
      'Fixture Work Location',
      'Fixture work summary text.',
      'Fixture work description text.',
      '- Fixture work highlight one.',
      '- Fixture work highlight two.',
    ]);
    expect(blockText(await blockOf('skills', context)).split('\n')).toEqual(['- Fixture Skill Name · Fixture Level', 'FixtureSkillKeywordA, FixtureSkillKeywordB']);
    // Links by their text: the address where /cv shows it.
    expect(blockText(await blockOf('contact', context))).toContain('fixture.person@example.org');
  });

  test('on the empty-sections fixture, an empty section is its one line', async () => {
    const context = contextFor('empty-sections');
    expect(blockText(await blockOf('interests', context))).toBe(siteText.terminal.replies.emptySection.replace('{section}', siteText.sections.interests.toLowerCase()));
  });
});
