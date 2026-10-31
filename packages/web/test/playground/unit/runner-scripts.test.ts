// The runner frame's policy (contracts/runner.md The frame): it allows the
// bootstrap by its hash and nothing else, and the build fails if they differ.
import crypto from 'node:crypto';
import { describe, expect, test } from 'vitest';
import { checkRunnerScripts, runnerPolicy, scriptHash } from '../../../scripts/runner-policy.ts';

const BOOTSTRAP = 'onmessage = () => {};';

describe('008-typescript-playground-FR-039: the runner frame runs only its own bootstrap', () => {
  test("the policy is the contract's, with the bootstrap's SHA-256 as its only script source", () => {
    const hash = crypto.createHash('sha256').update(BOOTSTRAP).digest('base64');
    expect(scriptHash(BOOTSTRAP)).toBe(`sha256-${hash}`);
    expect(runnerPolicy(BOOTSTRAP)).toBe(`default-src 'none'; script-src 'sha256-${hash}'; worker-src blob:; connect-src * data: blob:`);
  });

  test('a policy and a bootstrap that differ fail the build', () => {
    expect(() => checkRunnerScripts({ bootstrap: BOOTSTRAP, runtime: '', policy: runnerPolicy(BOOTSTRAP) })).not.toThrow();
    expect(() => checkRunnerScripts({ bootstrap: `${BOOTSTRAP} `, runtime: '', policy: runnerPolicy(BOOTSTRAP) })).toThrow("the runner frame's policy doesn't allow its bootstrap script");
    expect(() => checkRunnerScripts({ bootstrap: BOOTSTRAP, runtime: '', policy: `${runnerPolicy(BOOTSTRAP)}; script-src 'sha256-other'` })).toThrow();
  });

  test("a script holding </script> fails, since it would end the frame's script", () => {
    const bootstrap = 'x = "</script>";';
    expect(() => checkRunnerScripts({ bootstrap, runtime: '', policy: runnerPolicy(bootstrap) })).toThrow('</script>');
  });
});
