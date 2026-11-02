// The program frame's policy (research R2): its one script by hash, `eval`
// for the runtime, and no request of any kind.
import { describe, expect, test } from 'vitest';
import { checkProgramScripts, programPolicy, runnerPolicy, scriptHash } from '../../../../scripts/runner-policy.ts';

const BOOTSTRAP = 'onmessage = () => {};';

describe('009-terminal-node-FR-023: a program reaches nothing, by the frame policy', () => {
  test('the policy is exactly the research R2 form, with the bootstrap as its one script', () => {
    expect(programPolicy(BOOTSTRAP)).toBe(`default-src 'none'; script-src '${scriptHash(BOOTSTRAP)}' 'unsafe-eval'; worker-src blob:; connect-src 'none'`);
  });

  test("008's policy is unchanged", () => {
    expect(runnerPolicy(BOOTSTRAP)).toBe(`default-src 'none'; script-src '${scriptHash(BOOTSTRAP)}'; worker-src blob:; connect-src * data: blob:`);
  });

  test('a policy that differs from its bootstrap, or a bootstrap with </script>, fails the build', () => {
    expect(() => checkProgramScripts({ bootstrap: BOOTSTRAP, runtime: '</script>', policy: programPolicy(BOOTSTRAP) })).not.toThrow();
    expect(() => checkProgramScripts({ bootstrap: `${BOOTSTRAP} `, runtime: '', policy: programPolicy(BOOTSTRAP) })).toThrow("doesn't allow its bootstrap");
    const closing = 'x = "</script>";';
    expect(() => checkProgramScripts({ bootstrap: closing, runtime: '', policy: programPolicy(closing) })).toThrow('</script>');
  });
});
