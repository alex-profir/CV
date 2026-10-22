# Quickstart: Validating the CV Content Source

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

These scenarios prove the feature works end to end. The report format is in
[contracts/cli.md](./contracts/cli.md), the package's guarantees in
[contracts/content-package.md](./contracts/content-package.md), and the pull-request check in
[contracts/ci.md](./contracts/ci.md). Scenarios 1 to 9 run locally. Scenario 10 needs GitHub.

Scenarios that edit files say so. Undo each edit with `git checkout -- <file>` (or delete the
new file) before the next scenario.

## Prerequisites

- Node.js 26 (`nvm use` reads `.nvmrc`) and the npm bundled with it.
- For scenario 9: network access for `npx`.
- For scenario 10: the GitHub CLI (`gh`), signed in as the repository owner with admin rights.

```sh
npm ci
```

## 1. The repository passes (US1 scenario 1, SC-008)

```sh
npm run content-check; echo "exit $?"
npm run traceability
npm run typecheck && npm test
```

**Expected**: the content check prints no problem lines, then the summary, ending with:

```text
PASS: both documents are valid and no key facts are hardcoded.
exit 0
```

"Key facts searched for" reads `name, email`, with no phone (US3 scenario 4). The traceability
check counts `002-cv-content` among the approved specs and passes, so every requirement has a
test. The typecheck and tests pass.

## 2. Every problem type is found, and nothing else (SC-001)

Two seeded samples together hold at least one case of every problem type and edge case in the
spec. `seeded` holds every type that leaves all parts of the check running. `seeded-broken` holds
an unreadable site data document and a missing rules file, which stop the site data and reference
parts, so they can't share a run with the reference problems. Each sample's
`expected-report.txt` is the exact report it must produce.

```sh
for sample in seeded seeded-broken; do
  cd "tools/content-check/test/__fixtures__/$sample"
  node --permission --allow-fs-read="$PWD/../../../../.." ../../../src/main.js > "/tmp/content-$sample.txt"
  echo "$sample exit $?"
  diff "/tmp/content-$sample.txt" expected-report.txt && echo "$sample report matches"
  cd - > /dev/null
done
```

**Expected**: `exit 1` and `report matches` for both samples. Across the two summaries, each of
the 14 problem types has a non-zero count. `seeded-broken`'s summary lists
`Checks not run: site data rules, references`. `npm test` runs the same comparisons.

## 3. A field outside the standard is caught (US1 scenarios 2 and 3)

Edit `packages/content/resume.json`: add `"picture": "https://cdn.test/me.jpg"` under `basics`,
and `"featured": true` to the first work entry.

```sh
npm run --silent content-check | grep undefined-field
```

**Expected**: two lines, one for `basics.picture` and one for `work[0].featured`, each with its
line and column and `not a field defined by JSON Resume 1.3.1`. The exit code is 1.

## 4. References stay sound (US2, SC-004)

Real site data has no references yet, so this uses the sample in
`tools/content-check/test/__fixtures__/references/`, whose rules make `featuredProjects` a list of
project references and whose site data refers to `Guided Tours System`.

```sh
cd tools/content-check/test/__fixtures__/references
node --permission --allow-fs-read="$PWD/../../../../.." ../../../src/main.js | tail -1
sed -i.bak 's/"Guided Tours System"/"City Tours App"/' packages/content/resume.json
node --permission --allow-fs-read="$PWD/../../../../.." ../../../src/main.js | grep reference
mv packages/content/resume.json.bak packages/content/resume.json
cd -
```

**Expected**: the first run ends with `PASS: …`. After renaming the project in the CV only, the
check reports `dangling-reference featuredProjects[0]: no project with name "Guided Tours
System" exists in the CV document`.

## 5. Hardcoded key facts are caught where they matter (US3)

Create `packages/content/src/oops.ts` containing `export const contact = 'ALEXPROFIR512@GMAIL.COM';`
and the line `// by Alex Profir`. Put the same two lines in `docs/oops.md` and
`packages/content/test/oops.test.ts`.

```sh
npm run --silent content-check | grep hardcoded-fact
```

**Expected**: exactly two lines, both in `packages/content/src/oops.ts`: one `email` (despite the
capital letters) and one `name`, each with line and column. Nothing from `docs/` or the test
file. Delete the three files afterwards.

## 6. Code that reads the content knows its shape (US4)

Create `packages/content/src/oops.ts`:

```ts
import { resume } from '@cv/content';

export const ok = resume.basics?.name ?? 'Unnamed';
export const nick = resume.basics?.nickname;
export const shout = resume.basics?.name.toUpperCase();
const job = resume.work?.[0];
export const year = job?.endDate.slice(0, 4);
```

```sh
npm run typecheck
```

**Expected**: three errors in `packages/content/src/oops.ts`, none on line 3: `nickname` does not
exist on `ResumeBasics` (line 4), `name` is possibly undefined (line 5), and `job.endDate` is
possibly undefined (line 7). Each error names the field, the file, the line and the column
(FR-027). Delete the file afterwards.

Line 7 reads `endDate` from a named entry on purpose. TypeScript 7 names the field only when the
expression is a plain reference: `resume.work?.[0]?.endDate.slice(0, 4)` fails too, but is reported
as `Object is possibly 'undefined'`. An assignment such as
`const end: string = resume.work?.[0]?.endDate` fails as well, but its message only says
`string | undefined` isn't assignable to `string`, without naming the field.

## 7. Offline (US1 scenario 6, FR-035, SC-006)

Turn the network off (Wi-Fi off, cable out), then:

```sh
time npm run --silent content-check > /tmp/content-offline.txt; echo "exit $?"
```

**Expected**: `exit 0`, a report identical to scenario 1's, in well under 10 seconds. With the
network back on, `npm test` includes the positive control proving `fetch` is refused under the
check's permission flags.

## 8. Same report every run, locally and on the pull request (FR-031, FR-034, SC-005)

```sh
npm run --silent content-check > /tmp/a.txt; npm run --silent content-check > /tmp/b.txt
cmp /tmp/a.txt /tmp/b.txt && echo identical
```

**Expected**: `identical`. On the pull request, the `content` job's log shows the same report
after npm's banner.

## 9. Any JSON Resume tool can read the CV (SC-002)

```sh
cd packages/content
npx --yes resumed@7.1.0 validate resume.json
npx --yes -p resumed@7.1.0 -p jsonresume-theme-even@0.26.1 resumed render resume.json --theme jsonresume-theme-even --output /tmp/cv.html
open /tmp/cv.html
cd -
```

**Expected**: `validate` reports the document valid, and the rendered page shows every section
of the CV with `Timișoara` spelled correctly and the corrected text ("strength training").
The two independent tools for SC-002 are JSON Resume's own validator, which `npm test` runs in
`portability.test.ts`, and the separately published theme `jsonresume-theme-even`, which reads
the document itself to render it. `resumed validate` uses the same `@jsonresume/schema` 1.x
validator (it resolves to the same 1.3.1 schema the check uses), so it's a quick check here but
doesn't count as a second tool.

## 10. Merging is blocked when the check fails (FR-033)

Apply the updated ruleset once, during the pull request:

```sh
ID=$(gh api repos/alex-profir/CV/rulesets --jq '.[] | select(.name=="main") | .id')
gh api -X PUT "repos/alex-profir/CV/rulesets/$ID" --input .github/rulesets/main.json
gh api "repos/alex-profir/CV/rulesets/$ID" --jq '.rules[] | select(.type=="required_status_checks") | .parameters.required_status_checks[].context'
```

**Expected**: the contexts `traceability`, `test` and `content`.

Then push a throwaway branch with scenario 3's edit and open a draft pull request. **Expected**:
the `content` check fails, and the merge button is blocked with no bypass option. Close the pull
request and delete the branch.
