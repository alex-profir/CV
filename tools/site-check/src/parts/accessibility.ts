// The accessibility part's page measurement (research R12): axe-core,
// injected from the local package file, run on the whole document with the
// WCAG 2.2 A and AA tags. One problem per violating node.
import { createRequire } from 'node:module';
import type { Page } from 'playwright';
import type { Problem } from '../report.ts';

const require = createRequire(import.meta.url);

export const AXE_FILE = require.resolve('axe-core/axe.min.js');

export const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

type AxeNode = { target: unknown[]; any: { message: string }[]; all: { message: string }[]; none: { message: string }[] };

type AxeViolation = { id: string; help: string; nodes: AxeNode[] };

// The node's selector, as axe gives it (frames and shadow roots joined).
function selector(target: unknown[]): string {
  return target.map((part) => (Array.isArray(part) ? part.join(' ') : String(part))).join(' ');
}

// axe's summary of what failed: the one failing check's message when there
// is exactly one, such as a contrast ratio, otherwise the rule's help text.
function summary(violation: AxeViolation, node: AxeNode): string {
  const messages = [...node.any, ...node.all, ...node.none].map((check) => check.message);
  return messages.length === 1 ? messages[0]! : violation.help;
}

export async function axeProblems(page: Page, pageLabel: string, variant: string): Promise<Problem[]> {
  const loaded = await page.evaluate(() => typeof (window as unknown as { axe?: unknown }).axe !== 'undefined');
  if (!loaded) await page.addScriptTag({ path: AXE_FILE });
  const violations = await page.evaluate(
    async (tags) => {
      const axe = (window as unknown as { axe: { run: (context: Document, options: object) => Promise<{ violations: AxeViolation[] }> } }).axe;
      const result = await axe.run(document, { runOnly: { type: 'tag', values: tags }, resultTypes: ['violations'] });
      return result.violations.map((violation) => ({
        id: violation.id,
        help: violation.help,
        nodes: violation.nodes.map((node) => ({
          target: node.target,
          any: node.any.map((check) => ({ message: check.message })),
          all: node.all.map((check) => ({ message: check.message })),
          none: node.none.map((check) => ({ message: check.message })),
        })),
      }));
    },
    AXE_TAGS,
  );
  return violations.flatMap((violation) =>
    violation.nodes.map((node) => ({
      part: 'accessibility' as const,
      page: pageLabel,
      variant,
      type: `axe:${violation.id}`,
      subject: selector(node.target),
      detail: summary(violation, node),
    })),
  );
}
