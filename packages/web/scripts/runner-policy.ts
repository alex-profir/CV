// The runner frame's policy (008 contracts/runner.md The frame), apart from
// the bundling so a fast test can check it without Vite: it allows the
// bootstrap by its hash and nothing else.
import crypto from 'node:crypto';

export type RunnerScripts = { bootstrap: string; runtime: string; policy: string };

export const scriptHash = (text: string): string => `sha256-${crypto.createHash('sha256').update(text, 'utf8').digest('base64')}`;

// The frame's Content Security Policy for a bootstrap script.
export const runnerPolicy = (bootstrap: string): string => `default-src 'none'; script-src '${scriptHash(bootstrap)}'; worker-src blob:; connect-src * data: blob:`;

// The policy allows exactly this bootstrap, and the bootstrap can sit in the
// frame's `<script>` element.
export function checkRunnerScripts(scripts: RunnerScripts): void {
  const sources = [...scripts.policy.matchAll(/'(sha256-[^']+)'/g)].map((match) => match[1]);
  if (sources.length !== 1 || sources[0] !== scriptHash(scripts.bootstrap)) throw new Error("the runner frame's policy doesn't allow its bootstrap script");
  for (const [name, text] of [['bootstrap', scripts.bootstrap], ['runtime', scripts.runtime]] as const) {
    if (/<\/script/i.test(text)) throw new Error(`the runner's ${name} holds </script>, which would end its frame's script`);
  }
}
