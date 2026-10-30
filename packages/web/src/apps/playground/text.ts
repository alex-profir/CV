// Words the Playground's components share: a message's text, sizes in MB,
// and whether the visitor is on a Mac (research R12's key labels).
import { counted, fill, siteText } from '../../site-text.ts';
import type { Message } from './types.ts';

const words = siteText.playground;

// Whether the visitor's system is a Mac, as the shell's labels read it.
export function onMac(): boolean {
  const platform = (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform ?? navigator.platform;
  return /mac/i.test(platform);
}

// Bytes as the design writes them: megabytes with one decimal.
export const megabytes = (bytes: number): string => (bytes / 1_000_000).toFixed(1);

type Forms = string | { none?: string; one: string; other: string };

function pick(forms: Forms, n: number | undefined): string {
  if (typeof forms === 'string') return forms;
  if (n === 0 && forms.none !== undefined) return forms.none;
  return counted(forms, n ?? 0);
}

// A message's sentence, with its values filled in (data-model.md Message).
export function messageText(message: Message): string {
  const forms = words.messages[message.text] as Forms;
  const values = message.values ?? {};
  const n = typeof values['n'] === 'number' ? values['n'] : undefined;
  return fill(pick(forms, n), values);
}
