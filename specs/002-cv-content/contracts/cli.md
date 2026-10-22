# Contract: Content Check Command and Report

**Feature**: [spec.md](../spec.md) | **Data model**: [data-model.md](../data-model.md)

The owner runs this command locally, and the pull-request workflow runs the same command
([ci.md](./ci.md)). The contract is the command, its exit codes and the exact text of the report.
It follows the conventions of 001's
[cli.md](../../001-requirement-traceability/contracts/cli.md) wherever they apply.

## Command

```sh
npm run content-check
```

- Run from the repository root. The check reads files under the current directory and nothing
  else.
- Takes no arguments. Any argument is a usage error (exit code 2).
- Makes no network requests (FR-035) and writes nothing to disk.

Behind the script:

```sh
node --permission --allow-fs-read=. tools/content-check/src/main.js
```

No network, write or addons grant. Node itself refuses any network call (research.md, R12).
Tests run the same file with the same flags, with a sample project as the working directory and a
read grant that also covers the repository, so Node can load the check.

The fixed paths, relative to the root:

| What | Path |
|------|------|
| CV document | `packages/content/resume.json` |
| Site data document | `packages/content/site.json` |
| Site data rules | `packages/content/schemas/site.schema.json` |
| Official schema (part of the tool) | `node_modules/@jsonresume/schema/schema.json`, version 1.3.1 |

## Exit codes

| Code | Meaning |
|------|---------|
| `0` | Pass: no problems |
| `1` | Fail: at least one problem was reported (FR-032) |
| `2` | The check couldn't run: an argument was given, Node is older than 26, `@jsonresume/schema` 1.3.1 isn't installed (run `npm ci`), or an internal error. The message goes to stderr |

## Output streams

- The report goes to **stdout**, and only the report.
- **stderr** carries usage errors, internal errors and runtime warnings, none of it part of the
  report. The messages, each followed by `\n`:
  - an argument was given: `usage: npm run content-check (takes no arguments)`;
  - Node is too old: `content check needs Node 26 or later (see .nvmrc) to block network access, but this is Node <version>`;
  - the check can't load: `content check could not start: <message>`;
  - the check fails while running, including a missing or wrong `@jsonresume/schema`:
    `content check could not run: <message>`. For the schema, the message is
    `@jsonresume/schema 1.3.1 is not installed (run npm ci)`.
- `npm run content-check` prints npm's banner first. Tests compare the report from
  `npm run --silent content-check`.

## Report format

Plain text, UTF-8, `\n` line endings. One line per problem, sorted as in
[data-model.md](../data-model.md#problem), then one empty line, then the summary. With no
problems, the report starts at the summary. It ends with a single `\n` after the result line.

### Problem line

```text
<file>:<line>:<column> <type> <subject>: <detail>
```

- `<file>:<line>:<column>` opens the location in most terminals and editors (SC-007).
- `<type>` is one of the 14 problem types.
- `<subject>` is a field path (`basics.picture`), a file path, or a key fact kind (`name`,
  `email`, `phone`).
- `<detail>` is one short sentence. Values in it are written as JSON strings, so leading and
  trailing whitespace is visible.

Problem lines by type (paths and values are examples):

```text
packages/content/resume.json:4:3 unreadable-document packages/content/resume.json: invalid JSON: comma expected
packages/content/site.json:1:1 missing-document packages/content/site.json: file not found
packages/content/schemas/site.schema.json:9:27 unreadable-document packages/content/schemas/site.schema.json: cannot be used as rules: unknown reference kind "projet"
packages/content/resume.json:12:5 schema-violation work: must be an array, not an object
packages/content/site.json:1:1 schema-violation (document): required field "featured" is missing
packages/content/resume.json:6:5 undefined-field basics.picture: not a field defined by JSON Resume 1.3.1
packages/content/site.json:3:3 undefined-field theme: not a field defined by the site data rules
packages/content/resume.json:40:20 invalid-date work[0].startDate: "2018/07" is not a date of the form YYYY, YYYY-MM or YYYY-MM-DD
packages/content/resume.json:41:18 invalid-date work[0].endDate: "2021-02-30" is not a real date
packages/content/resume.json:58:18 end-before-start education[0].endDate: "2017" is before the start date "2018-09-24"
packages/content/resume.json:15:22 invalid-format basics.location.countryCode: "Romania" is not a two-letter ISO 3166-1 country code
packages/content/resume.json:7:14 invalid-format basics.email: "alex@" is not a well-formed email address
packages/content/resume.json:20:16 invalid-format basics.profiles[0].url: "github.com/x" is not an absolute web address (http or https)
packages/content/resume.json:90:5 duplicate-entry projects[2]: the same entry is listed 2 times: projects[2], projects[6]
packages/content/resume.json:120:5 out-of-order projects[1]: should come before projects[0] (newest first)
packages/content/resume.json:55:22 untrimmed-text education[0].institution: "Politehnica University of Timișoara " has leading or trailing whitespace
packages/content/resume.json:8:16 placeholder basics.url: "https://example.com/" is on a reserved example domain
packages/content/resume.json:200:18 placeholder meta.lastModified: "2017-12-24T15:53:00" is copied from the JSON Resume sample CV
packages/content/site.json:3:21 dangling-reference featuredProjects[0]: no project with name "Guided Tours System" exists in the CV document
packages/content/site.json:4:15 dangling-reference contact.profile: no profile with network "GitHub" exists in the CV document
packages/content/site.json:5:12 dangling-reference highlight: no work entry with name "SC MoreDevs SRL", position "Developer" and startDate "2018-07-29" exists in the CV document
packages/content/site.json:3:21 ambiguous-reference featuredProjects[0]: "Retail Dashboard" matches 2 projects in the CV document: projects[3], projects[7]
packages/web/src/footer.tsx:12:7 hardcoded-fact email: the owner's email is written out; read it from @cv/content instead
packages/content/site.json:6:14 hardcoded-fact email: the owner's email is written out in site data; refer to the CV document instead
packages/web/src:1:1 unreadable-document packages/web/src: cannot be read: EACCES
```

### Details

Every detail the check writes, by type. `<v>` is a value written with `JSON.stringify`. `<path>`
is a field path. Lists of paths are joined by `, `. Lists of fields are joined by `, ` with ` and `
before the last.

| Type | Situation | Detail |
|------|-----------|--------|
| `unreadable-document` | read error on a document, file or directory | `cannot be read: <error code>` |
| | invalid UTF-8, at the first invalid byte | `not valid UTF-8` |
| | byte order mark, at `1:1` | `starts with a byte order mark` |
| | syntax error, at the first error | `invalid JSON: <reason>`, the `jsonc-parser` error code in lower-case words (`CommaExpected` → `comma expected`) |
| | `JSON.parse` rejects what `jsonc-parser` accepted, at `1:1` | `invalid JSON: <JSON.parse message>` |
| | rules: unknown reference kind | `cannot be used as rules: unknown reference kind <v>` |
| | rules: a reference schema of the wrong form | `cannot be used as rules: a <kind> reference must be a string`, or `… must be an object with <fields>` |
| | rules: a `format` the check has no rule for | `cannot be used as rules: unsupported format <v>` |
| | rules: the validator rejects the schema | `cannot be used as rules: <validator message>` |
| `missing-document` | file doesn't exist, at `1:1` | `file not found` |
| `schema-violation` | `type` | `must be <a/an> <expected>, not <a/an> <actual>`. Types are `array`, `object`, `string`, `number`, `integer`, `boolean`, and `null` without an article |
| | `required`, subject the object's path | `required field <v> is missing` |
| | `enum` | `must be one of <values as JSON>` |
| | `const` | `must be <value as JSON>` |
| | `pattern`, not on a date field | `does not match the pattern <v>` |
| | `minLength`, `maxLength`, `minimum`, `maximum`, `minItems`, `maxItems`, `uniqueItems` | `breaks the rule <keyword>: <argument as JSON>` |
| | any other keyword | `breaks the rule <keyword>` |
| `undefined-field` | in the CV document | `not a field defined by JSON Resume 1.3.1` |
| | in site data | `not a field defined by the site data rules` |
| `invalid-date` | wrong form | `<v> is not a date of the form YYYY, YYYY-MM or YYYY-MM-DD` |
| | right form, no such date | `<v> is not a real date` |
| `end-before-start` | | `<v> is before the start date <v>` |
| `invalid-format` | country code | `<v> is not a two-letter ISO 3166-1 country code` |
| | email | `<v> is not a well-formed email address` |
| | URL | `<v> is not an absolute web address (http or https)` |
| `duplicate-entry` | at the first entry | `the same entry is listed <n> times: <paths>` |
| `out-of-order` | | `should come before <path> (newest first)` |
| `untrimmed-text` | | `<v> has leading or trailing whitespace` |
| `placeholder` | example domain | `<v> is on a reserved example domain` |
| | sample `meta` value | `<v> is copied from the JSON Resume sample CV` |
| `dangling-reference` | no matching entry | `no <noun> with <field> <v>[, <field> <v> … and <field> <v>] exists in the CV document` |
| | value of the wrong form for its kind | `a <kind> reference needs <fields>` |
| `ambiguous-reference` | | `<value> matches <n> <plural noun> in the CV document: <paths>`. `<value>` is `<v>` for one-field kinds and the `<field> <v>` list for others |
| `hardcoded-fact` | site source | `the owner's <kind> is written out; read it from @cv/content instead` |
| | site data | `the owner's <kind> is written out in site data; refer to the CV document instead` |

The nouns are the entry kinds' names in [data-model.md](../data-model.md#entry-and-entry-kinds),
with `work entry`, `volunteer entry` and `education entry` (plural `… entries`) for the three
kinds whose names aren't nouns of their own. A kind name gets `an` before a vowel
(`an education reference`).

### Summary

Always printed (FR-030). Every problem type is listed, including zeros, in the data model's
order.

Passing run:

```text
Summary
  CV document:                  packages/content/resume.json (checked)
  Site data document:           packages/content/site.json (checked)
  Site data rules:              packages/content/schemas/site.schema.json (checked)
  Key facts searched for:       name, email
  Files searched for key facts: 9
  Files skipped (not text):     0
  Checks not run:               none
  Problems:                     0
    unreadable-document         0
    missing-document            0
    schema-violation            0
    undefined-field             0
    invalid-date                0
    end-before-start            0
    invalid-format              0
    duplicate-entry             0
    out-of-order                0
    untrimmed-text              0
    placeholder                 0
    dangling-reference          0
    ambiguous-reference         0
    hardcoded-fact              0

PASS: both documents are valid and no key facts are hardcoded.
```

Failing run where the CV document can't be read:

```text
Summary
  CV document:                  packages/content/resume.json (unreadable)
  Site data document:           packages/content/site.json (checked)
  Site data rules:              packages/content/schemas/site.schema.json (checked)
  Key facts searched for:       none (the CV document could not be read)
  Files searched for key facts: 0
  Files skipped (not text):     0
  Checks not run:               CV rules, references, key facts search
  Problems:                     1
    unreadable-document         1
    ...

FAIL: 1 problem found. Some checks could not run.
```

- A document's state is `checked`, `missing` or `unreadable`.
- "Key facts searched for" lists the kinds, never the values. With a readable CV that publishes
  none of them, it reads `none`, and files are still counted.
- "Checks not run" names the parts from the data model (`CV rules`, `site data rules`,
  `references`, `key facts search`) in that order, or `none`.
- The result line is `FAIL: N problems found.` (`1 problem`), with ` Some checks could not run.`
  appended when any part didn't run.

## Stability guarantees

- The same files give byte-identical stdout and the same exit code, on any machine, with or
  without a network (FR-031, FR-034, FR-035, SC-005).
- The output never contains absolute paths, timestamps, durations, colors or anything that
  depends on the machine, locale or terminal.
- The problem-line grammar and type names are stable.
